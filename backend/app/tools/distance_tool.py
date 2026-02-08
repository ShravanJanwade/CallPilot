"""Google Distance Matrix API for travel time calculations."""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class DistanceService:
    def __init__(self):
        self.api_key = settings.google_maps_api_key

    async def get_distances(
        self,
        origin_lat: float,
        origin_lng: float,
        destinations: list[dict]  # [{lat, lng, provider_id}]
    ) -> dict:
        """
        Get driving distance and time from origin to multiple destinations.
        Returns: {provider_id: {distance_miles, duration_minutes, duration_text}}
        """
        if not destinations:
            return {}

        dest_str = "|".join(
            f"{d['lat']},{d['lng']}" for d in destinations
        )

        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": f"{origin_lat},{origin_lng}",
            "destinations": dest_str,
            "mode": "driving",
            "key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                data = resp.json()

            results = {}
            elements = data.get("rows", [{}])[0].get("elements", [])

            for i, element in enumerate(elements):
                if i < len(destinations):
                    pid = destinations[i].get("provider_id", str(i))
                    if element.get("status") == "OK":
                        dist_meters = element["distance"]["value"]
                        dur_seconds = element["duration"]["value"]
                        results[pid] = {
                            "distance_miles": round(dist_meters / 1609.34, 1),
                            "duration_minutes": round(dur_seconds / 60),
                            "duration_text": element["duration"]["text"],
                            "distance_text": element["distance"]["text"],
                        }
                    else:
                        results[pid] = {
                            "distance_miles": 999,
                            "duration_minutes": 999,
                            "duration_text": "Unknown",
                            "distance_text": "Unknown",
                        }

            return results

        except Exception as e:
            logger.error(f"❌ Distance Matrix error: {e}")
            return {}
