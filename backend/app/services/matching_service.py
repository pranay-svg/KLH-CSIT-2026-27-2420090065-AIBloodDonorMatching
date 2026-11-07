"""
Adaptive Matching & Recalculation Service.

Provides reusable orchestration for:
- Identifying active emergencies (Open, Matched)
- Re-executing the Stage 2 Adaptive MCDM Matching Engine without code duplication
- Formatting and broadcasting MATCHING_RECALCULATED adaptation events
- Resilient broadcasting that never interrupts database operations or REST APIs
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.emergency import EmergencyStatus
from app.services.adaptive_engine import rank_donors_for_emergency
from app.websocket.manager import manager
from app.websocket.events import create_matching_recalculated_event
from app.metrics import MATCHING_RECALCULATIONS_TOTAL

logger = logging.getLogger(__name__)

ACTIVE_STATUS_VALUES = {
    EmergencyStatus.OPEN.value,
    EmergencyStatus.MATCHED.value,
    "Open",
    "Matched",
    "open",
    "matched"
}


async def get_active_emergencies(db=None) -> List[Dict[str, Any]]:
    """
    Retrieves all currently active emergencies.
    Academic definition: Requests with status 'Open' or 'Matched'.
    Works portably across MongoDB and in-memory fallback collections.
    """
    db = db or get_db()
    if not db:
        return []

    all_emergencies = await db.emergencies.find({})
    active = [
        e for e in all_emergencies
        if str(e.get("status", "")).strip() in ACTIVE_STATUS_VALUES
    ]
    return active


async def recalculate_and_broadcast_matching(
    emergency_id: str,
    db=None
) -> Optional[Dict[str, Any]]:
    """
    Executes adaptive matching engine for a specific emergency and broadcasts
    the updated rankings to connected WebSocket clients.

    Key Requirements:
    1. Loads emergency from database.
    2. Executes Stage 2 adaptive matching engine (reuse adaptive_engine.py).
    3. Generates ranked donors.
    4. Broadcasts MATCHING_RECALCULATED event.
    5. Includes the updated rankings.
    6. Never fails or raises an error if WebSocket clients are 0 or disconnected.
    """
    db = db or get_db()
    if not db:
        logger.warning("Database unavailable during matching recalculation.")
        return None

    # 1. Load emergency
    emergency = await db.emergencies.find_one({"id": emergency_id})
    if not emergency:
        emergency = await db.emergencies.find_one({"_id": emergency_id})
    if not emergency:
        logger.warning(f"Cannot recalculate matching: Emergency '{emergency_id}' not found.")
        return None

    # 2. Load candidate donor pool
    donors = await db.donors.find({})

    # 3. Execute Stage 2 adaptive matching engine
    match_response = rank_donors_for_emergency(emergency=emergency, donors=donors)

    # 4. Convert ranked results to JSON-serializable dictionaries
    ranked_dicts = [m.model_dump() for m in match_response.ranked_matches]

    # 5. Build standard MATCHING_RECALCULATED adaptation event payload
    event_payload = create_matching_recalculated_event(
        emergency_id=emergency_id,
        emergency_level=match_response.emergency_level,
        patient_blood_group=match_response.patient_blood_group,
        units_needed=match_response.units_needed,
        matched_donors_count=match_response.matched_donors_count,
        adaptation_weights=match_response.adaptation_weights,
        ranked_matches=ranked_dicts,
        hospital_name=match_response.hospital_name
    )

    # 6. Resilient broadcast to connected clients
    try:
        emg_level = match_response.emergency_level or "Unknown"
        MATCHING_RECALCULATIONS_TOTAL.labels(emergency_level=emg_level).inc()
        await manager.broadcast(event_payload)
        logger.info(
            f"Broadcasted MATCHING_RECALCULATED for emergency '{emergency_id}' "
            f"({match_response.matched_donors_count} donors ranked under {match_response.emergency_level} weights)."
        )
    except Exception as exc:
        logger.warning(f"Non-fatal error during WebSocket broadcast: {exc}")

    return event_payload


async def recalculate_for_active_emergencies(
    db=None,
    exclude_emergency_ids: Optional[set] = None
) -> List[Dict[str, Any]]:
    """
    Recalculates matching for all active emergencies and broadcasts events.
    Ensures each active emergency is recalculated exactly once without duplicates.
    """
    db = db or get_db()
    active_emergencies = await get_active_emergencies(db)
    if not active_emergencies:
        logger.debug("No active emergencies found for matching recalculation.")
        return []

    exclude = exclude_emergency_ids or set()
    processed_ids = set()
    results = []

    for emg in active_emergencies:
        emg_id = str(emg.get("id") or emg.get("_id"))
        if emg_id in exclude or emg_id in processed_ids:
            continue
        processed_ids.add(emg_id)
        event = await recalculate_and_broadcast_matching(emg_id, db=db)
        if event:
            results.append(event)

    return results
