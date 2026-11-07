import logging
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, HTTPException, Query, status

from app.database import get_db
from app.models.emergency import (
    EmergencyRequest,
    EmergencyRequestCreate,
    EmergencyUrgencyUpdate,
    EmergencyStatusUpdate,
    EmergencyLevel,
    EmergencyStatus
)
from app.websocket.manager import manager
from app.websocket.events import create_emergency_urgency_event
from app.services.adaptive_engine import get_weights_for_emergency
from app.services.matching_service import recalculate_and_broadcast_matching
from app.metrics import EMERGENCY_CREATED_TOTAL, EMERGENCY_URGENCY_CHANGES_TOTAL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/emergencies", tags=["Emergency Requests"])


# Default sample emergency for immediate demo convenience
DEFAULT_EMERGENCIES = [
    {
        "id": "emg-demo-001",
        "patient_name": "Ramesh Kulkarni",
        "hospital_name": "Victoria Hospital, Trauma Emergency Ward",
        "required_blood_group": "O+",
        "units_needed": 2,
        "emergency_level": EmergencyLevel.URGENT.value,
        "latitude": 12.9647,
        "longitude": 77.5746,
        "contact_person": "Dr. Ramesh (ER On-Duty)",
        "notes": "Emergency surgery required within 2 hours. Severe blood loss.",
        "status": EmergencyStatus.OPEN.value,
    }
]

async def seed_emergencies_if_empty():
    """Seeds a demo emergency request if none exists."""
    db = get_db()
    count = await db.emergencies.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc)
        docs = []
        for e in DEFAULT_EMERGENCIES:
            item = dict(e)
            item["created_at"] = now
            item["updated_at"] = now
            docs.append(item)
        await db.emergencies.insert_many(docs)

@router.get("", response_model=List[EmergencyRequest])
async def list_emergencies(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Open, Matched, etc.)"),
    emergency_level: Optional[str] = Query(None, description="Filter by level (Routine, Urgent, Critical)"),
    blood_group: Optional[str] = Query(None, description="Filter by required blood group (e.g. O+, A+)"),
):
    """List all emergency requests with optional filtering."""
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter
    if emergency_level:
        query["emergency_level"] = emergency_level
    if blood_group:
        clean_bg = blood_group.replace(" ", "+").strip().upper()
        query["required_blood_group"] = clean_bg

    emergencies = await db.emergencies.find(query)
    for e in emergencies:
        if "_id" in e and "id" not in e:
            e["id"] = str(e["_id"])
    return emergencies

@router.get("/{emergency_id}", response_model=EmergencyRequest)
async def get_emergency(emergency_id: str):
    """Get details of a specific emergency request."""
    db = get_db()
    emg = await db.emergencies.find_one({"id": emergency_id})
    if not emg:
        emg = await db.emergencies.find_one({"_id": emergency_id})
    if not emg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency request with ID '{emergency_id}' not found."
        )
    return emg

@router.post("", response_model=EmergencyRequest, status_code=status.HTTP_201_CREATED)
async def create_emergency(request_in: EmergencyRequestCreate):
    """Create a new emergency blood request from a hospital/blood bank."""
    db = get_db()
    now = datetime.now(timezone.utc)
    new_id = f"emg-{str(uuid.uuid4())[:8]}"

    emg_dict = request_in.model_dump()
    emg_dict["id"] = new_id
    emg_dict["_id"] = new_id
    emg_dict["status"] = EmergencyStatus.OPEN.value
    emg_dict["created_at"] = now
    emg_dict["updated_at"] = now

    await db.emergencies.insert_one(emg_dict)

    # Observability metric: record emergency creation
    urg_raw = emg_dict.get("emergency_level")
    urg_level = urg_raw.value if hasattr(urg_raw, "value") else str(urg_raw)
    b_group = str(emg_dict.get("required_blood_group", "O+"))
    EMERGENCY_CREATED_TOTAL.labels(urgency_level=urg_level, blood_group=b_group).inc()

    return emg_dict

@router.patch("/{emergency_id}/urgency", response_model=EmergencyRequest)
async def update_urgency(emergency_id: str, urgency_in: EmergencyUrgencyUpdate):
    """
    Update the urgency level (Routine -> Urgent -> Critical).
    In Adaptive Software Engineering, this triggers recalculation of adaptation weights.
    """
    db = get_db()
    existing = await db.emergencies.find_one({"id": emergency_id})
    if not existing:
        existing = await db.emergencies.find_one({"_id": emergency_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency request with ID '{emergency_id}' not found."
        )

    old_level = str(existing.get("emergency_level", "Urgent")).capitalize()
    new_level = urgency_in.emergency_level.value

    # Observability metric: record urgency change
    EMERGENCY_URGENCY_CHANGES_TOTAL.labels(old_level=old_level, new_level=new_level).inc()

    # 1. Update database first
    await db.emergencies.update_one(
        {"id": emergency_id},
        {"$set": {
            "emergency_level": new_level,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    updated = await db.emergencies.find_one({"id": emergency_id})

    # 2. Real-Time Adaptation Events (Resilient Broadcast)
    try:
        new_weights = get_weights_for_emergency(new_level)
        urgency_event = create_emergency_urgency_event(
            emergency_id=emergency_id,
            old_emergency_level=old_level,
            new_emergency_level=new_level,
            new_weights=new_weights,
            hospital_name=updated.get("hospital_name")
        )
        # Broadcast EMERGENCY_URGENCY_CHANGED event
        await manager.broadcast(urgency_event)

        # 3. Recalculate adaptive matching with new weights and broadcast MATCHING_RECALCULATED
        await recalculate_and_broadcast_matching(emergency_id, db=db)
    except Exception as exc:
        logger.warning(f"Non-fatal error during urgency adaptation broadcast: {exc}")

    return updated


@router.patch("/{emergency_id}/status", response_model=EmergencyRequest)
async def update_status(emergency_id: str, status_in: EmergencyStatusUpdate):
    """Update emergency request lifecycle status (Open, Matched, Fulfilled, Cancelled)."""
    db = get_db()
    existing = await db.emergencies.find_one({"id": emergency_id})
    if not existing:
        existing = await db.emergencies.find_one({"_id": emergency_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency request with ID '{emergency_id}' not found."
        )

    await db.emergencies.update_one(
        {"id": emergency_id},
        {"$set": {
            "status": status_in.status.value,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    updated = await db.emergencies.find_one({"id": emergency_id})
    return updated

@router.delete("/{emergency_id}", status_code=status.HTTP_200_OK)
async def delete_emergency(emergency_id: str):
    """Cancel and delete an emergency request."""
    db = get_db()
    existing = await db.emergencies.find_one({"id": emergency_id})
    if not existing:
        existing = await db.emergencies.find_one({"_id": emergency_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency request with ID '{emergency_id}' not found."
        )

    await db.emergencies.delete_one({"id": emergency_id})
    return {"status": "success", "message": f"Emergency request '{emergency_id}' deleted."}
