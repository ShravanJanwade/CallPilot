"""
Multi-Appointment Optimizer — "Book My Whole Week"
After all campaigns complete, finds the optimal combination of appointments
that avoids time conflicts and minimizes total travel distance.
"""
import logging
from datetime import datetime, timedelta
from itertools import product

logger = logging.getLogger(__name__)


def parse_slot(slot: dict) -> tuple:
    """Parse a slot dict into (datetime_start, datetime_end)."""
    if not slot or not slot.get("date") or not slot.get("time"):
        return None, None
    try:
        start = datetime.strptime(f"{slot['date']} {slot['time']}", "%Y-%m-%d %H:%M")
        end = start + timedelta(minutes=60)
        return start, end
    except Exception:
        return None, None


def slots_conflict(slot_a: dict, slot_b: dict) -> bool:
    """Check if two appointment slots overlap in time."""
    a_start, a_end = parse_slot(slot_a)
    b_start, b_end = parse_slot(slot_b)
    if not a_start or not b_start:
        return False
    return a_start < b_end and b_start < a_end


def haversine_miles(lat1, lng1, lat2, lng2) -> float:
    """Approximate distance in miles between two coordinates."""
    from math import radians, sin, cos, sqrt, atan2
    R = 3959  # Earth radius in miles
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))


def optimize_appointments(campaign_group: dict) -> dict:
    """
    Given a campaign group with multiple completed campaigns,
    find the optimal set of appointments (one per service type)
    that maximizes total score while avoiding time conflicts
    and minimizing total travel.

    Returns:
    {
        "optimized": True,
        "appointments": [{service_type, provider_name, date, time, score, lat, lng}, ...],
        "total_score": float,
        "total_travel_miles": float,
        "conflicts_resolved": int,
        "route_order": [indices in travel-optimized order]
    }
    """
    campaigns = campaign_group.get("campaigns", [])
    completed = [c for c in campaigns if c.get("status") == "completed"]

    if not completed:
        return {"optimized": False, "reason": "No completed campaigns"}

    # Collect booked results per campaign
    options_per_campaign = []
    for camp in completed:
        booked = []
        for r in camp.get("results", []):
            if r.get("status") == "booked" and r.get("offered_slot"):
                prov = next((p for p in camp.get("providers", []) if p["provider_id"] == r["provider_id"]), {})
                booked.append({
                    "service_type": camp["service_type"],
                    "provider_id": r["provider_id"],
                    "provider_name": r.get("provider_name", ""),
                    "slot": r["offered_slot"],
                    "score": r.get("score", 0),
                    "lat": prov.get("lat", 0),
                    "lng": prov.get("lng", 0),
                    "distance_miles": prov.get("distance_miles", 0),
                })
        if booked:
            options_per_campaign.append(booked)
        else:
            # No booked options for this service type
            options_per_campaign.append([{
                "service_type": camp["service_type"],
                "provider_id": None, "provider_name": "No options",
                "slot": {}, "score": 0, "lat": 0, "lng": 0, "distance_miles": 0,
            }])

    if len(options_per_campaign) <= 1:
        # Single campaign — just return best result
        best = options_per_campaign[0][0] if options_per_campaign[0] else None
        if best and best["provider_id"]:
            return {
                "optimized": True,
                "appointments": [best],
                "total_score": best["score"],
                "total_travel_miles": best["distance_miles"],
                "conflicts_resolved": 0,
                "route_order": [0],
            }
        return {"optimized": False, "reason": "No bookable appointments found"}

    # Try all combinations and pick the best conflict-free set
    best_combo = None
    best_total_score = -1
    conflicts_checked = 0

    for combo in product(*options_per_campaign):
        # Skip combos with None provider
        if any(c["provider_id"] is None for c in combo):
            continue

        # Check for time conflicts
        has_conflict = False
        for i in range(len(combo)):
            for j in range(i + 1, len(combo)):
                if slots_conflict(combo[i]["slot"], combo[j]["slot"]):
                    has_conflict = True
                    conflicts_checked += 1
                    break
            if has_conflict:
                break

        if has_conflict:
            continue

        # Score this combination: sum of individual scores + travel bonus
        total_score = sum(c["score"] for c in combo)

        # Add bonus for proximity between appointments
        total_travel = 0
        for i in range(len(combo) - 1):
            d = haversine_miles(combo[i]["lat"], combo[i]["lng"], combo[i+1]["lat"], combo[i+1]["lng"])
            total_travel += d
        # Normalize travel bonus: less travel = higher bonus
        if total_travel > 0:
            travel_bonus = max(0, 0.2 * (1 - total_travel / 30))  # 30 miles normalization
            total_score += travel_bonus

        if total_score > best_total_score:
            best_total_score = total_score
            best_combo = combo

    if not best_combo:
        return {"optimized": False, "reason": "All combinations have time conflicts"}

    # Compute route order (sort by appointment time)
    appointments = list(best_combo)
    appointments.sort(key=lambda a: a["slot"].get("date", "") + a["slot"].get("time", ""))

    # Total travel in route order
    total_travel = 0
    for i in range(len(appointments) - 1):
        total_travel += haversine_miles(
            appointments[i]["lat"], appointments[i]["lng"],
            appointments[i+1]["lat"], appointments[i+1]["lng"]
        )

    return {
        "optimized": True,
        "appointments": appointments,
        "total_score": round(best_total_score, 3),
        "total_travel_miles": round(total_travel, 1),
        "conflicts_resolved": conflicts_checked,
        "route_order": list(range(len(appointments))),
    }