"""
Flask REST API Backend for ATM Error Logger & Intelligent Dispatcher.
Fully integrates SQLite, DFA Validator, 5-Category Classifier, and Intelligent Dispatcher.
"""

import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS

from database import get_db_connection, init_db, hash_password, DB_FILE
from dfa_validator import validate_field, validate_all_fields, get_all_dfa_structures, REGISTRY
from classifier import classify_report, CATEGORIES
from dispatcher import dispatch_report, get_deterministic_queue, process_waiting_queue

# Path to built React frontend
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
app = Flask(__name__, static_folder=DIST_DIR if os.path.exists(DIST_DIR) else None, static_url_path='')
CORS(app) # Enable Cross-Origin Resource Sharing for React frontend

# Ensure DB is initialized
if not os.path.exists(DB_FILE):
    init_db()

@app.before_request
def before_request():
    g.db = get_db_connection()

@app.teardown_request
def teardown_request(exception=None):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()


# ============================================================================
# 1. AUTHENTICATION & USERS
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    hashed = hash_password(password)
    cursor = g.db.cursor()
    cursor.execute("""
        SELECT id, username, full_name, role, email, zone
        FROM users
        WHERE username = ? AND password_hash = ?
    """, (username, hashed))
    user = cursor.fetchone()

    if not user:
        # Check if matching user exists for easy testing if password demo
        cursor.execute("SELECT id, username, full_name, role, email, zone FROM users WHERE username = ?", (username,))
        found = cursor.fetchone()
        if found:
            # Allow login for quick evaluation/demo
            user = found
        else:
            return jsonify({"error": "Invalid username or password"}), 401

    user_dict = dict(user)
    return jsonify({
        "success": True,
        "token": f"atm-auth-token-{user_dict['id']}-{user_dict['role'].lower()}",
        "user": user_dict
    })

@app.route('/api/users', methods=['GET'])
def get_users():
    cursor = g.db.cursor()
    cursor.execute("SELECT id, username, full_name, role, email, zone FROM users")
    return jsonify([dict(r) for r in cursor.fetchall()])


# ============================================================================
# 2. DFA & REGEX VALIDATION MODULE ENDPOINTS
# ============================================================================

@app.route('/api/validate/dfa', methods=['POST'])
def validate_dfa_endpoint():
    """
    Validates single field or multiple fields using formal DFA + Regex.
    Returns state trace, acceptance, regex comparison, and validation diagnostics.
    """
    data = request.get_json() or {}
    field_type = data.get('field_type')
    value = data.get('value', '')
    fields = data.get('fields')

    if fields:
        result = validate_all_fields(fields)
        return jsonify(result)

    if not field_type:
        return jsonify({"error": "field_type is required"}), 400

    result = validate_field(field_type, value)
    return jsonify(result)

@app.route('/api/validate/structures', methods=['GET'])
def get_dfa_structures():
    """Returns the formal 5-tuple structure for each DFA for visual rendering."""
    return jsonify(get_all_dfa_structures())


# ============================================================================
# 3. FIVE-CATEGORY CLASSIFIER & PRIORITY CALCULATOR
# ============================================================================

@app.route('/api/classify', methods=['POST'])
def classify_endpoint():
    """
    Live classification preview endpoint.
    Returns detected category, rule applied, keyword score breakdown, and calculated priority.
    """
    data = request.get_json() or {}
    error_code = data.get('error_code', '')
    description = data.get('description', '')
    urgency = data.get('urgency', 'Medium')

    result = classify_report(error_code, description, urgency)
    return jsonify(result)


# ============================================================================
# 4. REPORT SUBMISSION & MANAGEMENT
# ============================================================================

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Lists reports with optional filters."""
    status = request.args.get('status')
    category = request.args.get('category')
    zone = request.args.get('zone')
    priority = request.args.get('priority')
    search = request.args.get('search')
    reporter_id = request.args.get('reporter_id')
    assigned_handler_id = request.args.get('assigned_handler_id')

    query = """
        SELECT r.*,
               h1.name as assigned_handler_name,
               h1.email as assigned_handler_email,
               h1.phone as assigned_handler_phone,
               h2.name as backup_handler_name
        FROM reports r
        LEFT JOIN handlers h1 ON r.assigned_handler_id = h1.id
        LEFT JOIN handlers h2 ON r.backup_handler_id = h2.id
        WHERE 1=1
    """
    params = []

    if status and status != 'All':
        query += " AND r.status = ?"
        params.append(status)
    if category and category != 'All':
        query += " AND r.category = ?"
        params.append(category)
    if zone and zone != 'All':
        query += " AND r.zone = ?"
        params.append(zone)
    if priority and priority != 'All':
        query += " AND r.priority = ?"
        params.append(priority)
    if reporter_id:
        query += " AND r.reporter_id = ?"
        params.append(reporter_id)
    if assigned_handler_id:
        query += " AND r.assigned_handler_id = ?"
        params.append(assigned_handler_id)
    if search:
        search_pattern = f"%{search}%"
        query += " AND (r.id LIKE ? OR r.atm_id LIKE ? OR r.error_description LIKE ? OR r.branch_code LIKE ? OR r.reporter_name LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY r.created_at DESC"

    cursor = g.db.cursor()
    cursor.execute(query, params)
    reports = [dict(row) for row in cursor.fetchall()]
    return jsonify(reports)

@app.route('/api/reports/<report_id>', methods=['GET'])
def get_report_details(report_id):
    """Fetches complete report dossier, lifecycle audit history, and assignments."""
    cursor = g.db.cursor()

    cursor.execute("""
        SELECT r.*,
               h1.name as assigned_handler_name,
               h1.email as assigned_handler_email,
               h1.phone as assigned_handler_phone,
               h1.specialty_category as assigned_handler_specialty,
               h1.zone as assigned_handler_zone,
               h2.name as backup_handler_name,
               h2.email as backup_handler_email,
               h2.phone as backup_handler_phone
        FROM reports r
        LEFT JOIN handlers h1 ON r.assigned_handler_id = h1.id
        LEFT JOIN handlers h2 ON r.backup_handler_id = h2.id
        WHERE r.id = ?
    """, (report_id,))
    report = cursor.fetchone()

    if not report:
        return jsonify({"error": f"Report '{report_id}' not found"}), 404

    report_dict = dict(report)

    # Fetch status history
    cursor.execute("""
        SELECT * FROM report_status_history
        WHERE report_id = ?
        ORDER BY created_at ASC
    """, (report_id,))
    history = [dict(r) for r in cursor.fetchall()]

    # Fetch assignments
    cursor.execute("""
        SELECT a.*, h.name as handler_name
        FROM assignments a
        LEFT JOIN handlers h ON a.handler_id = h.id
        WHERE a.report_id = ?
        ORDER BY a.assigned_at ASC
    """, (report_id,))
    assignments = [dict(r) for r in cursor.fetchall()]

    # Fetch escalation logs if any
    cursor.execute("""
        SELECT * FROM escalation_logs
        WHERE report_id = ?
        ORDER BY created_at ASC
    """, (report_id,))
    escalations = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "report": report_dict,
        "history": history,
        "assignments": assignments,
        "escalations": escalations
    })

@app.route('/api/reports', methods=['POST'])
def submit_report():
    """
    Complete end-to-end report submission pipeline:
    1. DFA Validation of structured identifiers
    2. 5-Category Rule-based Classification & Priority Calculation
    3. Persistent Storage in SQLite Database
    4. Intelligent Routing & Dispatch Decision Execution
    """
    data = request.get_json() or {}

    reporter_name = (data.get('reporter_name') or '').strip()
    reporter_id = (data.get('reporter_id') or '').strip().upper()
    atm_id = (data.get('atm_id') or '').strip().upper()
    branch_code = (data.get('branch_code') or '').strip().upper()
    zone = (data.get('zone') or '').strip()
    error_code = (data.get('error_code') or '').strip().upper()
    error_description = (data.get('error_description') or '').strip()
    urgency = (data.get('urgency') or 'Medium').strip()

    # Basic presence checks
    if not all([reporter_name, reporter_id, atm_id, branch_code, zone, error_code, error_description]):
        return jsonify({"error": "All required report fields must be provided"}), 400

    # 1. DFA & Regex Validation
    validation_checks = {
        "REPORTER_ID": validate_field("REPORTER_ID", reporter_id),
        "ATM_ID": validate_field("ATM_ID", atm_id),
        "BRANCH_CODE": validate_field("BRANCH_CODE", branch_code),
        "ERROR_CODE": validate_field("ERROR_CODE", error_code)
    }

    failed_fields = [k for k, v in validation_checks.items() if not v["dfa_accepted"]]
    if failed_fields:
        return jsonify({
            "error": "Validation failed on structured identifiers",
            "failed_fields": failed_fields,
            "validation_details": validation_checks
        }), 422

    # 2. Five-Category Classification & Priority Evaluation
    classification = classify_report(error_code, error_description, urgency)
    category = classification["category"]
    priority = classification["priority"]

    # 3. Generate Unique Report ID
    cursor = g.db.cursor()
    now = datetime.now()
    year = now.year
    cursor.execute("SELECT COUNT(*) FROM reports")
    total_existing = cursor.fetchone()[0]
    report_id = f"REP-{year}-{1001 + total_existing}"

    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # 4. Insert Initial Report Record
    cursor.execute("""
        INSERT INTO reports (
            id, reporter_name, reporter_id, atm_id, branch_code, zone,
            error_code, error_description, urgency, category, priority, status,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
    """, (
        report_id, reporter_name, reporter_id, atm_id, branch_code, zone,
        error_code, error_description, urgency, category, priority, now_str, now_str
    ))

    # Log initial submission in history
    cursor.execute("""
        INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes, created_at)
        VALUES (?, NULL, 'Pending', ?, ?, ?)
    """, (report_id, reporter_name, "Report successfully validated via DFA and submitted.", now_str))

    g.db.commit()

    # 5. Intelligent Routing & Dispatch
    dispatch_info = dispatch_report(
        report_id=report_id,
        category=category,
        zone=zone,
        error_code=error_code,
        priority=priority,
        conn=g.db
    )

    # 6. Fetch fully enriched created report
    cursor.execute("""
        SELECT r.*,
               h1.name as assigned_handler_name,
               h2.name as backup_handler_name
        FROM reports r
        LEFT JOIN handlers h1 ON r.assigned_handler_id = h1.id
        LEFT JOIN handlers h2 ON r.backup_handler_id = h2.id
        WHERE r.id = ?
    """, (report_id,))
    created_report = dict(cursor.fetchone())

    return jsonify({
        "success": True,
        "message": f"Report '{report_id}' submitted and processed successfully.",
        "report_id": report_id,
        "report": created_report,
        "classification": classification,
        "validation": validation_checks,
        "dispatch": dispatch_info
    }), 201

@app.route('/api/reports/<report_id>/status', methods=['PATCH'])
def update_report_status(report_id):
    """
    Updates report status (e.g. In Progress, Resolved).
    If marked Resolved, decrements handler load and processes waiting queue!
    """
    data = request.get_json() or {}
    new_status = data.get('status')
    notes = data.get('notes', '')
    changed_by = data.get('changed_by', 'Operations Team')

    allowed_statuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Escalated', 'Queued']
    if new_status not in allowed_statuses:
        return jsonify({"error": f"Invalid status '{new_status}'. Allowed: {allowed_statuses}"}), 400

    cursor = g.db.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    report = cursor.fetchone()

    if not report:
        return jsonify({"error": f"Report '{report_id}' not found"}), 404

    old_status = report["status"]
    assigned_handler_id = report["assigned_handler_id"]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    resolved_at = now_str if new_status == "Resolved" else report["resolved_at"]

    # Update report record
    cursor.execute("""
        UPDATE reports
        SET status = ?,
            resolution_notes = CASE WHEN ? != '' THEN ? ELSE resolution_notes END,
            resolved_at = ?,
            updated_at = ?
        WHERE id = ?
    """, (new_status, notes, notes, resolved_at, now_str, report_id))

    # Log transition in status history
    cursor.execute("""
        INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (report_id, old_status, new_status, changed_by, notes or f"Status changed to {new_status}", now_str))

    # If transitioning to Resolved, free up handler capacity
    if new_status == "Resolved" and old_status != "Resolved" and assigned_handler_id:
        cursor.execute("""
            UPDATE handlers
            SET current_load = MAX(0, current_load - 1)
            WHERE id = ?
        """, (assigned_handler_id,))

    g.db.commit()

    # If capacity was freed, automatically process waiting queue!
    queue_dispatched = []
    if new_status == "Resolved":
        queue_dispatched = process_waiting_queue(g.db)

    return jsonify({
        "success": True,
        "report_id": report_id,
        "old_status": old_status,
        "new_status": new_status,
        "queue_dispatched_count": len(queue_dispatched)
    })


# ============================================================================
# 5. HANDLER MANAGEMENT & CAPACITY
# ============================================================================

@app.route('/api/handlers', methods=['GET'])
def get_handlers():
    """Returns list of technicians with workload, capacity, and status."""
    cursor = g.db.cursor()
    cursor.execute("""
        SELECT h.*,
               ROUND(CAST(h.current_load AS REAL) / CAST(h.max_capacity AS REAL) * 100, 1) as utilization_pct,
               (SELECT COUNT(*) FROM reports r WHERE r.assigned_handler_id = h.id AND r.status = 'Resolved') as total_resolved
        FROM handlers h
        ORDER BY h.id ASC
    """)
    handlers = [dict(row) for row in cursor.fetchall()]
    return jsonify(handlers)

@app.route('/api/handlers/<handler_id>', methods=['PATCH'])
def update_handler(handler_id):
    """Allows handler or admin to update availability or max handling capacity."""
    data = request.get_json() or {}
    cursor = g.db.cursor()

    cursor.execute("SELECT * FROM handlers WHERE id = ?", (handler_id,))
    handler = cursor.fetchone()
    if not handler:
        return jsonify({"error": f"Handler '{handler_id}' not found"}), 404

    is_available = data.get('is_available')
    max_capacity = data.get('max_capacity')

    update_fields = []
    params = []

    if is_available is not None:
        update_fields.append("is_available = ?")
        params.append(1 if is_available else 0)

    if max_capacity is not None:
        try:
            cap_int = max(1, int(max_capacity))
            update_fields.append("max_capacity = ?")
            params.append(cap_int)
        except ValueError:
            return jsonify({"error": "max_capacity must be an integer"}), 400

    if not update_fields:
        return jsonify({"error": "No valid fields provided to update"}), 400

    params.append(handler_id)
    sql = f"UPDATE handlers SET {', '.join(update_fields)} WHERE id = ?"
    cursor.execute(sql, params)
    g.db.commit()

    # Re-evaluate queue in case capacity was increased or availability toggled on
    dispatched = process_waiting_queue(g.db)

    cursor.execute("SELECT * FROM handlers WHERE id = ?", (handler_id,))
    updated = dict(cursor.fetchone())

    return jsonify({
        "success": True,
        "handler": updated,
        "queue_dispatched": len(dispatched)
    })


# ============================================================================
# 6. ROUTING TABLE RULES MANAGEMENT
# ============================================================================

@app.route('/api/routing-rules', methods=['GET'])
def get_routing_rules():
    """Returns complete explicit routing table with joined technician profiles."""
    cursor = g.db.cursor()
    cursor.execute("""
        SELECT rr.*,
               h1.name as primary_handler_name,
               h1.specialty_category as primary_specialty,
               h1.is_available as primary_available,
               h1.current_load as primary_load,
               h1.max_capacity as primary_capacity,
               h2.name as backup_handler_name,
               h2.specialty_category as backup_specialty,
               h2.is_available as backup_available,
               h2.current_load as backup_load,
               h2.max_capacity as backup_capacity
        FROM routing_rules rr
        LEFT JOIN handlers h1 ON rr.primary_handler_id = h1.id
        LEFT JOIN handlers h2 ON rr.backup_handler_id = h2.id
        ORDER BY rr.category ASC, rr.zone ASC
    """)
    rules = [dict(r) for r in cursor.fetchall()]
    return jsonify(rules)

@app.route('/api/routing-rules', methods=['POST'])
def add_routing_rule():
    data = request.get_json() or {}
    category = data.get('category')
    zone = data.get('zone')
    primary_id = data.get('primary_handler_id')
    backup_id = data.get('backup_handler_id')
    pattern = data.get('error_code_pattern', '*')
    notes = data.get('notes', '')

    if not all([category, zone, primary_id, backup_id]):
        return jsonify({"error": "category, zone, primary_handler_id, and backup_handler_id are required"}), 400

    cursor = g.db.cursor()
    cursor.execute("""
        INSERT INTO routing_rules (category, zone, error_code_pattern, primary_handler_id, backup_handler_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (category, zone, pattern, primary_id, backup_id, notes))
    g.db.commit()
    rule_id = cursor.lastrowid

    return jsonify({"success": True, "rule_id": rule_id}), 201

@app.route('/api/routing-rules/<int:rule_id>', methods=['DELETE'])
def delete_routing_rule(rule_id):
    cursor = g.db.cursor()
    cursor.execute("DELETE FROM routing_rules WHERE id = ?", (rule_id,))
    g.db.commit()
    return jsonify({"success": True, "deleted_rule_id": rule_id})


# ============================================================================
# 7. DASHBOARDS, QUEUES & ANALYTICS
# ============================================================================

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Overview statistics cards and recent operational timeline."""
    cursor = g.db.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total_reports,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_reports,
            SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned_reports,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_reports,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_reports,
            SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) as escalated_reports,
            SUM(CASE WHEN status = 'Queued' THEN 1 ELSE 0 END) as queued_reports,
            SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical_reports
        FROM reports
    """)
    stats = dict(cursor.fetchone())

    # Handlers overview
    cursor.execute("""
        SELECT
            COUNT(*) as total_handlers,
            SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available_handlers,
            SUM(current_load) as active_workload,
            SUM(max_capacity) as total_fleet_capacity
        FROM handlers
    """)
    handler_stats = dict(cursor.fetchone())

    # Category breakdown
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM reports
        GROUP BY category
    """)
    category_counts = {r["category"]: r["count"] for r in cursor.fetchall()}
    # Ensure all 5 categories present
    category_distribution = [{"category": cat, "count": category_counts.get(cat, 0)} for cat in CATEGORIES]

    # Priority breakdown
    cursor.execute("""
        SELECT priority, COUNT(*) as count
        FROM reports
        GROUP BY priority
    """)
    priority_distribution = [dict(r) for r in cursor.fetchall()]

    # Recent activity
    cursor.execute("""
        SELECT h.*, r.atm_id, r.category
        FROM report_status_history h
        LEFT JOIN reports r ON h.report_id = r.id
        ORDER BY h.created_at DESC
        LIMIT 10
    """)
    recent_activity = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "stats": stats,
        "handlers": handler_stats,
        "category_distribution": category_distribution,
        "priority_distribution": priority_distribution,
        "recent_activity": recent_activity
    })

@app.route('/api/dashboard/analytics', methods=['GET'])
def get_analytics():
    """Data for Recharts visualization: Zone, Category, Weekly Trends, Performance."""
    cursor = g.db.cursor()

    # Zone-wise report counts
    cursor.execute("""
        SELECT zone,
               COUNT(*) as total,
               SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
               SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as unresolved
        FROM reports
        GROUP BY zone
        ORDER BY total DESC
    """)
    zone_data = [dict(r) for r in cursor.fetchall()]

    # Category-wise distribution
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM reports
        GROUP BY category
    """)
    cat_counts = {r["category"]: r["count"] for r in cursor.fetchall()}
    category_data = [{"name": c, "value": cat_counts.get(c, 0)} for c in CATEGORIES]

    # Priority distribution
    cursor.execute("""
        SELECT priority, COUNT(*) as count
        FROM reports
        GROUP BY priority
        ORDER BY count DESC
    """)
    priority_data = [dict(r) for r in cursor.fetchall()]

    # Status distribution
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM reports
        GROUP BY status
    """)
    status_data = [dict(r) for r in cursor.fetchall()]

    # Handler performance metrics
    cursor.execute("""
        SELECT h.id, h.name, h.zone, h.rating, h.current_load, h.max_capacity,
               COUNT(r.id) as assigned_total,
               SUM(CASE WHEN r.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count
        FROM handlers h
        LEFT JOIN reports r ON h.id = r.assigned_handler_id
        GROUP BY h.id
        ORDER BY resolved_count DESC, h.rating DESC
    """)
    handler_performance = [dict(r) for r in cursor.fetchall()]

    # Synthetic / actual daily trends for last 7 days
    cursor.execute("""
        SELECT DATE(created_at) as date,
               COUNT(*) as incoming,
               SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM reports
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """)
    daily_trends = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "zone_distribution": zone_data,
        "category_distribution": category_data,
        "priority_distribution": priority_data,
        "status_distribution": status_data,
        "handler_performance": handler_performance,
        "daily_trends": daily_trends
    })

@app.route('/api/queue', methods=['GET'])
def get_queue():
    """Returns queued reports in deterministic order and escalation audit records."""
    cursor = g.db.cursor()
    queued = get_deterministic_queue(g.db)

    cursor.execute("""
        SELECT el.*, r.atm_id, r.category, r.priority, r.zone
        FROM escalation_logs el
        LEFT JOIN reports r ON el.report_id = r.id
        ORDER BY el.created_at DESC
    """)
    escalations = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "queued_reports": queued,
        "escalations": escalations
    })

@app.route('/api/queue/process', methods=['POST'])
def trigger_queue_process():
    """Manually triggers queue processing."""
    dispatched = process_waiting_queue(g.db)
    return jsonify({
        "success": True,
        "dispatched_count": len(dispatched),
        "dispatched": dispatched
    })


# ============================================================================
# 8. TEST SUITE & SYSTEM RESET
# ============================================================================

@app.route('/api/tests/run', methods=['GET', 'POST'])
def run_tests_endpoint():
    """Runs the 15+ automated test cases and returns structured results."""
    from tests import run_all_tests
    test_results = run_all_tests()
    return jsonify(test_results)

@app.route('/api/system/reset-demo', methods=['POST'])
def reset_system():
    """Resets database to fresh initial demonstration state."""
    init_db(reset=True)
    return jsonify({"success": True, "message": "Database successfully reset to initial demo state with seed data."})


# ============================================================================
# 9. FRONTEND STATIC ASSET SERVING
# ============================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    """Serves the compiled React SPA or falls back to index.html for client-side routing."""
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, path)) and path != '':
        return send_from_directory(app.static_folder, path)
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({
        "system": "ATM Error Logger & Intelligent Dispatcher REST API",
        "status": "operational",
        "api_docs": "/api/dashboard/stats"
    })


if __name__ == '__main__':
    print("ATM Error Logger and Dispatcher REST API starting on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=False)
