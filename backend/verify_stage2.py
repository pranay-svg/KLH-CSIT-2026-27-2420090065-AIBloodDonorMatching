"""
Stage 2 Verification and Demonstration Script.
Executes matching API logic and demonstrates ranking adaptation across Routine, Urgent, and Critical.
"""

import asyncio
import json
from app.database import init_db, get_db
from app.services.seed_data import seed_donors_if_empty
from app.api.emergencies import seed_emergencies_if_empty
from app.services.adaptive_engine import rank_donors_for_emergency, ADAPTIVE_WEIGHTS

async def main():
    await init_db()
    await seed_donors_if_empty()
    await seed_emergencies_if_empty()

    db = get_db()
    emergency = await db.emergencies.find_one({"id": "emg-demo-001"})
    donors = await db.donors.find({})

    print("\n" + "=" * 75)
    print("DEMO EMERGENCY REQUEST DETAILS")
    print("=" * 75)
    print(f"Emergency ID        : {emergency['id']}")
    print(f"Hospital            : {emergency['hospital_name']}")
    print(f"Required Blood Group: {emergency['required_blood_group']}")
    print(f"Units Needed        : {emergency['units_needed']}")
    print(f"Location            : ({emergency['latitude']}, {emergency['longitude']})")

    # 1. Test Match Response on Current (Urgent) Level
    urgent_result = rank_donors_for_emergency(emergency, donors)
    print("\n" + "=" * 75)
    print("TOP RANKED DONOR (URGENT LEVEL)")
    print("=" * 75)
    top_urgent = urgent_result.ranked_matches[0]
    top_dict = {
        "donor_id": top_urgent.donor_id,
        "donor_name": top_urgent.donor_name,
        "blood_group": top_urgent.donor_blood_group,
        "compatibility_score": top_urgent.compatibility_score,
        "distance_km": top_urgent.distance_km,
        "distance_score": top_urgent.distance_score,
        "response_probability": top_urgent.response_probability,
        "fatigue_score": top_urgent.fatigue_score,
        "priority_score": top_urgent.priority_score,
        "rank": top_urgent.rank,
        "match_tier": top_urgent.match_tier,
        "estimated_arrival_mins": top_urgent.estimated_arrival_mins,
        "emergency_level": top_urgent.emergency_level,
        "explanation": top_urgent.explanation
    }
    print(json.dumps(top_dict, indent=2))

    # 2. Demonstrate how ranking changes across Routine, Urgent, and Critical
    print("\n" + "=" * 75)
    print("ADAPTIVE RANKING DEMONSTRATION ACROSS EMERGENCY LEVELS")
    print("=" * 75)
    levels = ["Routine", "Urgent", "Critical"]
    
    for lvl in levels:
        emg_variant = dict(emergency)
        emg_variant["emergency_level"] = lvl
        res = rank_donors_for_emergency(emg_variant, donors)
        weights = res.adaptation_weights
        print(f"\n--- EMERGENCY LEVEL: {lvl.upper()} ---")
        print(f"Weights Applied -> Comp: {weights['compatibility']:.2f}, Dist: {weights['distance']:.2f}, ML: {weights['ml_response']:.2f}, Fatigue: {weights['fatigue']:.2f}")
        print("Top 3 Recommended Donors:")
        for m in res.ranked_matches[:3]:
            print(
                f"  Rank #{m.rank}: {m.donor_name} ({m.donor_blood_group}) | "
                f"Priority: {m.priority_score:.4f} | Dist: {m.distance_km:.1f}km (Score: {m.distance_score:.2f}) | "
                f"ML Prob: {m.response_probability:.1%} | Fatigue: {m.fatigue_score:.2f}"
            )
            print(f"         Explanation: \"{m.explanation}\"")

if __name__ == "__main__":
    asyncio.run(main())
