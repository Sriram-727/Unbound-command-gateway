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
   git clone https://github.com/Sriram-727/Unbound-command-gateway

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

API Documentation

The backend runs on http://localhost:3000 (or your deployed URL). All protected endpoints require the x-api-key header.

1. Execute Command
Submits a command for processing. The system checks credits and regex rules.

Endpoint: POST /commands

Headers: x-api-key: <YOUR_API_KEY>

{ "command_text": "ls -la" }

Response (Success):

{ "status": "executed", "new_balance": 99 }

2. Fetch Audit Logs
Retrieves the command history. Admins see all logs; Members see only their own.

Endpoint: GET /history

Headers: x-api-key: <YOUR_API_KEY>

Response:

[
  {
    "id": 1,
    "username": "TestUser",
    "command_text": "sudo update",
    "status": "PENDING",
    "created_at": "2023-12-11T10:00:00.000Z"
  }
]

3. Approve Request (Admin Only)
Approves or denies a pending command.

Endpoint: POST /approvals

Headers: x-api-key: <ADMIN_API_KEY>

Body:

JSON

{ "logId": 12, "decision": "APPROVE" }

4. Add Rule (Admin Only)
Adds a new regex pattern to the rule engine.

Endpoint: POST /rules

Body:

JSON

{
  "pattern": "^sudo",
  "action": "REQUIRE_APPROVAL",
  "threshold": 2,
  "start": 9,
  "end": 17
}
5. Create User (Admin Only)

Generates a new user and returns their one-time API key.

Endpoint: POST /users

Body:

JSON

{ "username": "JuniorDev", "role": "member", "seniority": "junior" }
