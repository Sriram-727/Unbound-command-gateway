# Unbound Command Gateway 🛡️

A secure, transactional command execution system with role-based access control, regex rule matching, and real-time approval workflows. Built for the Unbound Hackathon.

## 📺 Demo Video
**[PASTE YOUR LOOM/YOUTUBE VIDEO LINK HERE]**
*(e.g., Watch the walkthrough: https://www.loom.com/share/your-video-id)*

## 🚀 Live Demo (Optional)
**[https://unbound-command-gateway-zqyf.onrender.com]**


---

## 🛠️ Features Implemented

### Core Requirements
* **Role-Based Access Control:** Admin and Member roles via API Keys.
* **Regex Rule Engine:** Commands are matched against patterns to `AUTO_ACCEPT`, `AUTO_REJECT`, or `REQUIRE_APPROVAL`.
* **Transactional Credits:** SQLite transactions ensure credits are never lost if a log fails.
* **Audit Logging:** Full history of all actions.

### 🌟 Bonus Features
1. **Approval Workflow:** Risky commands (e.g., `sudo`) enter a `PENDING` state.
2. **Real-Time Notifications:** Admin interface updates instantly (polling) and supports Telegram alerts.
3. **Voting Thresholds:** Critical commands can require multiple admin approvals.
4. **User Tiers:** Junior users require more approvals than Seniors.
5. **Time-Based Rules:** Restrict specific commands to business hours.
6. **Conflict Detection:** Prevents admins from creating duplicate rules.
7. **"God Mode" Switcher:** Admin tool to instantly switch user accounts for testing.

---

## ⚙️ Setup & Run Instructions

### Prerequisites
* Node.js installed

### Installation
1. Clone the repository:
   ```bash
   git clone [YOUR_REPO_LINK]

Install dependencies:

Bash

npm install
Start the server:

Bash

node server.js
Open index.html in your browser.

How to Test (Walkthrough)
Login: Use default key admin-secret.

Test Safe Command: Run ls -la → Success.

Test Blocked Command: Run rm -rf / → Blocked.

Test Approval: Run sudo update → Pending. Switch to Admin to Approve.
