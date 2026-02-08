"""Google Distance Matrix API — travel time calculations."""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class DistanceService:
    def __init__(self):
        self.key = settings.google_maps_api_key

    async def get_distances(self, origin_lat: float, origin_lng: float, destinations: list[dict]) -> dict:
        """
        Get driving distance/time from origin to multiple destinations.
        destinations: [{lat, lng, provider_id}]
        Returns: {provider_id: {distance_miles, duration_minutes, distance_text, duration_text}}
        """
        if not destinations:
            return {}

        dest_str = "|".join(f"{d['lat']},{d['lng']}" for d in destinations)
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"

        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(url, params={
                    "origins": f"{origin_lat},{origin_lng}",
                    "destinations": dest_str,
                    "mode": "driving",
                    "key": self.key,
                })
                data = r.json()

            results = {}
            elements = data.get("rows", [{}])[0].get("elements", [])

            for i, el in enumerate(elements):
                if i < len(destinations):
                    pid = destinations[i]["provider_id"]
                    if el.get("status") == "OK":
                        results[pid] = {
                            "distance_miles": round(el["distance"]["value"] / 1609.34, 1),
                            "duration_minutes": round(el["duration"]["value"] / 60),
                            "distance_text": el["distance"]["text"],
                            "duration_text": el["duration"]["text"],
                        }
                    else:
                        results[pid] = {"distance_miles": 999, "duration_minutes": 999,
                                        "distance_text": "Unknown", "duration_text": "Unknown"}

            logger.info(f"📏 Got distances for {len(results)} providers")
            return results
        except Exception as e:
            logger.error(f"❌ Distance Matrix error: {e}")
            return {}