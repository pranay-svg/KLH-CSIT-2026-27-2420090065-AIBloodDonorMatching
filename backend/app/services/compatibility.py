"""
Basic Blood Donor Compatibility Matrix Service.

ACADEMIC DEMONSTRATION NOTICE:
This module implements a standard demonstration ABO/Rh red blood cell matching matrix
for academic research and software demonstration of multi-criteria decision algorithms.
It does NOT make clinical transfusion decisions and must NOT be used in medical care.
Biological cross-matching and clinical compatibility must always be verified by authorized
hospital and laboratory personnel.
"""

import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

# Configurable ABO and Rh Compatibility Matrix
# Maps: recipient_blood_group -> { donor_blood_group: (is_compatible, compatibility_score, explanation) }
# compatibility_score is normalized [0.0 - 1.0]:
#   1.00: Exact match (identical ABO and Rh)
#   0.80 - 0.95: Compatible universal or alternative group
#   0.00: Incompatible
COMPATIBILITY_RULES: Dict[str, Dict[str, Tuple[bool, float, str]]] = {
    "O-": {
        "O-": (True, 1.0, "Exact match (O- to O-)."),
    },
    "O+": {
        "O+": (True, 1.0, "Exact match (O+ to O+)."),
        "O-": (True, 0.85, "Compatible universal red cell donor (O- to O+)."),
    },
    "A-": {
        "A-": (True, 1.0, "Exact match (A- to A-)."),
        "O-": (True, 0.85, "Compatible universal red cell donor (O- to A-)."),
    },
    "A+": {
        "A+": (True, 1.0, "Exact match (A+ to A+)."),
        "A-": (True, 0.90, "Compatible Rh-negative match (A- to A+)."),
        "O+": (True, 0.85, "Compatible universal-type match (O+ to A+)."),
        "O-": (True, 0.80, "Compatible universal red cell donor (O- to A+)."),
    },
    "B-": {
        "B-": (True, 1.0, "Exact match (B- to B-)."),
        "O-": (True, 0.85, "Compatible universal red cell donor (O- to B-)."),
    },
    "B+": {
        "B+": (True, 1.0, "Exact match (B+ to B+)."),
        "B-": (True, 0.90, "Compatible Rh-negative match (B- to B+)."),
        "O+": (True, 0.85, "Compatible universal-type match (O+ to B+)."),
        "O-": (True, 0.80, "Compatible universal red cell donor (O- to B+)."),
    },
    "AB-": {
        "AB-": (True, 1.0, "Exact match (AB- to AB-)."),
        "A-": (True, 0.85, "Compatible alternative donor (A- to AB-)."),
        "B-": (True, 0.85, "Compatible alternative donor (B- to AB-)."),
        "O-": (True, 0.80, "Compatible universal donor (O- to AB-)."),
    },
    "AB+": {
        "AB+": (True, 1.0, "Exact match (AB+ to AB+). Universal recipient."),
        "AB-": (True, 0.95, "Compatible Rh- alternative (AB- to AB+)."),
        "A+": (True, 0.90, "Compatible group A donor (A+ to AB+)."),
        "A-": (True, 0.85, "Compatible group A- donor (A- to AB+)."),
        "B+": (True, 0.90, "Compatible group B donor (B+ to AB+)."),
        "B-": (True, 0.85, "Compatible group B- donor (B- to AB+)."),
        "O+": (True, 0.85, "Compatible group O donor (O+ to AB+)."),
        "O-": (True, 0.80, "Compatible universal red cell donor (O- to AB+)."),
    },
}

SUPPORTED_BLOOD_GROUPS = list(COMPATIBILITY_RULES.keys())


def check_compatibility(
    donor_blood_group: str,
    recipient_blood_group: str
) -> Tuple[bool, float, str]:
    """
    Checks donor and recipient compatibility based on the configured demonstration matrix.

    Returns:
    - compatible (bool): True if donor blood group can be safely received by recipient
    - compatibility_score (float): 0.0 to 1.0 indicating degree of compatibility
    - explanation (str): Human-readable explanation of compatibility status
    """
    d_bg = donor_blood_group.strip().upper()
    r_bg = recipient_blood_group.strip().upper()

    if r_bg not in COMPATIBILITY_RULES:
        return False, 0.0, f"Unsupported recipient blood group: '{r_bg}'. Supported groups: {', '.join(SUPPORTED_BLOOD_GROUPS)}"

    recipient_dict = COMPATIBILITY_RULES[r_bg]

    if d_bg in recipient_dict:
        compatible, score, explanation = recipient_dict[d_bg]
        return compatible, score, explanation
    else:
        return False, 0.0, f"Incompatible: {d_bg} donor blood cannot be accepted by {r_bg} recipient under standard ABO/Rh protocols."
