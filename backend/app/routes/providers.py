"""Provider search endpoint — powered by Google Places."""
from fastapi import APIRouter
from app.tools.places_tool import PlacesService
from app.tools.distance_tool import DistanceService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

places = PlacesService()
dist_svc = DistanceService()


@router.get("/search")
async def search_providers(category: str, location: str, radius: float = 10.0, max_results: int = 10):
    """Search for providers by category and location."""
    try:
        providers, lat, lng = await places.search_providers(category, location, radius)
        providers = providers[:max_results]

        # Get distances
        if providers:
            dests = [{"lat": p["lat"], "lng": p["lng"], "provider_id": p["provider_id"]} for p in providers]
            dist_map = await dist_svc.get_distances(lat, lng, dests)
            for p in providers:
                d = dist_map.get(p["provider_id"], {})
                p["distance_miles"] = d.get("distance_miles", 999)
                p["travel_minutes"] = d.get("duration_minutes", 999)
                p["distance_text"] = d.get("distance_text", "")
                p["duration_text"] = d.get("duration_text", "")

        return {
            "providers": providers,
            "origin": {"lat": lat, "lng": lng},
            "total": len(providers),
        }
    except Exception as e:
        logger.error(f"❌ Provider search error: {e}")
        return {"providers": [], "origin": None, "total": 0, "error": str(e)}
