"""
Rule-Based 5-Category Classification & Priority Evaluation Engine.
Categorizes ATM errors into exactly five predefined categories:
1. Cash Dispenser Errors
2. Card Reader Errors
3. Network/Communication Errors
4. Hardware/System Errors
5. Transaction/Software Errors

Includes deterministic conflict resolution and banking-risk precedence.
"""

import re
from typing import Dict, Any, List, Tuple

CATEGORIES = [
    "Cash Dispenser Errors",
    "Card Reader Errors",
    "Network/Communication Errors",
    "Hardware/System Errors",
    "Transaction/Software Errors"
]

# Explicit Banking-Risk Hierarchy for Tie-Breaking & Conflict Resolution
# Higher index = higher priority in tie break
CATEGORY_PRECEDENCE_ORDER = [
    "Transaction/Software Errors",   # Rank 1 (Lowest tie priority)
    "Network/Communication Errors",  # Rank 2
    "Hardware/System Errors",        # Rank 3
    "Card Reader Errors",            # Rank 4
    "Cash Dispenser Errors"          # Rank 5 (Highest tie priority: physical asset & vault risk)
]

# Error code prefix mapping
ERROR_CODE_CATEGORY_MAP = {
    "ERR-CASH": "Cash Dispenser Errors",
    "ERR-CARD": "Card Reader Errors",
    "ERR-NETW": "Network/Communication Errors",
    "ERR-HARD": "Hardware/System Errors",
    "ERR-TRAN": "Transaction/Software Errors",
}

# Domain keyword dictionaries with relevance weights
CATEGORY_KEYWORDS: Dict[str, Dict[str, int]] = {
    "Cash Dispenser Errors": {
        "cash": 3, "dispense": 3, "dispenser": 3, "bill": 2, "note": 2, "currency": 2,
        "cassette": 3, "shutter": 3, "purge": 2, "jam": 2, "payout": 3, "vault": 2,
        "reject bin": 3, "feed": 2, "sensor jam": 2, "low cash": 2, "empty cassette": 3
    },
    "Card Reader Errors": {
        "card": 3, "reader": 3, "swallowed": 3, "retained": 3, "trapped card": 4,
        "skimmer": 4, "chip": 2, "magnetic": 2, "stripe": 2, "dip": 2, "motorized": 2,
        "emv": 3, "rfid": 2, "nfc": 2, "pinpad": 2, "card jam": 3, "card read failure": 3
    },
    "Network/Communication Errors": {
        "network": 3, "communication": 3, "timeout": 3, "offline": 3, "disconnect": 3,
        "ping": 2, "packet": 2, "socket": 2, "ethernet": 2, "router": 2, "switch": 2,
        "ip": 2, "dns": 2, "lan": 2, "vpn": 3, "handshake": 2, "gateway": 2, "host connection": 3
    },
    "Hardware/System Errors": {
        "hardware": 3, "printer": 3, "receipt": 3, "thermal": 2, "paper jam": 3,
        "screen": 3, "touchscreen": 3, "display": 2, "power": 3, "ups": 3, "reboot": 2,
        "fan": 2, "temperature": 2, "overheating": 3, "chassis": 2, "tamper sensor": 4,
        "camera": 2, "alarm": 3, "vandalism": 4, "pc freeze": 3
    },
    "Transaction/Software Errors": {
        "transaction": 3, "software": 3, "decline": 2, "reversal": 3, "balance": 2,
        "ledger": 3, "double debit": 4, "sync": 2, "core banking": 3, "auth": 2,
        "database": 2, "exception": 2, "crash": 3, "firmware": 2, "app crash": 3,
        "api error": 3, "account locked": 2
    }
}

# Critical keywords that trigger automatic Priority Escalation
CRITICAL_TRIGGERS = [
    "skimmer", "tamper", "alarm", "fire", "smoke", "vandalism", 
    "swallowed", "cash jam", "empty", "offline", "double debit"
]

def classify_report(error_code: str, description: str, urgency: str = "Medium") -> Dict[str, Any]:
    """
    Classify report into exactly one of 5 categories and determine its priority.
    Returns detected category, applied rule, scores, confidence, and computed priority.
    """
    error_code_clean = (error_code or "").strip().upper()
    desc_clean = (description or "").lower()
    urgency_clean = (urgency or "Medium").capitalize()

    scores: Dict[str, int] = {cat: 0 for cat in CATEGORIES}
    matching_keywords: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}

    # Step 1: Check Error Code Prefix (Rule 1)
    code_matched_category = None
    for prefix, cat in ERROR_CODE_CATEGORY_MAP.items():
        if error_code_clean.startswith(prefix):
            code_matched_category = cat
            break

    # Step 2: Score Keywords in Description (Rule 2)
    for cat, kw_dict in CATEGORY_KEYWORDS.items():
        for kw, weight in kw_dict.items():
            # Use word boundary or simple substring check
            pattern = r'\b' + re.escape(kw) + r'\b'
            matches = len(re.findall(pattern, desc_clean))
            if matches > 0:
                scores[cat] += matches * weight
                matching_keywords[cat].append(f"{kw} (+{matches * weight})")

    # Step 3: Determine Final Category & Resolve Conflicts
    detected_category = None
    applied_rule = ""
    precedence_reason = ""
    confidence = 0.85

    # Check if there are nonzero keyword scores
    max_score = max(scores.values())
    top_scoring_cats = [cat for cat, sc in scores.items() if sc == max_score and sc > 0]

    if code_matched_category:
        # Code matched
        if not top_scoring_cats or code_matched_category in top_scoring_cats:
            detected_category = code_matched_category
            applied_rule = "Rule 1: Exact Error Code Prefix Match"
            precedence_reason = f"Error code prefix '{error_code_clean[:8]}' directly specifies category."
            confidence = 0.98
        else:
            # Conflict between error code and description keywords
            # Error code takes precedence unless description strongly indicates a physical emergency
            detected_category = code_matched_category
            applied_rule = "Rule 1.1: Error Code Precedence with Conflict Log"
            conflict_cats = ", ".join(top_scoring_cats)
            precedence_reason = (
                f"Error code '{error_code_clean}' dictates '{code_matched_category}'. "
                f"Keywords suggested '{conflict_cats}', but authoritative error code overrides description."
            )
            confidence = 0.90
    else:
        # Error code not recognized or generic: Rely on keywords & precedence
        if len(top_scoring_cats) == 1:
            detected_category = top_scoring_cats[0]
            applied_rule = "Rule 2: Keyword Frequency & Semantic Weight"
            precedence_reason = f"Keywords in description uniquely matched with score of {max_score}."
            confidence = min(0.95, 0.65 + (max_score * 0.05))
        elif len(top_scoring_cats) > 1:
            # TIE BREAK / CONFLICT: Apply Banking Risk Precedence Order
            sorted_by_precedence = sorted(
                top_scoring_cats,
                key=lambda c: CATEGORY_PRECEDENCE_ORDER.index(c),
                reverse=True
            )
            detected_category = sorted_by_precedence[0]
            tied_str = ", ".join(top_scoring_cats)
            applied_rule = "Rule 3: Deterministic Banking-Risk Precedence Override"
            precedence_reason = (
                f"Tied scores ({max_score}) between [{tied_str}]. Resolved in favor of '{detected_category}' "
                f"according to banking risk hierarchy: Cash Dispenser > Card Reader > Hardware > Network > Software."
            )
            confidence = 0.82
        else:
            # Fallback
            detected_category = "Hardware/System Errors"
            applied_rule = "Rule 4: Default Fallback Classification"
            precedence_reason = "No authoritative error code or known keywords detected. Assigned to General Hardware/System."
            confidence = 0.50

    # Step 4: Calculate Priority
    # Input Urgency: Low, Medium, High, Critical
    calculated_priority = urgency_clean
    priority_reason = f"Directly derived from input urgency level ({urgency_clean})."

    # Emergency keyword checks for automatic escalation
    critical_matches = [w for w in CRITICAL_TRIGGERS if w in desc_clean]
    if critical_matches and calculated_priority in ["Low", "Medium"]:
        calculated_priority = "High"
        priority_reason = f"Escalated to High due to critical security/operational trigger keywords: {', '.join(critical_matches)}."

    if urgency_clean == "Critical" or "alarm" in critical_matches or "skimmer" in critical_matches:
        calculated_priority = "Critical"
        priority_reason = "Critical Priority: Urgent asset protection / immediate customer impact."

    return {
        "category": detected_category,
        "priority": calculated_priority,
        "applied_rule": applied_rule,
        "precedence_reason": precedence_reason,
        "confidence": round(confidence, 2),
        "scores": scores,
        "matching_keywords": matching_keywords,
        "urgency_input": urgency_clean,
        "priority_reason": priority_reason
    }
