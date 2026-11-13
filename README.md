# NEXUS ATM: ATM Error Logger and Intelligent Dispatcher

An enterprise-grade, modern, responsive banking operations web application designed to automate ATM fault logging, validate structured identifiers using formal **Deterministic Finite Automata (DFA)** and regular expressions, classify incidents into **five core categories**, and execute **intelligent, deterministic dispatch and failover routing**.

Built with a **Python Flask REST API**, **SQLite relational database**, and a modern **React.js + Tailwind CSS** frontend with interactive **Recharts** analytics and **Lucide React** icons.

---

## 🌟 Key Functional Architecture

### 1. Formal DFA & Regex Validation Engine (`backend/dfa_validator.py`)
Implements formal automata $M = (Q, \Sigma, \delta, q_0, F)$ tracking step-by-step state transitions with side-by-side Regex comparison:
- **ATM ID** ($L_1$): `^ATM-[A-Z]{3}-\d{4}$` (e.g., `ATM-NYC-1042`, `ATM-LON-4091`) — 13 states ($q_0 \to q_{12}$, plus Dead/Trap state).
- **Branch Code** ($L_2$): `^BR-[A-Z]{2}\d{3}$` (e.g., `BR-NY101`, `BR-CA204`) — 9 states ($s_0 \to s_8$).
- **Reporter ID** ($L_3$): `^REP-\d{4}$` (e.g., `REP-1024`, `REP-9901`) — 9 states ($r_0 \to r_8$).
- **Error Code** ($L_4$): `^ERR-(CASH|CARD|NETW|HARD|TRAN)-\d{3}$` (e.g., `ERR-CASH-101`, `ERR-NETW-302`).

### 2. Five-Category Classification & Banking Risk Precedence (`backend/classifier.py`)
Categorizes every ATM fault into exactly five predefined categories:
1. **Cash Dispenser Errors** (Currency cassette jams, reject bin, shutter obstruction, dispenser motor fault)
2. **Card Reader Errors** (Swallowed cards, EMV chip transport block, magnetic head failure, skimmer alarm)
3. **Network/Communication Errors** (Host socket timeout, gateway packet drop, DNS failure, switch disconnect)
4. **Hardware/System Errors** (Receipt printer paper tears, thermal cutter jam, chassis vibration, power UPS)
5. **Transaction/Software Errors** (Ledger sync anomaly, double debit reversal, core banking authorization timeout)

**Conflict Resolution & Precedence Rules:**
- **Rule 1 (Authoritative):** Exact Error Code prefix match takes top priority (`ERR-CASH-*` $\to$ Cash Dispenser).
- **Rule 2 (Semantic):** Keyword frequency and domain weight scoring across description text.
- **Rule 3 (Banking Risk Hierarchy):** When multiple categories tie in description keywords:
  $$\text{Cash Dispenser} \succ \text{Card Reader} \succ \text{Hardware/System} \succ \text{Network/Communication} \succ \text{Transaction/Software}$$
  *(Physical currency loss & theft protection take precedence over communication drops).*

### 3. Intelligent Routing & Deterministic Dispatch System (`backend/dispatcher.py`)
1. **Routing Table Query:** Matches (Category + Zone + Error Code) against explicit routing rules.
2. **Handler Availability & Capacity:** Verifies that Primary Handler is `is_available == 1` and `current_load < max_capacity`.
3. **Automated Failover:** If Primary Handler is saturated or off-duty, dispatches to designated Backup Handler.
4. **Emergency Priority Override:** If both Primary and Backup are unavailable for a `Critical` or `High` incident, triggers an emergency override and escalates to the Senior Field Supervisor with paging.
5. **Deterministic Waiting Queue:** Normal-priority reports without available technicians enter the waiting queue ordered strictly by:
   $$\text{Priority: } \text{Critical} \to \text{High} \to \text{Medium} \to \text{Low} \quad \text{with FIFO tie-breaking}$$
6. **Dynamic Queue Dispatching:** When any technician resolves a ticket or increases capacity, the waiting queue is automatically evaluated in priority order.

---

## 💻 Tech Stack & System Requirements

- **Backend:** Python 3.10+ with Flask 3.1, Flask-CORS 6.0, Werkzeug 3.1
- **Database:** SQLite 3 (ACID-compliant relational database with foreign keys, indexes, and full audit logging)
- **Frontend:** React 18, Vite 6, Tailwind CSS 3.4, Recharts 2.15, Lucide React 0.475, Axios, React Router 6
- **OS Compatibility:** Windows, macOS, Linux

---

## 🚀 Installation and Execution Guide

### Step 1: Clone or Navigate to the Project
```powershell
cd C:\Users\KhushiMS\.gemini\antigravity\scratch\atm-error-logger-dispatcher
```

### Step 2: Setup and Run the Flask Backend
```powershell
cd backend
python -m pip install -r requirements.txt
python app.py
```
*The Flask REST API will start at `http://127.0.0.1:5000` and automatically initialize `atm_system.db` with sample data.*

### Step 3: Run the React Frontend (Development Mode)
In a separate terminal:
```powershell
cd ..\frontend
npm run dev
```
*Open `http://localhost:5173` in your browser. Requests to `/api/*` are automatically proxied to Flask on port 5000.*

### Alternatively: Single-Process Unified Production Mode
The production frontend has already been built into `frontend/dist/`. Simply running:
```powershell
cd backend
python app.py
```
and opening `http://127.0.0.1:5000` serves the complete React Single-Page Application and REST API together!

---

## 👥 Demo Personas & Quick Login Credentials

| Role | Username | Password | Full Name | Description |
|---|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Victoria Sterling | Lead Operations Dispatcher (Central Zone) |
| **Branch User** | `branch_user` | `user123` | David Miller | Branch Operations Officer (North Zone, `REP-1024`) |
| **Field Handler** | `john_tech` | `tech123` | John Davis | Cash Dispenser Field Technician (`HND-01`, North) |

*You can also switch personas instantly with 1-click using the **Role dropdown** in the top navigation bar.*

---

## 📑 Application Navigation & Page Directory

1. **Login Page (`/login`):** Banking terminal authentication with role-based access and 1-click demo autofill.
2. **Main Dashboard (`/`):** 5 enterprise KPI cards (Total, Pending, Assigned, Resolved, Critical), Recharts Category Donut & Priority Bar charts, fleet availability overview, and recent activity timeline.
3. **Report Submission (`/submit-report`):** Interactive reporting form with real-time inline DFA & Regex verification badges, live 5-category detection preview, and demonstration presets.
4. **User Dashboard (`/user-dashboard`):** Branch officer's submitted ticket history, search by Report ID, and live status tracking.
5. **Handler Dashboard (`/handler-dashboard`):** Field technician console with availability toggle switch, max workload capacity slider, ticket acceptance, and resolution notes modal.
6. **Routing Management Dashboard (`/routing-management`):** Explicit routing table editor, technician workload progress bars, priority-ordered waiting queue inspector, and emergency escalation logs.
7. **Analytics Dashboard (`/analytics`):** Interactive Recharts: zone-wise stacked bar charts, weekly incident trend lines, category distribution, and technician SLA adherence table.
8. **Report Details Page (`/reports/:id`):** Full incident dossier with 7-step visual lifecycle progress bar:
   $$\text{Submitted} \to \text{Validated} \to \text{Classified} \to \text{Routed} \to \text{Assigned} \to \text{In Progress} \to \text{Resolved}$$
9. **Settings & Verification Suite (`/settings`):** Built-in automated runner for all 18 test cases, interactive DFA playground, and SQLite database reset controls.

---

## 🧪 Comprehensive Automated Test Suite (18 Test Cases)

To execute all tests from the command line:
```powershell
cd backend
python tests.py
```

### Documented Test Results:
```
======================================================================
RUNNING ATM ERROR LOGGER & DISPATCHER AUTOMATED TEST SUITE
======================================================================
[PASS] TC-01: Valid ATM ID Format (DFA & Regex Agreement)
       Category: DFA & Regex Validation
       Inputs:   "ATM-NYC-1042"
       Expected: dfa_accepted=True, regex_matched=True, agreement=True
       Result:   Accepted at terminal state q12. Full state trace logged.

[PASS] TC-02: Invalid ATM ID Format Rejection
       Category: DFA & Regex Validation
       Inputs:   "ATM-nyc-99"
       Expected: dfa_accepted=False, regex_matched=False
       Result:   Rejected. Trapped at state q10.

[PASS] TC-03: Valid Branch Code Format Acceptance
       Category: DFA & Regex Validation
       Inputs:   "BR-NY101"
       Expected: dfa_accepted=True, regex_matched=True
       Result:   Accepted at terminal state s8.

[PASS] TC-04: Invalid Branch Code Format Rejection
       Category: DFA & Regex Validation
       Inputs:   "BR-101"
       Expected: dfa_accepted=False, regex_matched=False
       Result:   Rejected. Invalid character '1' at index 3.

[PASS] TC-05: Valid Error Code Structured Identifier
       Category: DFA & Regex Validation
       Inputs:   "ERR-CASH-101"
       Expected: dfa_accepted=True, regex_matched=True
       Result:   Accepted at state d3.

[PASS] TC-06: Invalid Error Code Prefix Rejection
       Category: DFA & Regex Validation
       Inputs:   "ERR-UNKNOWN-999"
       Expected: dfa_accepted=False, regex_matched=False
       Result:   Trapped at state e4 on character 'U'.

[PASS] TC-07: Category 1: Cash Dispenser Errors Classification
       Category: Report Classification
       Inputs:   "ERR-CASH-101", "Cassette 2 feeder jam during payout"
       Result:   Cash Dispenser Errors (Confidence: 0.98).

[PASS] TC-08: Category 2: Card Reader Errors Classification
       Category: Report Classification
       Inputs:   "ERR-CARD-201", "Motorized reader swallowed customer card"
       Result:   Card Reader Errors (Confidence: 0.98).

[PASS] TC-09: Category 3: Network/Communication Errors Classification
       Category: Report Classification
       Inputs:   "ERR-NETW-301", "Socket connection timed out"
       Result:   Network/Communication Errors (Confidence: 0.98).

[PASS] TC-10: Category 4: Hardware/System Errors Classification
       Category: Report Classification
       Inputs:   "ERR-HARD-401", "Receipt printer paper jam"
       Result:   Hardware/System Errors (Confidence: 0.98).

[PASS] TC-11: Category 5: Transaction/Software Errors Classification
       Category: Report Classification
       Inputs:   "ERR-TRAN-501", "Double debit on core banking ledger sync"
       Result:   Transaction/Software Errors (Confidence: 0.98).

[PASS] TC-12: Conflicting Keywords & Banking Risk Precedence
       Category: Conflict Resolution
       Inputs:   "Cash dispense bills jam while card swallowed and network timeout"
       Result:   Resolved to Cash Dispenser Errors according to physical security precedence.

[PASS] TC-13: Unknown Routing Zone Fallback Dispatch
       Category: Routing & Dispatch
       Inputs:   Zone: "Northeast" (Unmapped in routing table)
       Result:   Fallback Zone Match applied -> Assigned to HND-06.

[PASS] TC-14: Primary Handler Unavailability -> Backup Assignment
       Category: Failover & Backup
       Inputs:   Primary Handler HND-02 off duty (is_available=0)
       Result:   Failover to Backup Handler HND-06 recorded in assignments audit.

[PASS] TC-15: Handler Capacity Overflow Handling
       Category: Capacity Management
       Inputs:   Primary Handler HND-01 at max capacity (5/5)
       Result:   Dispatched to eligible Backup Handler HND-06 with workload 3/4.

[PASS] TC-16: Emergency Priority Override & Supervisor Escalation
       Category: Escalation & Overrides
       Inputs:   Critical severity incident, Primary full, Backup full
       Result:   Status set to 'Escalated', Emergency Override logged in escalation_logs.

[PASS] TC-17: Deterministic Waiting Queue Priority Ordering
       Category: Queue Determinism
       Inputs:   Batch inserted [Low, Critical, High, Medium]
       Result:   Queue sorted deterministically: [Critical, High, Medium, Low] (FIFO tie-breaker).

[PASS] TC-18: End-to-End Status Lifecycle & Database Persistence
       Category: Database & Lifecycle
       Inputs:   Assigned -> In Progress -> Resolved with resolution notes
       Result:   Verified relational persistence in SQLite reports and report_status_history.
======================================================================
SUMMARY: 18/18 PASSED (100.0%)
======================================================================
```

---

## 🏛 Database Schema Overview

```
users (id, username, password_hash, full_name, role, email, zone, created_at)
handlers (id, name, email, phone, zone, specialty_category, is_available, current_load, max_capacity, rating, created_at)
routing_rules (id, category, zone, error_code_pattern, primary_handler_id, backup_handler_id, priority_threshold, notes)
reports (id, reporter_name, reporter_id, atm_id, branch_code, zone, error_code, error_description, urgency, category, priority, status, assigned_handler_id, backup_handler_id, resolution_notes, created_at, updated_at, resolved_at)
assignments (id, report_id, handler_id, handler_role, decision_reason, assigned_at)
report_status_history (id, report_id, old_status, new_status, changed_by, notes, created_at)
escalation_logs (id, report_id, reason, action_taken, created_at)
```

---

## 🛡 License & Academic Attribution
Created for the **ATM Error Logger and Intelligent Dispatcher** engineering evaluation.
Developed adhering to enterprise software engineering standards, relational integrity, and automata theory.
