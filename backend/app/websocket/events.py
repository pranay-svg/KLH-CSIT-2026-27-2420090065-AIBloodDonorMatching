"""
Adaptation Event Types and Builders.

Defines standardized schemas for real-time WebSocket adaptation events
emitted by the AI-Adaptive Blood Donor Matching backend.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from enum import Enum


class EventType(str, Enum):
    DONOR_STATUS_CHANGED = "DONOR_STATUS_CHANGED"
    DONOR_LOCATION_CHANGED = "DONOR_LOCATION_CHANGED"
    EMERGENCY_URGENCY_CHANGED = "EMERGENCY_URGENCY_CHANGED"
    DONOR_RESPONSE_RECEIVED = "DONOR_RESPONSE_RECEIVED"
    MATCHING_RECALCULATED = "MATCHING_RECALCULATED"


def create_donor_status_event(
    donor_id: str,
    donor_name: str,
    is_available: Optional[bool] = None,
    is_eligible: Optional[bool] = None,
    extra_changes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Builds a DONOR_STATUS_CHANGED event payload."""
    changes = {}
    if is_available is not None:
        changes["is_available"] = is_available
    if is_eligible is not None:
        changes["is_eligible"] = is_eligible
    if extra_changes:
        changes.update(extra_changes)

    return {
        "event_type": EventType.DONOR_STATUS_CHANGED.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "donor_id": donor_id,
        "donor_name": donor_name,
        "changes": changes,
    }


def create_donor_location_event(
    donor_id: str,
    donor_name: str,
    latitude: float,
    longitude: float,
    address: Optional[str] = None
) -> Dict[str, Any]:
    """Builds a DONOR_LOCATION_CHANGED event payload."""
    changes = {
        "latitude": latitude,
        "longitude": longitude,
    }
    if address:
        changes["address"] = address

    return {
        "event_type": EventType.DONOR_LOCATION_CHANGED.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "donor_id": donor_id,
        "donor_name": donor_name,
        "latitude": latitude,
        "longitude": longitude,
        "changes": changes,
    }


def create_emergency_urgency_event(
    emergency_id: str,
    old_emergency_level: str,
    new_emergency_level: str,
    new_weights: Dict[str, float],
    hospital_name: Optional[str] = None
) -> Dict[str, Any]:
    """Builds an EMERGENCY_URGENCY_CHANGED event payload."""
    return {
        "event_type": EventType.EMERGENCY_URGENCY_CHANGED.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "emergency_id": emergency_id,
        "old_emergency_level": old_emergency_level,
        "new_emergency_level": new_emergency_level,
        "new_weights": new_weights,
        "hospital_name": hospital_name,
    }


def create_donor_response_event(
    donor_id: str,
    emergency_id: str,
    response: str,
    donor_name: Optional[str] = None,
    eta_mins: Optional[float] = None
) -> Dict[str, Any]:
    """Builds a DONOR_RESPONSE_RECEIVED event payload."""
    return {
        "event_type": EventType.DONOR_RESPONSE_RECEIVED.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "donor_id": donor_id,
        "donor_name": donor_name or "Anonymous",
        "emergency_id": emergency_id,
        "response": response,
        "eta_mins": eta_mins,
        "changes": {
            "status": response
        }
    }


def create_matching_recalculated_event(
    emergency_id: str,
    emergency_level: str,
    patient_blood_group: str,
    units_needed: int,
    matched_donors_count: int,
    adaptation_weights: Dict[str, float],
    ranked_matches: List[Dict[str, Any]],
    hospital_name: Optional[str] = None
) -> Dict[str, Any]:
    """Builds a MATCHING_RECALCULATED event payload containing updated donor rankings."""
    return {
        "event_type": EventType.MATCHING_RECALCULATED.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "emergency_id": emergency_id,
        "emergency_level": emergency_level,
        "patient_blood_group": patient_blood_group,
        "units_needed": units_needed,
        "matched_donors_count": matched_donors_count,
        "adaptation_weights": adaptation_weights,
        "ranked_matches": ranked_matches,
        "hospital_name": hospital_name,
    }
