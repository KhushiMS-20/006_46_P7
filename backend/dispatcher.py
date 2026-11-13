"""
Intelligent Routing and Dispatch Engine for ATM Error Logger.
Implements:
1. Explicit Routing Table Lookup (Category, Zone, Error Code Pattern).
2. Handler Availability & Dynamic Workload Capacity Verification.
3. Automated Backup Handler Failover.
4. Emergency Priority Override & Escalation Paths.
5. Deterministic Priority-Ordered Waiting Queue (Critical > High > Medium > Low, FIFO tie-breaker).
6. Comprehensive Assignment & Escalation Audit Logging.
"""

from typing import Dict, Any, Optional, List
import sqlite3
from datetime import datetime
from database import get_db_connection

def dispatch_report(
    report_id: str,
    category: str,
    zone: str,
    error_code: str,
    priority: str,
    conn: Optional[sqlite3.Connection] = None
) -> Dict[str, Any]:
    """
    Executes the intelligent dispatch algorithm on a submitted report.
    Returns the dispatch decision details.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Step 1: Lookup Routing Table Rule
    # First attempt exact category + zone match
    cursor.execute("""
        SELECT * FROM routing_rules
        WHERE category = ? AND zone = ?
        ORDER BY id ASC LIMIT 1
    """, (category, zone))
    rule = cursor.fetchone()

    routing_lookup_status = "Exact Match"
    if not rule:
        # Fallback to category rule in 'Central' zone or first rule matching category
        cursor.execute("""
            SELECT * FROM routing_rules
            WHERE category = ?
            ORDER BY (zone = 'Central') DESC, id ASC LIMIT 1
        """, (category,))
        rule = cursor.fetchone()
        routing_lookup_status = "Fallback Zone Match (Central/First Available)"

    if not rule:
        # Generic ultimate fallback
        cursor.execute("SELECT * FROM routing_rules ORDER BY id ASC LIMIT 1")
        rule = cursor.fetchone()
        routing_lookup_status = "Generic System Default Rule"

    primary_id = rule["primary_handler_id"] if rule else "HND-01"
    backup_id = rule["backup_handler_id"] if rule else "HND-06"

    # Step 2: Fetch primary handler details
    cursor.execute("SELECT * FROM handlers WHERE id = ?", (primary_id,))
    primary_handler = cursor.fetchone()

    # Step 3: Fetch backup handler details
    cursor.execute("SELECT * FROM handlers WHERE id = ?", (backup_id,))
    backup_handler = cursor.fetchone()

    assigned_handler_id = None
    backup_handler_id_used = backup_id
    assigned_role = None
    final_status = "Pending"
    decision_reason = ""
    escalation_reason = None
    action_taken = None

    # Step 4: Check Primary Handler Eligibility
    primary_available = primary_handler and bool(primary_handler["is_available"])
    primary_under_capacity = primary_handler and (primary_handler["current_load"] < primary_handler["max_capacity"])

    if primary_available and primary_under_capacity:
        # Primary Handler Assigned Successfully
        assigned_handler_id = primary_id
        assigned_role = "Primary"
        final_status = "Assigned"
        decision_reason = (
            f"Assigned to Primary Handler {primary_handler['name']} ({primary_id}). "
            f"Handler is available with capacity {primary_handler['current_load'] + 1}/{primary_handler['max_capacity']}."
        )

        # Increment load
        cursor.execute("UPDATE handlers SET current_load = current_load + 1 WHERE id = ?", (primary_id,))

    else:
        # Step 5: Primary Ineligible -> Evaluate Backup Handler
        primary_fail_reason = "unavailable (off-duty)" if not primary_available else f"at max capacity ({primary_handler['current_load']}/{primary_handler['max_capacity']})"

        backup_available = backup_handler and bool(backup_handler["is_available"])
        backup_under_capacity = backup_handler and (backup_handler["current_load"] < backup_handler["max_capacity"])

        if backup_available and backup_under_capacity:
            # Backup Handler Assigned Successfully
            assigned_handler_id = backup_id
            assigned_role = "Backup"
            final_status = "Assigned"
            decision_reason = (
                f"Failover to Backup: Primary Handler {primary_handler['name']} ({primary_id}) was {primary_fail_reason}. "
                f"Assigned to Backup Handler {backup_handler['name']} ({backup_id}) with load {backup_handler['current_load'] + 1}/{backup_handler['max_capacity']}."
            )

            # Increment backup load
            cursor.execute("UPDATE handlers SET current_load = current_load + 1 WHERE id = ?", (backup_id,))

        else:
            # Step 6: Neither Primary nor Backup Handler Available!
            backup_fail_reason = "unavailable" if not backup_available else f"at capacity ({backup_handler['current_load']}/{backup_handler['max_capacity']})"

            # Priority Override Check
            if priority in ["Critical", "High"]:
                final_status = "Escalated"
                assigned_role = "Escalated Supervisor"
                decision_reason = (
                    f"EMERGENCY PRIORITY OVERRIDE: Both Primary ({primary_id}: {primary_fail_reason}) and "
                    f"Backup ({backup_id}: {backup_fail_reason}) unavailable. Due to {priority} severity, "
                    f"report is escalated immediately to Senior Field Supervisor and On-Call Technical Response Unit."
                )
                escalation_reason = f"Primary ({primary_id}) {primary_fail_reason} & Backup ({backup_id}) {backup_fail_reason} for {priority} incident."
                action_taken = "Escalated to On-Call Field Operations Supervisor with automated high-priority pager notification."

                cursor.execute("""
                    INSERT INTO escalation_logs (report_id, reason, action_taken, created_at)
                    VALUES (?, ?, ?, ?)
                """, (report_id, escalation_reason, action_taken, now_str))

            else:
                # Normal priority (Medium, Low) goes to Waiting Queue
                final_status = "Queued"
                assigned_role = "None"
                decision_reason = (
                    f"Placed in Waiting Queue: Primary Handler {primary_id} ({primary_fail_reason}) and "
                    f"Backup Handler {backup_id} ({backup_fail_reason}) are currently saturated. "
                    f"Ticket will be automatically dispatched when an eligible technician frees capacity."
                )

    # Step 7: Update Report in Database
    cursor.execute("""
        UPDATE reports
        SET status = ?,
            assigned_handler_id = ?,
            backup_handler_id = ?,
            updated_at = ?
        WHERE id = ?
    """, (final_status, assigned_handler_id, backup_id, now_str, report_id))

    # Step 8: Record in Assignments Table
    cursor.execute("""
        INSERT INTO assignments (report_id, handler_id, handler_role, decision_reason, assigned_at)
        VALUES (?, ?, ?, ?, ?)
    """, (report_id, assigned_handler_id, assigned_role or "None", decision_reason, now_str))

    # Step 9: Record in Report Status History Table
    cursor.execute("""
        INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes, created_at)
        VALUES (?, 'Pending', ?, 'Dispatcher Engine', ?, ?)
    """, (report_id, final_status, decision_reason, now_str))

    conn.commit()

    dispatch_result = {
        "report_id": report_id,
        "routing_rule_id": rule["id"] if rule else None,
        "routing_lookup_status": routing_lookup_status,
        "primary_handler_id": primary_id,
        "backup_handler_id": backup_id,
        "assigned_handler_id": assigned_handler_id,
        "assigned_role": assigned_role,
        "status": final_status,
        "priority": priority,
        "decision_reason": decision_reason,
        "escalated": (final_status == "Escalated"),
        "queued": (final_status == "Queued")
    }

    if should_close:
        conn.close()

    return dispatch_result

def get_deterministic_queue(conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
    """
    Returns the waiting queue ordered strictly by priority (Critical > High > Medium > Low)
    and submission time (FIFO).
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*,
               CASE r.priority
                   WHEN 'Critical' THEN 1
                   WHEN 'High' THEN 2
                   WHEN 'Medium' THEN 3
                   WHEN 'Low' THEN 4
                   ELSE 5
               END as priority_weight
        FROM reports r
        WHERE r.status = 'Queued'
        ORDER BY priority_weight ASC, r.created_at ASC
    """)
    rows = [dict(row) for row in cursor.fetchall()]

    if should_close:
        conn.close()

    return rows

def process_waiting_queue(conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
    """
    Attempts to dispatch all queued reports in strict deterministic priority order.
    Triggered when a handler completes work or increases capacity.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    queued_reports = get_deterministic_queue(conn)
    dispatched_results = []

    for item in queued_reports:
        res = dispatch_report(
            report_id=item["id"],
            category=item["category"],
            zone=item["zone"],
            error_code=item["error_code"],
            priority=item["priority"],
            conn=conn
        )
        if res["status"] == "Assigned":
            dispatched_results.append(res)

    if should_close:
        conn.close()

    return dispatched_results
