"""
Database Module for ATM Error Logger & Intelligent Dispatcher.
SQLite schema management, migrations, connection utilities, and comprehensive seed data.
"""

import sqlite3
import os
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "atm_system.db")

def get_db_connection():
    """Returns a SQLite connection with row_factory set for dictionary-like access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password: str) -> str:
    """Simple SHA256 hashing for demo auth."""
    return hashlib.sha256(password.encode()).hexdigest()

def init_db(reset: bool = False):
    """Initializes the database schema and loads seed data if empty or reset."""
    if reset and os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception as e:
            print(f"Warning removing DB file: {e}")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Admin', 'User', 'Handler')),
        email TEXT NOT NULL,
        zone TEXT DEFAULT 'Central',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS handlers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        zone TEXT NOT NULL CHECK(zone IN ('North', 'South', 'East', 'West', 'Central')),
        specialty_category TEXT NOT NULL,
        is_available INTEGER DEFAULT 1,
        current_load INTEGER DEFAULT 0,
        max_capacity INTEGER DEFAULT 5,
        rating REAL DEFAULT 4.8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routing_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        zone TEXT NOT NULL,
        error_code_pattern TEXT DEFAULT '*',
        primary_handler_id TEXT NOT NULL,
        backup_handler_id TEXT NOT NULL,
        priority_threshold TEXT DEFAULT 'Low',
        notes TEXT,
        FOREIGN KEY (primary_handler_id) REFERENCES handlers(id),
        FOREIGN KEY (backup_handler_id) REFERENCES handlers(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        atm_id TEXT NOT NULL,
        branch_code TEXT NOT NULL,
        zone TEXT NOT NULL,
        error_code TEXT NOT NULL,
        error_description TEXT NOT NULL,
        urgency TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Pending', 'Assigned', 'In Progress', 'Resolved', 'Escalated', 'Queued')),
        assigned_handler_id TEXT,
        backup_handler_id TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        FOREIGN KEY (assigned_handler_id) REFERENCES handlers(id),
        FOREIGN KEY (backup_handler_id) REFERENCES handlers(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id TEXT NOT NULL,
        handler_id TEXT,
        handler_role TEXT NOT NULL,
        decision_reason TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id)
    );

    CREATE TABLE IF NOT EXISTS report_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id)
    );

    CREATE TABLE IF NOT EXISTS escalation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id)
    );
    """)

    conn.commit()

    # Check if seed data exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        seed_database(conn)

    conn.close()

def seed_database(conn):
    """Seed comprehensive initial sample data for demonstration."""
    cursor = conn.cursor()

    # 1. Users
    users_data = [
        ("admin", hash_password("admin123"), "Victoria Sterling (Lead Dispatcher)", "Admin", "admin@bankoperations.com", "Central"),
        ("branch_user", hash_password("user123"), "David Miller (Branch Ops Officer)", "User", "david.m@bankoperations.com", "North"),
        ("sarah_tech", hash_password("tech123"), "Sarah Connor (Field Tech)", "Handler", "sarah.c@bankoperations.com", "South"),
        ("john_tech", hash_password("tech123"), "John Davis (Hardware Specialist)", "Handler", "john.d@bankoperations.com", "North"),
        ("alex_tech", hash_password("tech123"), "Alex Rivera (Network Specialist)", "Handler", "alex.r@bankoperations.com", "East"),
    ]
    cursor.executemany("""
        INSERT INTO users (username, password_hash, full_name, role, email, zone)
        VALUES (?, ?, ?, ?, ?, ?)
    """, users_data)

    # 2. Handlers
    handlers_data = [
        ("HND-01", "John Davis", "john.d@bankoperations.com", "+1-555-0101", "North", "Cash Dispenser Errors", 1, 2, 5, 4.9),
        ("HND-02", "Sarah Connor", "sarah.c@bankoperations.com", "+1-555-0102", "South", "Card Reader Errors", 1, 1, 4, 4.8),
        ("HND-03", "Alex Rivera", "alex.r@bankoperations.com", "+1-555-0103", "East", "Network/Communication Errors", 1, 3, 5, 4.7),
        ("HND-04", "Elena Rostova", "elena.r@bankoperations.com", "+1-555-0104", "West", "Hardware/System Errors", 1, 1, 4, 4.9),
        ("HND-05", "Marcus Vance", "marcus.v@bankoperations.com", "+1-555-0105", "Central", "Transaction/Software Errors", 1, 2, 6, 4.8),
        ("HND-06", "Priya Sharma", "priya.s@bankoperations.com", "+1-555-0106", "Central", "Cash Dispenser Errors", 1, 0, 4, 4.95), # Standby backup
        ("HND-07", "Liam O'Connor", "liam.o@bankoperations.com", "+1-555-0107", "North", "Hardware/System Errors", 0, 4, 4, 4.6), # Busy/Unavailable demo
    ]
    cursor.executemany("""
        INSERT INTO handlers (id, name, email, phone, zone, specialty_category, is_available, current_load, max_capacity, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, handlers_data)

    # 3. Explicit Routing Table Rules
    # Maps Category + Zone + Error Code pattern -> Primary Handler & Backup Handler
    routing_rules = [
        ("Cash Dispenser Errors", "North", "ERR-CASH-*", "HND-01", "HND-06", "Low", "North Cash Route: John Davis with Priya Sharma backup"),
        ("Cash Dispenser Errors", "Central", "ERR-CASH-*", "HND-06", "HND-05", "Low", "Central Cash Primary is Priya Sharma"),
        ("Cash Dispenser Errors", "South", "ERR-CASH-*", "HND-02", "HND-06", "Low", "South Cash with Central floating backup"),
        ("Cash Dispenser Errors", "East", "ERR-CASH-*", "HND-03", "HND-06", "Low", "East Cash handled with floating backup"),
        ("Cash Dispenser Errors", "West", "ERR-CASH-*", "HND-04", "HND-06", "Low", "West Cash primary Elena with Priya backup"),

        ("Card Reader Errors", "South", "ERR-CARD-*", "HND-02", "HND-06", "Low", "Sarah Connor South Card Specialist"),
        ("Card Reader Errors", "North", "ERR-CARD-*", "HND-01", "HND-02", "Low", "North Card routing"),
        ("Card Reader Errors", "Central", "ERR-CARD-*", "HND-05", "HND-02", "Low", "Central Card reader dispatch"),
        ("Card Reader Errors", "East", "ERR-CARD-*", "HND-03", "HND-02", "Low", "East Card reader route"),
        ("Card Reader Errors", "West", "ERR-CARD-*", "HND-04", "HND-02", "Low", "West Card reader route"),

        ("Network/Communication Errors", "East", "ERR-NETW-*", "HND-03", "HND-05", "Low", "Alex Rivera East Network lead"),
        ("Network/Communication Errors", "Central", "ERR-NETW-*", "HND-05", "HND-03", "Low", "Central Telecom dispatch"),
        ("Network/Communication Errors", "North", "ERR-NETW-*", "HND-01", "HND-03", "Low", "North Network escalation path"),
        ("Network/Communication Errors", "South", "ERR-NETW-*", "HND-02", "HND-03", "Low", "South Network dispatch"),
        ("Network/Communication Errors", "West", "ERR-NETW-*", "HND-04", "HND-03", "Low", "West Telecom route"),

        ("Hardware/System Errors", "West", "ERR-HARD-*", "HND-04", "HND-01", "Low", "Elena Rostova West Hardware lead"),
        ("Hardware/System Errors", "North", "ERR-HARD-*", "HND-01", "HND-04", "Low", "North Hardware maintenance route"),
        ("Hardware/System Errors", "Central", "ERR-HARD-*", "HND-05", "HND-04", "Low", "Central Hardware maintenance route"),
        ("Hardware/System Errors", "South", "ERR-HARD-*", "HND-02", "HND-04", "Low", "South Hardware maintenance route"),
        ("Hardware/System Errors", "East", "ERR-HARD-*", "HND-03", "HND-04", "Low", "East Hardware maintenance route"),

        ("Transaction/Software Errors", "Central", "ERR-TRAN-*", "HND-05", "HND-03", "Low", "Marcus Vance Central Software Specialist"),
        ("Transaction/Software Errors", "North", "ERR-TRAN-*", "HND-05", "HND-01", "Low", "North Core Banking Dispatch"),
        ("Transaction/Software Errors", "South", "ERR-TRAN-*", "HND-05", "HND-02", "Low", "South Core Banking Dispatch"),
        ("Transaction/Software Errors", "East", "ERR-TRAN-*", "HND-05", "HND-03", "Low", "East Core Banking Dispatch"),
        ("Transaction/Software Errors", "West", "ERR-TRAN-*", "HND-05", "HND-04", "Low", "West Core Banking Dispatch"),
    ]
    cursor.executemany("""
        INSERT INTO routing_rules (category, zone, error_code_pattern, primary_handler_id, backup_handler_id, priority_threshold, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, routing_rules)

    # 4. Realistic Historical & Active Reports
    now = datetime.now()
    def dt_str(hours_ago):
        return (now - timedelta(hours=hours_ago)).strftime("%Y-%m-%d %H:%M:%S")

    sample_reports = [
        (
            "REP-2026-1001", "David Miller", "REP-1024", "ATM-NYC-1042", "BR-NY101", "North",
            "ERR-CASH-101", "Cassette 2 feeder jam during customer payout of $400. Shutter stuck halfway open.",
            "High", "Cash Dispenser Errors", "High", "In Progress",
            "HND-01", "HND-06", None, dt_str(6), dt_str(5), None
        ),
        (
            "REP-2026-1002", "Alice Wong", "REP-2051", "ATM-LON-4091", "BR-NY101", "North",
            "ERR-CASH-102", "Reject bin full after repeated failed dispense cycles. Dispenser offline.",
            "Medium", "Cash Dispenser Errors", "Medium", "Assigned",
            "HND-01", "HND-06", None, dt_str(4), dt_str(4), None
        ),
        (
            "REP-2026-1003", "Carlos Mendes", "REP-3108", "ATM-MUM-8821", "BR-FL302", "South",
            "ERR-CARD-201", "EMV chip reader swallowing debit cards without returning them. Motorized transport blocked.",
            "Critical", "Card Reader Errors", "Critical", "In Progress",
            "HND-02", "HND-06", None, dt_str(8), dt_str(7), None
        ),
        (
            "REP-2026-1004", "Emily Watson", "REP-4209", "ATM-TOK-5510", "BR-IL405", "East",
            "ERR-NETW-301", "Socket connection to host core switch timed out after 30000ms. DNS resolve failed.",
            "High", "Network/Communication Errors", "High", "In Progress",
            "HND-03", "HND-05", None, dt_str(12), dt_str(11), None
        ),
        (
            "REP-2026-1005", "Brian O'Reilly", "REP-5312", "ATM-PAR-9014", "BR-CA204", "West",
            "ERR-HARD-401", "Thermal receipt printer carriage blocked by paper tear. Internal temperature normal.",
            "Low", "Hardware/System Errors", "Low", "Resolved",
            "HND-04", "HND-01", "Cleared jammed thermal paper roll and performed diagnostic print cycle test.", dt_str(24), dt_str(20), dt_str(20)
        ),
        (
            "REP-2026-1006", "Samantha Reed", "REP-6421", "ATM-SFO-8812", "BR-IL405", "East",
            "ERR-NETW-302", "Intermittent packet loss on IP gateway 10.42.1.1 causing aborted sessions.",
            "Medium", "Network/Communication Errors", "Medium", "Resolved",
            "HND-03", "HND-05", "Re-seated local router patch cable and verified continuous 0ms ping.", dt_str(36), dt_str(30), dt_str(30)
        ),
        (
            "REP-2026-1007", "Gregory House", "REP-7533", "ATM-CHI-3301", "BR-TX501", "Central",
            "ERR-TRAN-501", "Double debit reversal failed on transaction #TXN-99812. Balance mismatch in ledger.",
            "High", "Transaction/Software Errors", "High", "In Progress",
            "HND-05", "HND-03", None, dt_str(5), dt_str(4), None
        ),
        (
            "REP-2026-1008", "David Miller", "REP-1024", "ATM-BOS-7714", "BR-NY101", "North",
            "ERR-HARD-402", "External vibration tamper sensor triggered by adjacent construction work.",
            "Critical", "Hardware/System Errors", "Critical", "Escalated",
            None, None, None, dt_str(2), dt_str(2), None
        ),
        (
            "REP-2026-1009", "Fiona Gallagher", "REP-8644", "ATM-MIA-2244", "BR-FL302", "South",
            "ERR-CARD-202", "Card reader magnetic head sensor reports high read error rate (over 80%).",
            "Medium", "Card Reader Errors", "Medium", "Queued",
            None, None, None, dt_str(1), dt_str(1), None
        ),
        (
            "REP-2026-1010", "Kevin Bacon", "REP-9755", "ATM-SEA-6632", "BR-CA204", "West",
            "ERR-TRAN-502", "Customer session timeout during PIN verification loop. Application frozen.",
            "Low", "Transaction/Software Errors", "Low", "Pending",
            None, None, None, dt_str(1), dt_str(1), None
        ),
    ]

    cursor.executemany("""
        INSERT INTO reports (
            id, reporter_name, reporter_id, atm_id, branch_code, zone,
            error_code, error_description, urgency, category, priority, status,
            assigned_handler_id, backup_handler_id, resolution_notes,
            created_at, updated_at, resolved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_reports)

    # 5. Assignments history
    assignments_data = [
        ("REP-2026-1001", "HND-01", "Primary", "Primary handler matched via North Cash routing rule and available.", dt_str(6)),
        ("REP-2026-1002", "HND-01", "Primary", "Assigned based on North Cash dispenser expertise.", dt_str(4)),
        ("REP-2026-1003", "HND-02", "Primary", "South card reader primary handler assigned for critical EMV failure.", dt_str(8)),
        ("REP-2026-1004", "HND-03", "Primary", "East network specialist assigned for socket timeout.", dt_str(12)),
        ("REP-2026-1005", "HND-04", "Primary", "West hardware tech assigned and successfully resolved.", dt_str(24)),
        ("REP-2026-1006", "HND-03", "Primary", "East network gateway fault assigned.", dt_str(36)),
        ("REP-2026-1007", "HND-05", "Primary", "Central software handler assigned for core banking sync.", dt_str(5)),
    ]
    cursor.executemany("""
        INSERT INTO assignments (report_id, handler_id, handler_role, decision_reason, assigned_at)
        VALUES (?, ?, ?, ?, ?)
    """, assignments_data)

    # 6. Status History
    status_histories = [
        ("REP-2026-1001", None, "Pending", "System", "Report initially submitted by David Miller.", dt_str(6)),
        ("REP-2026-1001", "Pending", "Assigned", "Dispatcher Engine", "Auto-routed to John Davis (HND-01).", dt_str(6)),
        ("REP-2026-1001", "Assigned", "In Progress", "John Davis", "Handler acknowledged ticket and en route.", dt_str(5)),

        ("REP-2026-1005", None, "Pending", "System", "Paper jam reported.", dt_str(24)),
        ("REP-2026-1005", "Pending", "Assigned", "Dispatcher Engine", "Assigned to Elena Rostova (HND-04).", dt_str(23)),
        ("REP-2026-1005", "Assigned", "In Progress", "Elena Rostova", "Arrived at West branch ATM-PAR-9014.", dt_str(22)),
        ("REP-2026-1005", "In Progress", "Resolved", "Elena Rostova", "Cleared jammed thermal paper roll and tested print cycle.", dt_str(20)),

        ("REP-2026-1008", None, "Pending", "System", "Tamper sensor alarm triggered.", dt_str(2)),
        ("REP-2026-1008", "Pending", "Escalated", "Dispatcher Engine", "Priority Override: Critical alarm escalated to Security & Field Supervisor.", dt_str(2)),
    ]
    cursor.executemany("""
        INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, status_histories)

    # 7. Escalation Logs
    escalations_data = [
        (
            "REP-2026-1008",
            "Critical tamper sensor alarm on North ATM-BOS-7714; Primary handler Liam O'Connor unavailable and John Davis at capacity.",
            "Emergency Priority Override triggered: Escalated directly to Central Security Supervisor and Paged On-Call Manager.",
            dt_str(2)
        )
    ]
    cursor.executemany("""
        INSERT INTO escalation_logs (report_id, reason, action_taken, created_at)
        VALUES (?, ?, ?, ?)
    """, escalations_data)

    conn.commit()

# Run initialization upon module load
if __name__ == "__main__":
    init_db(reset=True)
    print("Database initialized successfully with rich seed data.")
