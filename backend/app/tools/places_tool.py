"""Google Places API — search for service providers."""
import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

BASE = "https://maps.googleapis.com/maps/api"

CATEGORY_MAP = {
    "dentist": "dentist", "doctor": "doctor", "barber": "hair_care",
    "salon": "hair_care", "mechanic": "car_repair", "vet": "veterinary_care",
    "optometrist": "optician", "therapist": "physiotherapist",
    "pharmacy": "pharmacy", "chiropractor": "chiropractor",
}


class PlacesService:
    def __init__(self):
        self.key = settings.google_maps_api_key

    async def geocode(self, location: str) -> tuple[float, float]:
        """Convert address to lat/lng."""
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{BASE}/geocode/json", params={"address": location, "key": self.key})
            data = r.json()
            if data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return loc["lat"], loc["lng"]
        return 42.3601, -71.0589  # Default Boston

    async def search_providers(self, category: str, location: str, radius_miles: float = 10.0) -> list[dict]:
        """Search Google Places for providers. Returns list of provider dicts."""
        lat, lng = await self.geocode(location)
        radius_m = int(radius_miles * 1609.34)
        place_type = CATEGORY_MAP.get(category.lower(), category.lower())

        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{BASE}/place/textsearch/json", params={
                "query": f"{category} near {location}",
                "location": f"{lat},{lng}",
                "radius": radius_m,
                "type": place_type,
                "key": self.key,
            })
            data = r.json()

            providers = []
            for p in data.get("results", [])[:15]:
                prov = {
                    "provider_id": p.get("place_id", ""),
                    "place_id": p.get("place_id", ""),
                    "name": p.get("name", ""),
                    "address": p.get("formatted_address", ""),
                    "rating": p.get("rating", 0),
                    "total_reviews": p.get("user_ratings_total", 0),
                    "lat": p["geometry"]["location"]["lat"],
                    "lng": p["geometry"]["location"]["lng"],
                    "photo_url": self._photo_url(p),
                    "phone": "",
                    "international_phone": "",
                    "open_now": p.get("opening_hours", {}).get("open_now"),
                }
                providers.append(prov)

            # Fetch phone numbers (top 10 to save API calls)
            for prov in providers[:10]:
                det = await self._details(c, prov["place_id"])
                prov["phone"] = det.get("formatted_phone_number", "")
                prov["international_phone"] = det.get("international_phone_number", "")
                prov["website"] = det.get("website", "")

        logger.info(f"🔍 Found {len(providers)} {category} providers near {location}")
        return providers, lat, lng

    async def _details(self, client: httpx.AsyncClient, place_id: str) -> dict:
        try:
            r = await client.get(f"{BASE}/place/details/json", params={
                "place_id": place_id,
                "fields": "formatted_phone_number,international_phone_number,website",
                "key": self.key,
            })
            return r.json().get("result", {})
        except Exception:
            return {}

    def _photo_url(self, place: dict) -> Optional[str]:
        photos = place.get("photos", [])
        if photos:
            ref = photos[0].get("photo_reference", "")
            if ref:
                return f"{BASE}/place/photo?maxwidth=400&photo_reference={ref}&key={self.key}"
        return None