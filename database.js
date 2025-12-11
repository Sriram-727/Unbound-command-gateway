const Database = require('better-sqlite3');
const db = new Database('gateway.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    api_key TEXT UNIQUE,
    role TEXT,       -- 'admin' or 'member'
    seniority TEXT,  -- 'junior', 'senior', 'lead' (NEW)
    credits INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT, 
    action TEXT,
    base_threshold INTEGER DEFAULT 1, -- Base approvals needed (NEW)
    active_start INTEGER DEFAULT 0,   -- Start Hour (0-23) (NEW)
    active_end INTEGER DEFAULT 24     -- End Hour (0-23) (NEW)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    command_text TEXT,
    status TEXT, -- 'EXECUTED', 'REJECTED', 'PENDING'
    action_taken TEXT,
    required_approvals INTEGER DEFAULT 1, -- Threshold locked at creation (NEW)
    current_approvals INTEGER DEFAULT 0,  -- Count of approvals (NEW)
    approver_ids TEXT DEFAULT '',         -- IDs of admins who approved (NEW)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin
const seed = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!seed) {
  db.prepare("INSERT INTO users (username, api_key, role, seniority, credits) VALUES (?, ?, ?, ?, ?)").run('SuperAdmin', 'admin-secret', 'admin', 'lead', 9999);
}

// Seed Rules (With Time and Thresholds)
const ruleCheck = db.prepare("SELECT * FROM rules").get();
if (!ruleCheck) {
  console.log("Seeding Rules...");
  const insert = db.prepare("INSERT INTO rules (pattern, action, base_threshold, active_start, active_end) VALUES (?, ?, ?, ?, ?)");
  
  // Standard Rules
  insert.run(':(){ :|:& };:', 'AUTO_REJECT', 1, 0, 24);
  insert.run('rm\\s+-rf\\s+/', 'AUTO_REJECT', 1, 0, 24);
  
  // Time-Based: Deploy only allowed 9AM - 5PM (09 - 17)
  // Outside this time, it triggers rejection or approval manually if code changes
  insert.run('^deploy', 'AUTO_ACCEPT', 1, 9, 17);

  // Voting: "Production" commands need 2 approvals
  insert.run('^prod', 'REQUIRE_APPROVAL', 2, 0, 24);
  
  // Sudo needs 1 approval
  insert.run('^sudo', 'REQUIRE_APPROVAL', 1, 0, 24); 
}

module.exports = db;