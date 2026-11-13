"""
DFA and Regex Validation Engine for ATM Error Logger & Dispatcher.
Implements formal Deterministic Finite Automata (Q, Sigma, delta, q0, F)
and provides side-by-side comparison with equivalent Regular Expressions.
"""

import re
from typing import Dict, List, Tuple, Any, Optional

class DFA:
    def __init__(self, name: str, states: List[str], alphabet: List[str], 
                 transitions: Dict[str, Dict[str, str]], start_state: str, 
                 accept_states: List[str], regex_pattern: str, description: str, example: str):
        self.name = name
        self.states = set(states)
        self.alphabet = set(alphabet)
        self.transitions = transitions
        self.start_state = start_state
        self.accept_states = set(accept_states)
        self.regex_pattern = regex_pattern
        self.regex = re.compile(regex_pattern)
        self.description = description
        self.example = example

    def simulate(self, input_str: str) -> Dict[str, Any]:
        """
        Simulate the DFA step-by-step on input_str.
        Returns full trace, final state, and acceptance.
        """
        current_state = self.start_state
        path = [current_state]
        steps = []
        error_pos = None
        error_reason = None

        for index, char in enumerate(input_str):
            state_trans = self.transitions.get(current_state, {})
            next_state = None

            # Check exact char match
            if char in state_trans:
                next_state = state_trans[char]
            # Check character classes
            elif "[A-Z]" in state_trans and char.isupper():
                next_state = state_trans["[A-Z]"]
            elif "[0-9]" in state_trans and char.isdigit():
                next_state = state_trans["[0-9]"]
            elif "[a-zA-Z0-9]" in state_trans and char.isalnum():
                next_state = state_trans["[a-zA-Z0-9]"]

            if next_state is None:
                # Trap / Dead State
                steps.append({
                    "step": index + 1,
                    "char": char,
                    "from_state": current_state,
                    "to_state": "TRAP",
                    "valid": False,
                    "reason": f"No valid transition from '{current_state}' on input '{char}'"
                })
                error_pos = index
                error_reason = f"Invalid character '{char}' at index {index} (state '{current_state}')"
                current_state = "TRAP"
                path.append("TRAP")
                break

            steps.append({
                "step": index + 1,
                "char": char,
                "from_state": current_state,
                "to_state": next_state,
                "valid": True,
                "reason": f"Transitioned '{current_state}' -> '{next_state}' via '{char}'"
            })
            current_state = next_state
            path.append(current_state)

        is_accepted = (current_state in self.accept_states)
        if not is_accepted and error_reason is None:
            if current_state != "TRAP":
                error_reason = f"Input terminated early in non-accepting state '{current_state}'"

        # Regex equivalent check
        regex_match = bool(self.regex.match(input_str)) if input_str else False

        return {
            "identifier_type": self.name,
            "input": input_str,
            "dfa_accepted": is_accepted,
            "final_state": current_state,
            "is_final_state_accepting": current_state in self.accept_states,
            "accept_states": list(self.accept_states),
            "state_trace": path,
            "step_details": steps,
            "error_position": error_pos,
            "error_reason": error_reason,
            "regex_pattern": self.regex_pattern,
            "regex_matched": regex_match,
            "dfa_regex_agreement": (is_accepted == regex_match),
            "description": self.description,
            "example": self.example
        }

    def get_structure(self) -> Dict[str, Any]:
        """Returns the formal 5-tuple structure for UI visualization."""
        transitions_list = []
        for src, dests in self.transitions.items():
            for sym, tgt in dests.items():
                transitions_list.append({"from": src, "symbol": sym, "to": tgt})

        return {
            "name": self.name,
            "states": sorted(list(self.states)),
            "start_state": self.start_state,
            "accept_states": sorted(list(self.accept_states)),
            "transitions": transitions_list,
            "regex_pattern": self.regex_pattern,
            "description": self.description,
            "example": self.example
        }


# ============================================================================
# DFA DEFINITION 1: ATM ID (Format: ATM-[A-Z]{3}-\d{4}) e.g. ATM-NYC-1042
# ============================================================================
atm_id_states = [f"q{i}" for i in range(13)] + ["TRAP"]
atm_id_transitions = {
    "q0": {"A": "q1"},
    "q1": {"T": "q2"},
    "q2": {"M": "q3"},
    "q3": {"-": "q4"},
    "q4": {"[A-Z]": "q5"},
    "q5": {"[A-Z]": "q6"},
    "q6": {"[A-Z]": "q7"},
    "q7": {"-": "q8"},
    "q8": {"[0-9]": "q9"},
    "q9": {"[0-9]": "q10"},
    "q10": {"[0-9]": "q11"},
    "q11": {"[0-9]": "q12"},
    "q12": {} # Terminal accept state, any further character traps
}
atm_id_dfa = DFA(
    name="ATM_ID",
    states=atm_id_states,
    alphabet=[c for c in "ATM-"] + ["[A-Z]", "[0-9]"],
    transitions=atm_id_transitions,
    start_state="q0",
    accept_states=["q12"],
    regex_pattern=r"^ATM-[A-Z]{3}-\d{4}$",
    description="Format: ATM-{3-letter City Code}-{4-digit Unit Number}",
    example="ATM-NYC-1042"
)


# ============================================================================
# DFA DEFINITION 2: Branch Code (Format: BR-[A-Z]{2}\d{3}) e.g. BR-NY101
# ============================================================================
branch_states = [f"s{i}" for i in range(9)] + ["TRAP"]
branch_transitions = {
    "s0": {"B": "s1"},
    "s1": {"R": "s2"},
    "s2": {"-": "s3"},
    "s3": {"[A-Z]": "s4"},
    "s4": {"[A-Z]": "s5"},
    "s5": {"[0-9]": "s6"},
    "s6": {"[0-9]": "s7"},
    "s7": {"[0-9]": "s8"},
    "s8": {}
}
branch_dfa = DFA(
    name="BRANCH_CODE",
    states=branch_states,
    alphabet=["B", "R", "-", "[A-Z]", "[0-9]"],
    transitions=branch_transitions,
    start_state="s0",
    accept_states=["s8"],
    regex_pattern=r"^BR-[A-Z]{2}\d{3}$",
    description="Format: BR-{2-letter Region}{3-digit Branch}",
    example="BR-NY101"
)


# ============================================================================
# DFA DEFINITION 3: Reporter ID (Format: REP-\d{4}) e.g. REP-1024
# ============================================================================
rep_states = [f"r{i}" for i in range(9)] + ["TRAP"]
rep_transitions = {
    "r0": {"R": "r1"},
    "r1": {"E": "r2"},
    "r2": {"P": "r3"},
    "r3": {"-": "r4"},
    "r4": {"[0-9]": "r5"},
    "r5": {"[0-9]": "r6"},
    "r6": {"[0-9]": "r7"},
    "r7": {"[0-9]": "r8"},
    "r8": {}
}
reporter_dfa = DFA(
    name="REPORTER_ID",
    states=rep_states,
    alphabet=["R", "E", "P", "-", "[0-9]"],
    transitions=rep_transitions,
    start_state="r0",
    accept_states=["r8"],
    regex_pattern=r"^REP-\d{4}$",
    description="Format: REP-{4-digit Staff Badge Number}",
    example="REP-1024"
)


# ============================================================================
# DFA DEFINITION 4: Error Code (Format: ERR-(CASH|CARD|NETW|HARD|TRAN)-\d{3})
# e.g. ERR-CASH-101, ERR-NETW-304
# ============================================================================
err_states = [
    "e0", "e1", "e2", "e3", "e4", # ERR-
    # Branch CASH
    "c1", "c2", "c3", "c4",
    # Branch CARD
    "cr1", "cr2", "cr3", "cr4",
    # Branch NETW
    "n1", "n2", "n3", "n4",
    # Branch HARD
    "h1", "h2", "h3", "h4",
    # Branch TRAN
    "t1", "t2", "t3", "t4",
    # Common separator after category
    "e_dash",
    # 3 digits
    "d1", "d2", "d3",
    "TRAP"
]

err_transitions = {
    "e0": {"E": "e1"},
    "e1": {"R": "e2"},
    "e2": {"R": "e3"},
    "e3": {"-": "e4"},
    "e4": {
        "C": "c1",   # CASH or CARD
        "N": "n1",   # NETW
        "H": "h1",   # HARD
        "T": "t1"    # TRAN
    },
    # CASH vs CARD branch
    "c1": {"A": "c2"},
    "c2": {"S": "c3", "R": "cr3"},
    "c3": {"H": "c4"},
    "c4": {"-": "e_dash"},
    "cr3": {"D": "cr4"},
    "cr4": {"-": "e_dash"},

    # NETW branch
    "n1": {"E": "n2"},
    "n2": {"T": "n3"},
    "n3": {"W": "n4"},
    "n4": {"-": "e_dash"},

    # HARD branch
    "h1": {"A": "h2"},
    "h2": {"R": "h3"},
    "h3": {"D": "h4"},
    "h4": {"-": "e_dash"},

    # TRAN branch
    "t1": {"R": "t2"},
    "t2": {"A": "t3"},
    "t3": {"N": "t4"},
    "t4": {"-": "e_dash"},

    # Digits
    "e_dash": {"[0-9]": "d1"},
    "d1": {"[0-9]": "d2"},
    "d2": {"[0-9]": "d3"},
    "d3": {} # Terminal accept state
}

error_code_dfa = DFA(
    name="ERROR_CODE",
    states=err_states,
    alphabet=["E", "R", "-", "C", "A", "S", "H", "D", "N", "E", "T", "W", "O", "[0-9]"],
    transitions=err_transitions,
    start_state="e0",
    accept_states=["d3"],
    regex_pattern=r"^ERR-(CASH|CARD|NETW|HARD|TRAN)-\d{3}$",
    description="Format: ERR-{CASH|CARD|NETW|HARD|TRAN}-{3-digit Code}",
    example="ERR-CASH-101"
)

REGISTRY: Dict[str, DFA] = {
    "ATM_ID": atm_id_dfa,
    "BRANCH_CODE": branch_dfa,
    "REPORTER_ID": reporter_dfa,
    "ERROR_CODE": error_code_dfa
}

def validate_field(field_type: str, value: str) -> Dict[str, Any]:
    """Validate a given field value against its registered DFA and Regex."""
    dfa = REGISTRY.get(field_type)
    if not dfa:
        return {
            "identifier_type": field_type,
            "input": value,
            "dfa_accepted": False,
            "regex_matched": False,
            "dfa_regex_agreement": True,
            "error_reason": f"Unknown field type '{field_type}'"
        }
    return dfa.simulate((value or "").strip().upper())

def validate_all_fields(fields: Dict[str, str]) -> Dict[str, Any]:
    """Validate all fields in a submission dictionary."""
    results = {}
    all_valid = True
    for field_name, value in fields.items():
        if field_name in REGISTRY:
            res = validate_field(field_name, value)
            results[field_name] = res
            if not res["dfa_accepted"]:
                all_valid = False
    return {
        "all_valid": all_valid,
        "fields": results
    }

def get_all_dfa_structures() -> Dict[str, Any]:
    """Return formal representations of all DFAs for UI visualization."""
    return {k: v.get_structure() for k, v in REGISTRY.items()}
