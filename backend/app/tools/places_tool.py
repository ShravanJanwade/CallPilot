"""Google Places API (New) integration for finding service providers."""
import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class PlacesService:
    def __init__(self):
        self.api_key = settings.google_maps_api_key
        self.geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        # New Places API endpoint
        self.search_url = "https://places.googleapis.com/v1/places:searchText"
        self.details_url = "https://places.googleapis.com/v1/places"
    
    async def search_providers(
        self,
        category: str,
        location: str,
        radius_miles: float = 10.0
    ) -> list[dict]:
        """
        Search Google Places for providers using the new Places API.
        Returns list of provider dicts with name, phone, address, rating, lat, lng, etc.
        """
        radius_meters = int(radius_miles * 1609.34)
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            # First geocode the location to get lat/lng
            geo_params = {"address": location, "key": self.api_key}
            geo_resp = await client.get(self.geocode_url, params=geo_params)
            geo_data = geo_resp.json()
            
            if not geo_data.get("results"):
                logger.error(f"❌ Geocoding failed for: {location}")
                return []
            
            lat = geo_data["results"][0]["geometry"]["location"]["lat"]
            lng = geo_data["results"][0]["geometry"]["location"]["lng"]
            logger.info(f"📍 Geocoded {location} → ({lat}, {lng})")
            
            # New Places API request (POST with JSON body)
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.currentOpeningHours"
            }
            
            body = {
                "textQuery": f"{category} near {location}",
                "locationBias": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": float(radius_meters)
                    }
                },
                "maxResultCount": 15
            }
            
            logger.info(f"🔍 Searching for '{category}' near '{location}' (radius: {radius_miles} mi)")
            
            try:
                search_resp = await client.post(self.search_url, headers=headers, json=body)
                search_data = search_resp.json()
                
                if search_resp.status_code != 200:
                    logger.error(f"❌ Places API error: {search_resp.status_code} - {search_data}")
                    return []
                
                providers = []
                for place in search_data.get("places", []):
                    location_data = place.get("location", {})
                    provider = {
                        "place_id": place.get("id", ""),
                        "name": place.get("displayName", {}).get("text", ""),
                        "address": place.get("formattedAddress", ""),
                        "rating": place.get("rating", 0),
                        "total_reviews": place.get("userRatingCount", 0),
                        "lat": location_data.get("latitude", 0),
                        "lng": location_data.get("longitude", 0),
                        "phone": place.get("nationalPhoneNumber", ""),
                        "international_phone": place.get("internationalPhoneNumber", ""),
                        "website": place.get("websiteUri", ""),
                        "open_now": place.get("currentOpeningHours", {}).get("openNow", None),
                        "photo_url": None,  # Would need separate call for photos
                    }
                    providers.append(provider)
                
                logger.info(f"✅ Found {len(providers)} providers for '{category}' near '{location}'")
                return providers
                
            except Exception as e:
                logger.error(f"❌ Places search error: {e}")
                return []
    
    def _category_to_type(self, category: str) -> str:
        """Map user-friendly category to Google Places type."""
        mapping = {
            "dentist": "dentist",
            "doctor": "doctor",
            "barber": "hair_care",
            "salon": "hair_care",
            "mechanic": "car_repair",
            "vet": "veterinary_care",
            "optometrist": "optician",
            "therapist": "physiotherapist",
            "pharmacy": "pharmacy",
        }
        return mapping.get(category.lower(), category.lower())
