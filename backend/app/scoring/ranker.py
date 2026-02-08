"""Scoring engine — ranks providers based on availability, rating, distance, preference."""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def compute_score(
    result: dict,
    provider: dict,
    preferences: dict,
    preferred_names: list[str],
    max_distance: float = 10.0,
    date_range_days: int = 7,
) -> float:
    """Compute final score for a provider after call completes."""
    w = {
        "availability": preferences.get("availability", 0.4),
        "rating": preferences.get("rating", 0.3),
        "distance": preferences.get("distance", 0.2),
        "preference": preferences.get("preference", 0.1),
    }

    # Availability: earlier slot = higher score
    slot = result.get("offered_slot", {})
    if slot and slot.get("date"):
        try:
            slot_date = datetime.strptime(slot["date"], "%Y-%m-%d")
            days_out = (slot_date - datetime.utcnow()).days
            availability_score = max(0, 1.0 - (days_out / max(date_range_days, 1)))
        except Exception:
            availability_score = 0.5
    else:
        availability_score = 0.0

    # Rating: Google rating / 5.0
    rating_score = min(provider.get("rating", 0) / 5.0, 1.0)

    # Distance: closer = higher
    dist = provider.get("distance_miles", 999)
    distance_score = max(0, 1.0 - min(dist / max(max_distance, 1), 1.0))

    # Preference: 1.0 if user's preferred provider
    is_preferred = provider.get("name", "").lower() in [n.lower() for n in preferred_names]
    preference_score = 1.0 if is_preferred else 0.0

    total = (
        w["availability"] * availability_score +
        w["rating"] * rating_score +
        w["distance"] * distance_score +
        w["preference"] * preference_score
    )

    # 1.5x boost for preferred providers
    if is_preferred:
        total = min(total * 1.5, 1.0)

    score = round(total, 3)
    logger.info(f"📊 Score for {provider.get('name')}: {score} (avail={availability_score:.2f}, "
                f"rate={rating_score:.2f}, dist={distance_score:.2f}, pref={preference_score:.2f})")
    return score


def rank_results(results: list[dict], providers: list[dict], preferences: dict,
                 preferred_names: list[str], max_distance: float = 10.0) -> list[dict]:
    """Score and rank all completed call results. Returns sorted list."""
    for result in results:
        if result.get("status") == "booked":
            prov = next((p for p in providers if p.get("provider_id") == result.get("provider_id")), {})
            result["score"] = compute_score(result, prov, preferences, preferred_names, max_distance)
        else:
            result["score"] = 0.0

    results.sort(key=lambda r: r.get("score", 0), reverse=True)
    return results