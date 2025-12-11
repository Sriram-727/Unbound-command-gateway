const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// --- TELEGRAM CONFIG ---
const TELEGRAM_BOT_TOKEN = '7811387955:AAFpbsllvh-OYPzRk1o76wTIocpEgP9AinI'; 
const ADMIN_CHAT_ID = '7240006293'; 

async function sendTelegramAlert(msg) {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: msg, parse_mode: 'Markdown' })
        });
    } catch (e) { console.error("Telegram Error:", e.message); }
}

const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing API Key' });
    const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
    if (!user) return res.status(403).json({ error: 'Invalid API Key' });
    req.user = user;
    next();
};

app.get('/me', authenticate, (req, res) => res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));

// --- SMART COMMAND PROCESSOR ---
app.post('/commands', authenticate, (req, res) => {
    const { command_text } = req.body;
    const user = req.user;

    if (user.credits <= 0) return res.status(402).json({ status: 'rejected', reason: 'Insufficient credits', new_balance: user.credits });

    // 1. Match Rule
    const rules = db.prepare('SELECT * FROM rules').all();
    let matchedRule = null;
    for (const rule of rules) {
        try { if (new RegExp(rule.pattern).test(command_text)) { matchedRule = rule; break; } } catch (e) {}
    }

    let action = matchedRule ? matchedRule.action : 'AUTO_REJECT';
    let threshold = matchedRule ? matchedRule.base_threshold : 1;

    // 2. Time-Based Logic
    if (matchedRule) {
        const currentHour = new Date().getHours();
        if (currentHour < matchedRule.active_start || currentHour >= matchedRule.active_end) {
            if (action === 'AUTO_ACCEPT') action = 'REQUIRE_APPROVAL';
        }
    }

    // 3. User-Tier Logic
    if (action === 'REQUIRE_APPROVAL') {
        if (user.seniority === 'junior') threshold += 1;
        if (user.seniority === 'lead') threshold = Math.max(1, threshold - 1);
    }

    const executeTx = db.transaction(() => {
        if (action === 'AUTO_ACCEPT') {
            db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(user.id);
            db.prepare('INSERT INTO logs (user_id, command_text, status, action_taken) VALUES (?, ?, ?, ?)').run(user.id, command_text, 'EXECUTED', action);
            return { status: 'executed', new_balance: user.credits - 1 };
        } 
        else if (action === 'REQUIRE_APPROVAL') {
            db.prepare('INSERT INTO logs (user_id, command_text, status, action_taken, required_approvals, current_approvals) VALUES (?, ?, ?, ?, ?, 0)').run(user.id, command_text, 'PENDING', action, threshold);
            sendTelegramAlert(`⚠️ *Approval Req* (${user.seniority})\nCmd: \`${command_text}\`\nNeed: ${threshold} Approvals.`);
            return { status: 'pending', reason: `Need ${threshold} approvals`, new_balance: user.credits };
        }
        else {
            db.prepare('INSERT INTO logs (user_id, command_text, status, action_taken) VALUES (?, ?, ?, ?)').run(user.id, command_text, 'REJECTED', action);
            return { status: 'rejected', reason: 'Blocked by Rule', new_balance: user.credits };
        }
    });

    try { res.json(executeTx()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- VOTING APPROVALS ---
app.post('/approvals', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { logId, decision } = req.body; 

    const tx = db.transaction(() => {
        const log = db.prepare("SELECT * FROM logs WHERE id = ? AND status = 'PENDING'").get(logId);
        if (!log) throw new Error('Request invalid');

        if (decision === 'DENY') {
            db.prepare("UPDATE logs SET status = 'REJECTED' WHERE id = ?").run(logId);
            return { result: 'rejected' };
        }

        const approvers = log.approver_ids ? log.approver_ids.split(',') : [];
        if (approvers.includes(String(req.user.id))) throw new Error('You already approved this');

        approvers.push(req.user.id);
        const newCount = log.current_approvals + 1;
        const newIds = approvers.join(',');

        if (newCount >= log.required_approvals) {
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(log.user_id);
            if (user.credits <= 0) throw new Error('User out of credits');
            
            db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(log.user_id);
            db.prepare("UPDATE logs SET status = 'EXECUTED', current_approvals = ?, approver_ids = ? WHERE id = ?").run(newCount, newIds, logId);
            return { result: 'executed' };
        } else {
            db.prepare("UPDATE logs SET current_approvals = ?, approver_ids = ? WHERE id = ?").run(newCount, newIds, logId);
            return { result: 'voted', current: newCount, required: log.required_approvals };
        }
    });

    try { res.json(tx()); } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- ADMIN TOOLS ---
app.post('/rules', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { pattern, action, threshold, start, end } = req.body;
    
    const exactMatch = db.prepare('SELECT * FROM rules WHERE pattern = ?').get(pattern);
    if(exactMatch) return res.status(409).json({ error: 'Conflict: Pattern already exists' });

    db.prepare('INSERT INTO rules (pattern, action, base_threshold, active_start, active_end) VALUES (?, ?, ?, ?, ?)').run(pattern, action, threshold || 1, start || 0, end || 24);
    res.json({ success: true });
});

app.post('/users', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const newApiKey = uuidv4();
    db.prepare('INSERT INTO users (username, api_key, role, seniority, credits) VALUES (?, ?, ?, ?, ?)').run(req.body.username, newApiKey, req.body.role, req.body.seniority || 'junior', 100);
    res.json({ api_key: newApiKey }); 
});

app.get('/users', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    res.json(db.prepare('SELECT id, username, role, seniority, api_key FROM users').all());
});

app.get('/history', authenticate, (req, res) => {
    const q = req.user.role === 'admin' ? `SELECT logs.*, users.username, users.seniority FROM logs JOIN users ON logs.user_id = users.id ORDER BY created_at DESC` : 'SELECT * FROM logs WHERE user_id = ? ORDER BY created_at DESC';
    res.json(db.prepare(q).all(req.user.role === 'admin' ? [] : [req.user.id]));
});

// Serve the Frontend file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));