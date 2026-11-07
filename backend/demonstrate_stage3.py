"""
Stage 3 Demonstration Script: Real-Time WebSockets & Context-Aware Adaptation.

Demonstrates the 3 core Adaptive Software Engineering scenarios:
- Scenario A: Donor Availability Adaptation (Available -> Unavailable -> Re-rank)
- Scenario B: Urgency Escalation (Routine -> Critical -> Dynamic Weight Adaptation)
- Scenario C: Donor Location Mobility Adaptation (Near -> Far -> Proximity & Rank Update)

Prints live WebSocket event payloads and ranking tables.
"""

import json
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty


def print_separator(title: str):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)


def print_json(data: dict):
    print(json.dumps(data, indent=2, default=str))


def print_ranking_table(ranked_matches: list, limit: int = 4):
    print(f"\n{'Rank':<5} | {'Donor Name':<22} | {'Blood':<5} | {'Dist (km)':<10} | {'Score':<8} | {'Tier / Summary'}")
    print("-" * 85)
    for m in ranked_matches[:limit]:
        tier = m.get("match_tier") or "Candidate"
        print(f"#{m.get('rank', '-'):<4} | {m.get('donor_name', '-'):<22} | {m.get('donor_blood_group', '-'):<5} | {m.get('distance_km', 0.0):<10.2f} | {m.get('priority_score', 0.0):<8.4f} | {tier}")


def run_demonstration():
    print("\n" + "#" * 80)
    print("  AI-ADAPTIVE BLOOD DONOR MATCHING SYSTEM")
    print("  STAGE 3: REAL-TIME WEBSOCKETS + ADAPTIVE EVENT SYSTEM DEMONSTRATION")
    print("#" * 80)

    # 1. Initialize environment
    asyncio.run(init_db())
    asyncio.run(seed_donors_if_empty())
    asyncio.run(seed_emergencies_if_empty())

    client = TestClient(app)

    with client.websocket_connect("/ws") as ws:
        # Initial greeting from WebSocket endpoint
        init_event = ws.receive_json()
        print("\n[WebSocket Connection Established]")
        print_json(init_event)

        # =====================================================================
        # SCENARIO A: DONOR AVAILABILITY ADAPTATION
        # =====================================================================
        print_separator("Scenario A: Real-Time Donor Availability Adaptation")
        print("Context: Emergency 'emg-demo-001' is active for patient needing O+ blood.")
        print("Step 1: Fetch current recommendations...")

        res = client.get("/api/matching/emg-demo-001")
        initial_match = res.json()
        print(f"Total evaluated: {initial_match['total_evaluated']}, Matched candidates: {initial_match['matched_donors_count']}")
        print_ranking_table(initial_match["ranked_matches"], limit=3)

        top_donor_id = initial_match["ranked_matches"][0]["donor_id"]
        top_donor_name = initial_match["ranked_matches"][0]["donor_name"]
        print(f"\nStep 2: Top candidate '{top_donor_name}' ({top_donor_id}) changes status to UNAVAILABLE...")

        # Update donor availability via REST API
        patch_res = client.patch(f"/api/donors/{top_donor_id}/status", json={"is_available": False})
        assert patch_res.status_code == 200

        print("\nStep 3: Backend broadcasts adaptation event over WebSocket...")
        event_status = ws.receive_json()
        print("\n>>> RECEIVED EVENT 1: DONOR_STATUS_CHANGED <<<")
        print_json(event_status)

        print("\nStep 4: Adaptive matching engine recalculates and broadcasts new rankings...")
        event_recalc = ws.receive_json()
        print("\n>>> RECEIVED EVENT 2: MATCHING_RECALCULATED <<<")
        print(f"Recalculated for Emergency: {event_recalc['emergency_id']}")
        print(f"Matched donors count: {event_recalc['matched_donors_count']}")
        print_ranking_table(event_recalc["ranked_matches"], limit=3)

        # Verify top donor was filtered out
        assert not any(m["donor_id"] == top_donor_id for m in event_recalc["ranked_matches"])
        new_top = event_recalc["ranked_matches"][0]["donor_name"]
        print(f"\n[Observation] '{top_donor_name}' is automatically removed. '{new_top}' is now dynamically promoted to Rank #1!")

        # Reset availability for next scenarios
        client.patch(f"/api/donors/{top_donor_id}/status", json={"is_available": True})
        _ = ws.receive_json()  # status event
        _ = ws.receive_json()  # recalc event

        # =====================================================================
        # SCENARIO B: EMERGENCY URGENCY ESCALATION & WEIGHT ADAPTATION
        # =====================================================================
        print_separator("Scenario B: Urgency Escalation (Routine -> Critical) & Weight Adaptation")

        print("Step 1: Set emergency triage level to 'Routine'...")
        client.patch("/api/emergencies/emg-demo-001/urgency", json={"emergency_level": "Routine"})
        _ = ws.receive_json()  # urgency changed
        routine_recalc = ws.receive_json()  # recalc

        print(f"\nActive Routine Weights: {routine_recalc['adaptation_weights']}")
        print("Note high fatigue weight (0.20) and lower distance weight (0.20) prioritizing donor rest.")
        print_ranking_table(routine_recalc["ranked_matches"], limit=3)

        print("\nStep 2: Emergency situation worsens -> Hospital escalates urgency to 'Critical'!")
        patch_crit = client.patch("/api/emergencies/emg-demo-001/urgency", json={"emergency_level": "Critical"})
        assert patch_crit.status_code == 200

        print("\nStep 3: Backend broadcasts EMERGENCY_URGENCY_CHANGED over WebSocket...")
        event_urgency = ws.receive_json()
        print("\n>>> RECEIVED EVENT: EMERGENCY_URGENCY_CHANGED <<<")
        print_json(event_urgency)

        print("\nStep 4: Adaptive matching applies Critical weights and broadcasts recalculated ranks...")
        event_crit_recalc = ws.receive_json()
        print("\n>>> RECEIVED EVENT: MATCHING_RECALCULATED (Critical Triage) <<<")
        print(f"New Adaptation Weights Applied: {event_crit_recalc['adaptation_weights']}")
        print_ranking_table(event_crit_recalc["ranked_matches"], limit=3)

        print("\n[Observation] Distance weight increased from 0.20 -> 0.50 (+150%). Nearby donors receive massive priority boost for immediate life saving.")

        # =====================================================================
        # SCENARIO C: DONOR MOBILITY / LOCATION REAL-TIME ADAPTATION
        # =====================================================================
        print_separator("Scenario C: Dynamic Donor Mobility / Location Adaptation")

        # Pick donor-001
        donor_c_id = "donor-001"
        donor_c_info = client.get(f"/api/donors/{donor_c_id}").json()
        print(f"Donor '{donor_c_info['name']}' initial coordinates: ({donor_c_info['latitude']}, {donor_c_info['longitude']})")

        # Check current rank in Critical emergency
        res_current = client.get("/api/matching/emg-demo-001").json()
        initial_match_c = next(m for m in res_current["ranked_matches"] if m["donor_id"] == donor_c_id)
        print(f"Initial Distance: {initial_match_c['distance_km']:.2f} km | Distance Score: {initial_match_c['distance_score']:.4f} | Priority: {initial_match_c['priority_score']:.4f} | Rank: #{initial_match_c['rank']}")

        print(f"\nStep 1: Donor '{donor_c_info['name']}' moves across town (from 2.2 km away to ~28 km away)...")
        # Move donor to coordinates far north
        new_lat, new_lon = 13.2000, 77.7500
        patch_loc = client.patch(
            f"/api/donors/{donor_c_id}/location",
            json={"latitude": new_lat, "longitude": new_lon, "address": "Devanahalli, Outer Bengaluru"}
        )
        assert patch_loc.status_code == 200

        print("\nStep 2: Backend broadcasts DONOR_LOCATION_CHANGED over WebSocket...")
        event_loc = ws.receive_json()
        print("\n>>> RECEIVED EVENT: DONOR_LOCATION_CHANGED <<<")
        print_json(event_loc)

        print("\nStep 3: Adaptive matching engine recalculates with new distance...")
        event_loc_recalc = ws.receive_json()
        print("\n>>> RECEIVED EVENT: MATCHING_RECALCULATED <<<")
        updated_match_c = next(m for m in event_loc_recalc["ranked_matches"] if m["donor_id"] == donor_c_id)

        print(f"\nNew Distance: {updated_match_c['distance_km']:.2f} km (was {initial_match_c['distance_km']:.2f} km)")
        print(f"New Distance Score: {updated_match_c['distance_score']:.4f} (was {initial_match_c['distance_score']:.4f})")
        print(f"New Priority Score: {updated_match_c['priority_score']:.4f} (was {initial_match_c['priority_score']:.4f})")
        print(f"New Rank: #{updated_match_c['rank']} (was #{initial_match_c['rank']})")

        print(f"\nExplanation: \"{updated_match_c['explanation']}\"")
        print("\n[Observation] Geo-mobility immediately adapted donor rank without manual page refresh or query!")

        # Reset donor coordinates back
        client.patch(
            f"/api/donors/{donor_c_id}/location",
            json={"latitude": 12.9600, "longitude": 77.5800, "address": "Near Victoria Hospital"}
        )
        _ = ws.receive_json()
        _ = ws.receive_json()

    print("\n" + "=" * 80)
    print("  ALL STAGE 3 DEMONSTRATION SCENARIOS COMPLETED SUCCESSFULLY!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    run_demonstration()
