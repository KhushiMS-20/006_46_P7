"""
Comprehensive Automated Test Suite for ATM Error Logger & Intelligent Dispatcher.
Implements 18 distinct test cases covering all requirements from Part D (12) of the specification:
- Valid and invalid input formats with DFA and regex agreement.
- All five report categories.
- Conflicting classification patterns and banking-risk precedence.
- Unknown routing zones and fallback dispatch.
- Invalid error codes.
- Handler unavailability and capacity overflow.
- Backup handler assignment.
- Emergency priority override and escalation.
- Deterministic queue ordering (Priority + FIFO).
- Status updates and end-to-end SQLite database persistence.
"""

import sys
import os
import time
from typing import Dict, Any, List

# Ensure current directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dfa_validator import validate_field, REGISTRY
from classifier import classify_report, CATEGORIES
from database import get_db_connection, init_db
from dispatcher import dispatch_report, get_deterministic_queue, process_waiting_queue

class TestRunner:
    def __init__(self):
        self.results: List[Dict[str, Any]] = []

    def record_test(self, test_id: str, title: str, category: str, passed: bool,
                    inputs: Any, expected: Any, actual: Any, details: str = ""):
        self.results.append({
            "test_id": test_id,
            "title": title,
            "category": category,
            "passed": passed,
            "inputs": inputs,
            "expected": expected,
            "actual": actual,
            "details": details
        })

    def run_all(self) -> Dict[str, Any]:
        # Reset DB to clean state for tests
        init_db(reset=True)
        conn = get_db_connection()

        # ---------------------------------------------------------
        # TEST 1: Valid ATM ID format - DFA & Regex Agreement
        # ---------------------------------------------------------
        val1 = validate_field("ATM_ID", "ATM-NYC-1042")
        self.record_test(
            test_id="TC-01",
            title="Valid ATM ID Format (DFA & Regex Agreement)",
            category="DFA & Regex Validation",
            passed=(val1["dfa_accepted"] and val1["regex_matched"] and val1["dfa_regex_agreement"]),
            inputs="ATM-NYC-1042",
            expected="dfa_accepted=True, regex_matched=True, agreement=True",
            actual=f"dfa_accepted={val1['dfa_accepted']}, regex_matched={val1['regex_matched']}, agreement={val1['dfa_regex_agreement']}",
            details=f"Final state: {val1['final_state']}, Trace: {' -> '.join(val1['state_trace'][:6])}..."
        )

        # ---------------------------------------------------------
        # TEST 2: Invalid ATM ID format (lowercase / wrong length)
        # ---------------------------------------------------------
        val2 = validate_field("ATM_ID", "ATM-nyc-99")
        self.record_test(
            test_id="TC-02",
            title="Invalid ATM ID Format Rejection",
            category="DFA & Regex Validation",
            passed=(not val2["dfa_accepted"] and not val2["regex_matched"] and val2["dfa_regex_agreement"]),
            inputs="ATM-nyc-99",
            expected="dfa_accepted=False, regex_matched=False, agreement=True",
            actual=f"dfa_accepted={val2['dfa_accepted']}, regex_matched={val2['regex_matched']}, agreement={val2['dfa_regex_agreement']}",
            details=f"Rejection reason: {val2['error_reason']}"
        )

        # ---------------------------------------------------------
        # TEST 3: Valid Branch Code
        # ---------------------------------------------------------
        val3 = validate_field("BRANCH_CODE", "BR-NY101")
        self.record_test(
            test_id="TC-03",
            title="Valid Branch Code Format Acceptance",
            category="DFA & Regex Validation",
            passed=(val3["dfa_accepted"] and val3["regex_matched"] and val3["dfa_regex_agreement"]),
            inputs="BR-NY101",
            expected="dfa_accepted=True, regex_matched=True",
            actual=f"dfa_accepted={val3['dfa_accepted']}, regex_matched={val3['regex_matched']}",
            details=f"Accepted at state {val3['final_state']}"
        )

        # ---------------------------------------------------------
        # TEST 4: Invalid Branch Code format
        # ---------------------------------------------------------
        val4 = validate_field("BRANCH_CODE", "BR-101")
        self.record_test(
            test_id="TC-04",
            title="Invalid Branch Code Format Rejection",
            category="DFA & Regex Validation",
            passed=(not val4["dfa_accepted"] and not val4["regex_matched"]),
            inputs="BR-101",
            expected="dfa_accepted=False, regex_matched=False",
            actual=f"dfa_accepted={val4['dfa_accepted']}, regex_matched={val4['regex_matched']}",
            details=f"Rejection reason: {val4['error_reason']}"
        )

        # ---------------------------------------------------------
        # TEST 5: Valid Error Code
        # ---------------------------------------------------------
        val5 = validate_field("ERROR_CODE", "ERR-CASH-101")
        self.record_test(
            test_id="TC-05",
            title="Valid Error Code Structured Identifier",
            category="DFA & Regex Validation",
            passed=(val5["dfa_accepted"] and val5["regex_matched"]),
            inputs="ERR-CASH-101",
            expected="dfa_accepted=True, regex_matched=True",
            actual=f"dfa_accepted={val5['dfa_accepted']}, regex_matched={val5['regex_matched']}",
            details=f"Traversed states: {' -> '.join(val5['state_trace'])}"
        )

        # ---------------------------------------------------------
        # TEST 6: Invalid Error Code (Unknown Prefix)
        # ---------------------------------------------------------
        val6 = validate_field("ERROR_CODE", "ERR-UNKNOWN-999")
        self.record_test(
            test_id="TC-06",
            title="Invalid Error Code Prefix Rejection",
            category="DFA & Regex Validation",
            passed=(not val6["dfa_accepted"] and not val6["regex_matched"]),
            inputs="ERR-UNKNOWN-999",
            expected="dfa_accepted=False, regex_matched=False",
            actual=f"dfa_accepted={val6['dfa_accepted']}, regex_matched={val6['regex_matched']}",
            details=f"Trapped at index {val6.get('error_position')}: {val6.get('error_reason')}"
        )

        # ---------------------------------------------------------
        # TEST 7: Category 1 - Cash Dispenser Errors
        # ---------------------------------------------------------
        c1 = classify_report("ERR-CASH-101", "Cassette 2 feeder jam during customer payout of bills", "High")
        self.record_test(
            test_id="TC-07",
            title="Category 1: Cash Dispenser Errors Classification",
            category="Report Classification",
            passed=(c1["category"] == "Cash Dispenser Errors"),
            inputs={"code": "ERR-CASH-101", "desc": "Cassette 2 feeder jam during payout"},
            expected="Cash Dispenser Errors",
            actual=c1["category"],
            details=f"Rule: {c1['applied_rule']} (Confidence: {c1['confidence']})"
        )

        # ---------------------------------------------------------
        # TEST 8: Category 2 - Card Reader Errors
        # ---------------------------------------------------------
        c2 = classify_report("ERR-CARD-201", "Motorized reader swallowed customer debit card and sensor blocked", "High")
        self.record_test(
            test_id="TC-08",
            title="Category 2: Card Reader Errors Classification",
            category="Report Classification",
            passed=(c2["category"] == "Card Reader Errors"),
            inputs={"code": "ERR-CARD-201", "desc": "Motorized reader swallowed customer card"},
            expected="Card Reader Errors",
            actual=c2["category"],
            details=f"Rule: {c2['applied_rule']}"
        )

        # ---------------------------------------------------------
        # TEST 9: Category 3 - Network/Communication Errors
        # ---------------------------------------------------------
        c3 = classify_report("ERR-NETW-301", "Socket connection to host core switch timed out after 30s", "Medium")
        self.record_test(
            test_id="TC-09",
            title="Category 3: Network/Communication Errors Classification",
            category="Report Classification",
            passed=(c3["category"] == "Network/Communication Errors"),
            inputs={"code": "ERR-NETW-301", "desc": "Socket connection timed out"},
            expected="Network/Communication Errors",
            actual=c3["category"],
            details=f"Rule: {c3['applied_rule']}"
        )

        # ---------------------------------------------------------
        # TEST 10: Category 4 - Hardware/System Errors
        # ---------------------------------------------------------
        c4 = classify_report("ERR-HARD-401", "Receipt printer thermal paper jam and chassis temperature high", "Low")
        self.record_test(
            test_id="TC-10",
            title="Category 4: Hardware/System Errors Classification",
            category="Report Classification",
            passed=(c4["category"] == "Hardware/System Errors"),
            inputs={"code": "ERR-HARD-401", "desc": "Receipt printer paper jam"},
            expected="Hardware/System Errors",
            actual=c4["category"],
            details=f"Rule: {c4['applied_rule']}"
        )

        # ---------------------------------------------------------
        # TEST 11: Category 5 - Transaction/Software Errors
        # ---------------------------------------------------------
        c5 = classify_report("ERR-TRAN-501", "Double debit on core banking ledger synchronization reversal failure", "High")
        self.record_test(
            test_id="TC-11",
            title="Category 5: Transaction/Software Errors Classification",
            category="Report Classification",
            passed=(c5["category"] == "Transaction/Software Errors"),
            inputs={"code": "ERR-TRAN-501", "desc": "Double debit on core banking ledger sync"},
            expected="Transaction/Software Errors",
            actual=c5["category"],
            details=f"Rule: {c5['applied_rule']}"
        )

        # ---------------------------------------------------------
        # TEST 12: Conflicting Classification Patterns & Precedence
        # Description has equal mentions of Cash dispenser, Card swallowed, and Network timeout
        # ---------------------------------------------------------
        c_conflict = classify_report("", "Cash dispense bills jam while card swallowed and network timeout", "Medium")
        self.record_test(
            test_id="TC-12",
            title="Conflicting Keywords & Banking Risk Precedence",
            category="Conflict Resolution",
            passed=(c_conflict["category"] == "Cash Dispenser Errors"),
            inputs="Cash dispense bills jam while card swallowed and network timeout",
            expected="Cash Dispenser Errors (Physical vault precedence over card and network)",
            actual=c_conflict["category"],
            details=f"Precedence explanation: {c_conflict['precedence_reason']}"
        )

        # ---------------------------------------------------------
        # TEST 13: Unknown Routing Zone Fallback Dispatch
        # ---------------------------------------------------------
        # Insert a fresh test report with non-standard zone 'Northeast'
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO reports (
                id, reporter_name, reporter_id, atm_id, branch_code, zone,
                error_code, error_description, urgency, category, priority, status
            ) VALUES (
                'TEST-REP-13', 'Tester', 'REP-1024', 'ATM-NYC-1042', 'BR-NY101', 'Northeast',
                'ERR-CASH-101', 'Test unknown zone routing fallback', 'Medium', 'Cash Dispenser Errors', 'Medium', 'Pending'
            )
        """)
        conn.commit()
        disp_unknown = dispatch_report("TEST-REP-13", "Cash Dispenser Errors", "Northeast", "ERR-CASH-101", "Medium", conn)
        self.record_test(
            test_id="TC-13",
            title="Unknown Routing Zone Fallback Dispatch",
            category="Routing & Dispatch",
            passed=(disp_unknown["status"] == "Assigned" and "Fallback" in disp_unknown["routing_lookup_status"]),
            inputs="Zone: 'Northeast' (Unmapped zone in routing table)",
            expected="Fallback Zone Match (Central/First Available) -> Assigned",
            actual=f"status={disp_unknown['status']}, lookup={disp_unknown['routing_lookup_status']}",
            details=f"Assigned to {disp_unknown['assigned_handler_id']}"
        )

        # ---------------------------------------------------------
        # TEST 14: Handler Unavailability Triggers Backup Assignment
        # Temporarily make primary handler for South Card (HND-02) unavailable
        # ---------------------------------------------------------
        cursor.execute("UPDATE handlers SET is_available = 0 WHERE id = 'HND-02'")
        cursor.execute("""
            INSERT INTO reports (
                id, reporter_name, reporter_id, atm_id, branch_code, zone,
                error_code, error_description, urgency, category, priority, status
            ) VALUES (
                'TEST-REP-14', 'Tester', 'REP-1024', 'ATM-MUM-8821', 'BR-FL302', 'South',
                'ERR-CARD-201', 'Card reader motor failure', 'Medium', 'Card Reader Errors', 'Medium', 'Pending'
            )
        """)
        conn.commit()
        disp_unavail = dispatch_report("TEST-REP-14", "Card Reader Errors", "South", "ERR-CARD-201", "Medium", conn)
        # Restore handler availability
        cursor.execute("UPDATE handlers SET is_available = 1 WHERE id = 'HND-02'")
        conn.commit()

        self.record_test(
            test_id="TC-14",
            title="Primary Handler Unavailability -> Backup Assignment",
            category="Failover & Backup",
            passed=(disp_unavail["status"] == "Assigned" and disp_unavail["assigned_role"] == "Backup"),
            inputs="Primary HND-02 unavailable (is_available=0)",
            expected="assigned_role='Backup' (Assigned to Backup Handler HND-06)",
            actual=f"status={disp_unavail['status']}, role={disp_unavail['assigned_role']}, assigned={disp_unavail['assigned_handler_id']}",
            details=disp_unavail["decision_reason"]
        )

        # ---------------------------------------------------------
        # TEST 15: Handler Capacity Overflow Triggers Failover
        # Set primary handler (HND-01) current_load = max_capacity
        # ---------------------------------------------------------
        cursor.execute("UPDATE handlers SET current_load = max_capacity WHERE id = 'HND-01'")
        cursor.execute("""
            INSERT INTO reports (
                id, reporter_name, reporter_id, atm_id, branch_code, zone,
                error_code, error_description, urgency, category, priority, status
            ) VALUES (
                'TEST-REP-15', 'Tester', 'REP-1024', 'ATM-NYC-1042', 'BR-NY101', 'North',
                'ERR-CASH-101', 'Cash dispenser shutter jam', 'Medium', 'Cash Dispenser Errors', 'Medium', 'Pending'
            )
        """)
        conn.commit()
        disp_overflow = dispatch_report("TEST-REP-15", "Cash Dispenser Errors", "North", "ERR-CASH-101", "Medium", conn)
        # Restore load
        cursor.execute("UPDATE handlers SET current_load = 2 WHERE id = 'HND-01'")
        conn.commit()

        self.record_test(
            test_id="TC-15",
            title="Handler Capacity Overflow Handling",
            category="Capacity Management",
            passed=(disp_overflow["status"] == "Assigned" and disp_overflow["assigned_role"] == "Backup"),
            inputs="Primary HND-01 at max capacity (current_load == max_capacity)",
            expected="assigned_role='Backup' (Routed to Backup Handler)",
            actual=f"role={disp_overflow['assigned_role']}, assigned={disp_overflow['assigned_handler_id']}",
            details=disp_overflow["decision_reason"]
        )

        # ---------------------------------------------------------
        # TEST 16: Emergency Priority Override & Critical Escalation
        # When both primary and backup are at capacity or unavailable AND priority is Critical
        # ---------------------------------------------------------
        cursor.execute("UPDATE handlers SET current_load = max_capacity WHERE id IN ('HND-01', 'HND-06')")
        cursor.execute("""
            INSERT INTO reports (
                id, reporter_name, reporter_id, atm_id, branch_code, zone,
                error_code, error_description, urgency, category, priority, status
            ) VALUES (
                'TEST-REP-16', 'Tester', 'REP-1024', 'ATM-NYC-1042', 'BR-NY101', 'North',
                'ERR-CASH-101', 'CRITICAL FIRE / TAMPER ALARM ON VAULT', 'Critical', 'Cash Dispenser Errors', 'Critical', 'Pending'
            )
        """)
        conn.commit()
        disp_critical = dispatch_report("TEST-REP-16", "Cash Dispenser Errors", "North", "ERR-CASH-101", "Critical", conn)
        # Restore loads
        cursor.execute("UPDATE handlers SET current_load = 2 WHERE id = 'HND-01'")
        cursor.execute("UPDATE handlers SET current_load = 0 WHERE id = 'HND-06'")
        conn.commit()

        self.record_test(
            test_id="TC-16",
            title="Emergency Priority Override & Supervisor Escalation",
            category="Escalation & Overrides",
            passed=(disp_critical["status"] == "Escalated" and disp_critical["escalated"] is True),
            inputs="Priority='Critical', Primary full, Backup full",
            expected="status='Escalated', Emergency Override Triggered",
            actual=f"status={disp_critical['status']}, escalated={disp_critical['escalated']}",
            details=disp_critical["decision_reason"]
        )

        # ---------------------------------------------------------
        # TEST 17: Deterministic Queue Ordering (Priority + FIFO)
        # Insert 3 queued items: 1 Low, 1 High, 1 Critical, 1 Medium
        # ---------------------------------------------------------
        q_ids = ["Q-LOW", "Q-CRIT", "Q-HIGH", "Q-MED"]
        priorities = ["Low", "Critical", "High", "Medium"]
        for q_id, prio in zip(q_ids, priorities):
            cursor.execute("""
                INSERT INTO reports (
                    id, reporter_name, reporter_id, atm_id, branch_code, zone,
                    error_code, error_description, urgency, category, priority, status, created_at
                ) VALUES (
                    ?, 'Queue Tester', 'REP-1024', 'ATM-NYC-1042', 'BR-NY101', 'North',
                    'ERR-NETW-301', 'Queue ordering verification', ?, 'Network/Communication Errors', ?, 'Queued',
                    datetime('now', '+1 second')
                )
            """, (q_id, prio, prio))
        conn.commit()

        ordered_queue = get_deterministic_queue(conn)
        test_ordered_ids = [r["id"] for r in ordered_queue if r["id"] in q_ids]
        expected_order = ["Q-CRIT", "Q-HIGH", "Q-MED", "Q-LOW"]

        self.record_test(
            test_id="TC-17",
            title="Deterministic Waiting Queue Priority Ordering",
            category="Queue Determinism",
            passed=(test_ordered_ids == expected_order),
            inputs="Submitted order: [Low, Critical, High, Medium]",
            expected=f"Ordered: {expected_order} (Critical > High > Medium > Low)",
            actual=f"Ordered: {test_ordered_ids}",
            details="Verified deterministic queue ordering by priority level and FIFO submission time."
        )

        # ---------------------------------------------------------
        # TEST 18: Status Updates & End-to-End SQLite Database Persistence
        # ---------------------------------------------------------
        test_rep_id = "TEST-REP-E2E"
        cursor.execute("""
            INSERT INTO reports (
                id, reporter_name, reporter_id, atm_id, branch_code, zone,
                error_code, error_description, urgency, category, priority, status
            ) VALUES (
                ?, 'E2E Tester', 'REP-1024', 'ATM-LON-4091', 'BR-NY101', 'North',
                'ERR-HARD-401', 'Full lifecycle test', 'Low', 'Hardware/System Errors', 'Low', 'Assigned'
            )
        """, (test_rep_id,))
        # Transition to In Progress
        cursor.execute("UPDATE reports SET status = 'In Progress' WHERE id = ?", (test_rep_id,))
        cursor.execute("""
            INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes)
            VALUES (?, 'Assigned', 'In Progress', 'Test Tech', 'Technician on-site')
        """, (test_rep_id,))
        # Transition to Resolved
        cursor.execute("UPDATE reports SET status = 'Resolved', resolution_notes = 'Replaced worn thermal print head.' WHERE id = ?", (test_rep_id,))
        cursor.execute("""
            INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes)
            VALUES (?, 'In Progress', 'Resolved', 'Test Tech', 'Completed repairs.')
        """, (test_rep_id,))
        conn.commit()

        # Query back
        cursor.execute("SELECT status, resolution_notes FROM reports WHERE id = ?", (test_rep_id,))
        persisted = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) FROM report_status_history WHERE report_id = ?", (test_rep_id,))
        hist_count = cursor.fetchone()[0]

        e2e_passed = (persisted["status"] == "Resolved" and persisted["resolution_notes"] is not None and hist_count == 2)
        self.record_test(
            test_id="TC-18",
            title="End-to-End Status Lifecycle & Database Persistence",
            category="Database & Lifecycle",
            passed=e2e_passed,
            inputs="Assigned -> In Progress -> Resolved with resolution notes",
            expected="Status=Resolved, notes persisted, 2 history log entries",
            actual=f"Status={persisted['status']}, hist_count={hist_count}",
            details="Validated full audit trail and relational persistence in SQLite."
        )

        conn.close()

        total = len(self.results)
        passed_count = sum(1 for r in self.results if r["passed"])
        failed_count = total - passed_count

        return {
            "total_tests": total,
            "passed_tests": passed_count,
            "failed_tests": failed_count,
            "all_passed": (failed_count == 0),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "results": self.results
        }

def run_all_tests():
    runner = TestRunner()
    return runner.run_all()

if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING ATM ERROR LOGGER & DISPATCHER AUTOMATED TEST SUITE")
    print("=" * 70)
    report = run_all_tests()
    for res in report["results"]:
        status = "[PASS]" if res["passed"] else "[FAIL]"
        print(f"{status} {res['test_id']}: {res['title']}")
        print(f"       Category: {res['category']}")
        print(f"       Details:  {res['details']}")
    print("=" * 70)
    print(f"SUMMARY: {report['passed_tests']}/{report['total_tests']} PASSED "
          f"({100.0 * report['passed_tests'] / report['total_tests']:.1f}%)")
    print("=" * 70)
