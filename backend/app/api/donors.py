import logging
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status

from app.database import get_db
from app.models.donor import Donor, DonorCreate, DonorUpdate, DonorStatusUpdate
from app.services.seed_data import INITIAL_DONORS
from app.websocket.manager import manager
from app.websocket.events import (
    create_donor_status_event,
    create_donor_location_event,
    create_donor_response_event
)
from app.services.matching_service import recalculate_for_active_emergencies
from app.metrics import DONOR_STATUS_CHANGES_TOTAL, DONOR_LOCATION_CHANGES_TOTAL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/donors", tags=["Donors"])


@router.get("", response_model=List[Donor])
async def list_donors(
    blood_group: Optional[str] = Query(None, description="Filter by blood group (e.g., O+, A-)"),
    is_available: Optional[bool] = Query(None, description="Filter by availability"),
    is_eligible: Optional[bool] = Query(None, description="Filter by eligibility"),
):
    """Retrieve all donors with optional filtering."""
    db = get_db()
    query = {}
    if blood_group:
        # Handles cases where + in URL query is decoded to space (e.g. 'O ' -> 'O+')
        clean_bg = blood_group.replace(" ", "+").strip().upper()
        query["blood_group"] = clean_bg
    if is_available is not None:
        query["is_available"] = is_available
    if is_eligible is not None:
        query["is_eligible"] = is_eligible

    donors = await db.donors.find(query)
    # Ensure id field is clean string
    for d in donors:
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
    return donors

@router.get("/{donor_id}", response_model=Donor)
async def get_donor(donor_id: str):
    """Retrieve a single donor by their unique ID."""
    db = get_db()
    donor = await db.donors.find_one({"id": donor_id})
    if not donor:
        donor = await db.donors.find_one({"_id": donor_id})
    if not donor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )
    return donor

@router.post("", response_model=Donor, status_code=status.HTTP_201_CREATED)
async def create_donor(donor_in: DonorCreate):
    """Register a new blood donor into the database."""
    db = get_db()
    now = datetime.now(timezone.utc)
    new_id = f"donor-{str(uuid.uuid4())[:8]}"
    
    donor_dict = donor_in.model_dump()
    donor_dict["id"] = new_id
    donor_dict["_id"] = new_id
    donor_dict["created_at"] = now
    donor_dict["updated_at"] = now
    
    await db.donors.insert_one(donor_dict)
    return donor_dict


class DonorLocationUpdate(BaseModel):
    latitude: float = Field(..., description="GPS latitude")
    longitude: float = Field(..., description="GPS longitude")
    address: Optional[str] = None


class DonorResponseInput(BaseModel):
    emergency_id: str = Field(..., description="Emergency request ID being responded to")
    response: str = Field(default="ACCEPTED", description="'ACCEPTED' or 'DECLINED'")
    eta_mins: Optional[float] = Field(default=None, description="Self-reported or estimated ETA in minutes")


@router.put("/{donor_id}", response_model=Donor)
async def update_donor(donor_id: str, donor_in: DonorUpdate):
    """Update profile details of an existing donor."""
    db = get_db()
    existing = await db.donors.find_one({"id": donor_id})
    if not existing:
        existing = await db.donors.find_one({"_id": donor_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )

    # 1. Update database first
    update_fields = {k: v for k, v in donor_in.model_dump(exclude_unset=True).items()}
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        await db.donors.update_one({"id": donor_id}, {"$set": update_fields})
    
    updated = await db.donors.find_one({"id": donor_id})

    # 2. Resilient WebSocket Adaptation Events
    try:
        status_changed = ("is_available" in update_fields) or ("is_eligible" in update_fields)
        location_changed = ("latitude" in update_fields) or ("longitude" in update_fields)

        if status_changed:
            ev = create_donor_status_event(
                donor_id=donor_id,
                donor_name=updated.get("name", "Donor"),
                is_available=updated.get("is_available"),
                is_eligible=updated.get("is_eligible")
            )
            await manager.broadcast(ev)

        if location_changed:
            ev = create_donor_location_event(
                donor_id=donor_id,
                donor_name=updated.get("name", "Donor"),
                latitude=float(updated.get("latitude", 0.0)),
                longitude=float(updated.get("longitude", 0.0)),
                address=updated.get("address")
            )
            await manager.broadcast(ev)

        if status_changed or location_changed:
            await recalculate_for_active_emergencies(db=db)
    except Exception as exc:
        logger.warning(f"Non-fatal error broadcasting adaptation event during donor update: {exc}")

    return updated


@router.patch("/{donor_id}/status", response_model=Donor)
async def update_donor_status(donor_id: str, status_in: DonorStatusUpdate):
    """Quickly update donor availability, eligibility, or current GPS coordinates."""
    db = get_db()
    existing = await db.donors.find_one({"id": donor_id})
    if not existing:
        existing = await db.donors.find_one({"_id": donor_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )

    # 1. Update database first
    update_fields = {k: v for k, v in status_in.model_dump(exclude_unset=True).items()}
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        await db.donors.update_one({"id": donor_id}, {"$set": update_fields})
    
    updated = await db.donors.find_one({"id": donor_id})

    # 2. Resilient WebSocket Adaptation Events
    try:
        status_changed = ("is_available" in update_fields) or ("is_eligible" in update_fields)
        location_changed = ("latitude" in update_fields) or ("longitude" in update_fields)

        if status_changed:
            if "is_available" in update_fields:
                DONOR_STATUS_CHANGES_TOTAL.labels(status_field="availability").inc()
            if "is_eligible" in update_fields:
                DONOR_STATUS_CHANGES_TOTAL.labels(status_field="eligibility").inc()

            status_event = create_donor_status_event(
                donor_id=donor_id,
                donor_name=updated.get("name", "Donor"),
                is_available=updated.get("is_available"),
                is_eligible=updated.get("is_eligible")
            )
            await manager.broadcast(status_event)

        if location_changed:
            DONOR_LOCATION_CHANGES_TOTAL.inc()
            loc_event = create_donor_location_event(
                donor_id=donor_id,
                donor_name=updated.get("name", "Donor"),
                latitude=float(updated.get("latitude", 0.0)),
                longitude=float(updated.get("longitude", 0.0)),
                address=updated.get("address")
            )
            await manager.broadcast(loc_event)

        # 3. If an active emergency exists, recalculate its matching and broadcast updated rankings
        if status_changed or location_changed:
            await recalculate_for_active_emergencies(db=db)
    except Exception as exc:
        logger.warning(f"Non-fatal error during WebSocket broadcast: {exc}")

    return updated


@router.patch("/{donor_id}/location", response_model=Donor)
async def update_donor_location(donor_id: str, loc_in: DonorLocationUpdate):
    """Explicitly update donor GPS coordinates and trigger real-time geo-adaptation."""
    db = get_db()
    existing = await db.donors.find_one({"id": donor_id})
    if not existing:
        existing = await db.donors.find_one({"_id": donor_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )

    # 1. Update database first
    update_fields = {"latitude": loc_in.latitude, "longitude": loc_in.longitude}
    if loc_in.address:
        update_fields["address"] = loc_in.address
    update_fields["updated_at"] = datetime.now(timezone.utc)

    await db.donors.update_one({"id": donor_id}, {"$set": update_fields})
    updated = await db.donors.find_one({"id": donor_id})

    # Observability metric: donor location update
    DONOR_LOCATION_CHANGES_TOTAL.inc()

    # 2. Resilient WebSocket Adaptation Events
    try:
        loc_event = create_donor_location_event(
            donor_id=donor_id,
            donor_name=updated.get("name", "Donor"),
            latitude=loc_in.latitude,
            longitude=loc_in.longitude,
            address=loc_in.address
        )
        await manager.broadcast(loc_event)
        await recalculate_for_active_emergencies(db=db)
    except Exception as exc:
        logger.warning(f"Non-fatal error during location update broadcast: {exc}")

    return updated


@router.post("/{donor_id}/response", status_code=status.HTTP_200_OK)
async def record_donor_response(donor_id: str, response_in: DonorResponseInput):
    """
    Record donor response (e.g., ACCEPTED / DECLINED) to an emergency alert
    and broadcast DONOR_RESPONSE_RECEIVED adaptation event.
    """
    db = get_db()
    existing = await db.donors.find_one({"id": donor_id})
    if not existing:
        existing = await db.donors.find_one({"_id": donor_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )

    event_payload = create_donor_response_event(
        donor_id=donor_id,
        donor_name=existing.get("name", "Donor"),
        emergency_id=response_in.emergency_id,
        response=response_in.response,
        eta_mins=response_in.eta_mins
    )

    try:
        await manager.broadcast(event_payload)
    except Exception as exc:
        logger.warning(f"Non-fatal error broadcasting donor response event: {exc}")

    return {
        "status": "success",
        "message": f"Recorded response '{response_in.response}' for donor '{donor_id}'",
        "event": event_payload
    }


@router.delete("/{donor_id}", status_code=status.HTTP_200_OK)
async def delete_donor(donor_id: str):
    """Delete a donor record."""
    db = get_db()
    existing = await db.donors.find_one({"id": donor_id})
    if not existing:
        existing = await db.donors.find_one({"_id": donor_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor with ID '{donor_id}' not found."
        )

    await db.donors.delete_one({"id": donor_id})
    return {"status": "success", "message": f"Donor '{donor_id}' deleted successfully."}

@router.post("/seed/reset", status_code=status.HTTP_200_OK)
async def reset_seed_donors():
    """Reset the donor database to the initial 20 synthetic demo records."""
    db = get_db()
    await db.donors.delete_many({})
    now = datetime.now(timezone.utc)
    docs_to_insert = []
    for d in INITIAL_DONORS:
        item = dict(d)
        item["created_at"] = now
        item["updated_at"] = now
        docs_to_insert.append(item)
    await db.donors.insert_many(docs_to_insert)
    return {
        "status": "success",
        "message": f"Reset donors to {len(docs_to_insert)} synthetic demo records.",
        "donor_count": len(docs_to_insert)
    }
