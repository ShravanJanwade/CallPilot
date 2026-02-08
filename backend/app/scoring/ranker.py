"""
Scoring engine for ranking providers based on weighted criteria.
"""
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def compute_score(
    provider_call: dict,
    weights: dict,
    date_range_start: str,
    date_range_end: str,
    max_distance: float = 15.0,
    preferred_providers: list[str] = None
) -> float:
    """
    Compute weighted score (0.0 - 1.0) for a provider after call completes.
    Only providers with a confirmed booking get a meaningful score.
    
    Args:
        provider_call: Dict with provider data including:
            - offeredSlot: {date, time} or None
            - rating: float (0-5)
            - distanceMiles: float
            - providerName: str
            - bookingConfirmed: bool
        weights: Dict with weight factors (0.0-1.0):
            - availability: weight for how early the slot is
            - rating: weight for Google rating
            - distance: weight for proximity
            - preference: weight for preferred provider match
        date_range_start: Start date string (ISO format)
        date_range_end: End date string (ISO format)
        max_distance: Maximum search distance in miles
        preferred_providers: List of preferred provider names
        
    Returns:
        float: Score from 0.0 to 1.0 (higher is better)
    """
    if preferred_providers is None:
        preferred_providers = []
    
    # Default weights
    w_avail = weights.get("availability", 0.4)
    w_rating = weights.get("rating", 0.3)
    w_distance = weights.get("distance", 0.2)
    w_preference = weights.get("preference", 0.1)
    
    # ----- Availability Score -----
    # How soon is the offered slot? Earlier = better
    offered_slot = provider_call.get("offeredSlot")
    if offered_slot and offered_slot.get("date"):
        try:
            slot_date = datetime.fromisoformat(offered_slot["date"].split("T")[0])
            range_start = datetime.fromisoformat(date_range_start.split("T")[0])
            range_end = datetime.fromisoformat(date_range_end.split("T")[0])
            
            range_days = max((range_end - range_start).days, 1)
            days_from_start = max((slot_date - range_start).days, 0)
            
            # Earlier slots get higher scores
            availability_score = 1.0 - min(days_from_start / range_days, 1.0)
        except Exception as e:
            logger.warning(f"Failed to parse dates for availability score: {e}")
            availability_score = 0.5  # Default to middle
    else:
        availability_score = 0.0  # No slot offered
    
    # ----- Rating Score -----
    # Google rating normalized to 0-1
    rating = provider_call.get("rating") or provider_call.get("google_rating") or 0
    rating_score = min(float(rating) / 5.0, 1.0)
    
    # ----- Distance Score -----
    # Closer = better (inverse of distance)
    distance = provider_call.get("distanceMiles") or provider_call.get("distance_miles") or 0
    if max_distance > 0:
        distance_score = 1.0 - min(float(distance) / max_distance, 1.0)
    else:
        distance_score = 1.0
    
    # ----- Preference Score -----
    # 1.0 if in preferred list, else 0.0
    provider_name = provider_call.get("providerName") or provider_call.get("provider_name", "")
    is_preferred = any(
        pref.lower() in provider_name.lower() or provider_name.lower() in pref.lower()
        for pref in preferred_providers
    ) if preferred_providers else False
    preference_score = 1.0 if is_preferred else 0.0
    
    # ----- Weighted Total -----
    total = (
        w_avail * availability_score +
        w_rating * rating_score +
        w_distance * distance_score +
        w_preference * preference_score
    )
    
    # Preferred providers get 1.5x boost (capped at 1.0)
    if is_preferred:
        total = min(total * 1.5, 1.0)
    
    # Round to 3 decimal places
    score = round(total, 3)
    
    logger.debug(
        f"Score for {provider_name}: {score} "
        f"(avail={availability_score:.2f}, rating={rating_score:.2f}, "
        f"dist={distance_score:.2f}, pref={preference_score:.2f})"
    )
    
    return score


def rank_providers(
    calls: list[dict],
    weights: dict,
    date_range_start: str,
    date_range_end: str,
    max_distance: float = 15.0,
    preferred_providers: list[str] = None
) -> list[dict]:
    """
    Score and rank all providers from a campaign.
    Only ranks providers that have confirmed bookings.
    
    Args:
        calls: List of call records from campaign
        weights: Scoring weight factors
        date_range_start: Start date string
        date_range_end: End date string
        max_distance: Maximum search distance
        preferred_providers: List of preferred provider names
        
    Returns:
        list: Sorted list of call records with scores added, best first
    """
    if preferred_providers is None:
        preferred_providers = []
    
    scored_calls = []
    
    for call in calls:
        # Only score providers with confirmed bookings or offered slots
        if call.get("bookingConfirmed") or call.get("offeredSlot"):
            score = compute_score(
                call,
                weights,
                date_range_start,
                date_range_end,
                max_distance,
                preferred_providers
            )
            call["score"] = score
            scored_calls.append(call)
    
    # Sort by score descending
    scored_calls.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return scored_calls


def get_best_match(ranked_results: list[dict]) -> Optional[dict]:
    """
    Get the best matching provider from ranked results.
    
    Args:
        ranked_results: Sorted list of scored providers
        
    Returns:
        dict: Best matching provider or None if no results
    """
    if not ranked_results:
        return None
    
    return ranked_results[0]
