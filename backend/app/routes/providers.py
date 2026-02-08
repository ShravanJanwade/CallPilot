"""
Provider search routes — Google Places API integration for finding nearby providers.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import httpx
import logging

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ---- Models ----

class ProviderResult(BaseModel):
    place_id: str
    name: str
    phone: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    rating: Optional[float] = None
    total_ratings: Optional[int] = None
    open_now: Optional[bool] = None
    distance_miles: Optional[float] = None


class SearchResponse(BaseModel):
    providers: List[ProviderResult]
    total: int
    query: str


# ---- Helpers ----

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in miles between two coordinates (Haversine formula)."""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 3956  # Earth's radius in miles
    
    lat1_rad, lng1_rad = radians(lat1), radians(lng1)
    lat2_rad, lng2_rad = radians(lat2), radians(lng2)
    
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return round(R * c, 2)


# ---- Service Type Mapping ----

SERVICE_TYPE_MAP = {
    'dentist': 'dentist',
    'doctor': 'doctor',
    'dermatologist': 'doctor',  # Google doesn't have specific type
    'eye_doctor': 'doctor',
    'therapist': 'doctor',  # Maps to general medical
    'chiropractor': 'physiotherapist',
    'physical_therapy': 'physiotherapist',
    'veterinarian': 'veterinary_care',
    'barber': 'hair_care',
    'spa': 'spa',
    'mechanic': 'car_repair',
}


# ---- Endpoints ----

@router.get("/search", response_model=SearchResponse)
async def search_providers(
    category: str = Query(..., description="Service type (e.g., dentist, doctor)"),
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    max_distance: float = Query(10.0, description="Max distance in miles"),
    max_results: int = Query(10, description="Maximum number of results")
):
    """Search for providers by category and location using Google Places API."""
    
    if not settings.google_maps_api_key:
        logger.warning("Google Maps API key not configured")
        return SearchResponse(providers=[], total=0, query=category)
    
    # Map service type to Google Places type
    place_type = SERVICE_TYPE_MAP.get(category, category)
    
    # Convert miles to meters for Google API
    radius_meters = int(max_distance * 1609.34)
    
    # Search using Google Places Nearby Search
    search_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius_meters,
        "type": place_type,
        "key": settings.google_maps_api_key
    }
    
    providers = []
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(search_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                logger.error(f"Google Places API error: {data.get('status')} - {data.get('error_message')}")
                raise HTTPException(status_code=500, detail=f"Provider search failed: {data.get('status')}")
            
            if data.get("status") == "ZERO_RESULTS":
                logger.warning(f"Google Places returned ZERO_RESULTS for category '{place_type}' at {latitude},{longitude} radius {radius_meters}")
            
            results = data.get("results", [])[:max_results]
            
            # Helper to fetch details for a single place
            async def fetch_details(place):
                try:
                    place_id = place.get("place_id")
                    location = place.get("geometry", {}).get("location", {})
                    
                    # Calculate distance
                    distance = calculate_distance(
                        latitude, longitude,
                        location.get("lat", 0), location.get("lng", 0)
                    )
                    
                    provider = ProviderResult(
                        place_id=place_id,
                        name=place.get("name", "Unknown"),
                        address=place.get("vicinity", ""),
                        latitude=location.get("lat", 0),
                        longitude=location.get("lng", 0),
                        rating=place.get("rating"),
                        total_ratings=place.get("user_ratings_total"),
                        open_now=place.get("opening_hours", {}).get("open_now"),
                        distance_miles=distance
                    )
                    
                    # Get phone number from Place Details
                    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
                    details_params = {
                        "place_id": place_id,
                        "fields": "formatted_phone_number",
                        "key": settings.google_maps_api_key
                    }
                    
                    # Use a new client for parallel requests if needed, or reuse
                    details_response = await client.get(details_url, params=details_params)
                    if details_response.status_code == 200:
                        details_data = details_response.json()
                        phone = details_data.get("result", {}).get("formatted_phone_number")
                        if phone:
                            provider.phone = phone
                            
                    return provider
                except Exception as e:
                    logger.error(f"Error fetching details for {place.get('name')}: {e}")
                    return None

            # Execute parallel fetches
            import asyncio
            tasks = [fetch_details(place) for place in results]
            providers_results = await asyncio.gather(*tasks)
            
            # Filter out failed ones
            providers = [p for p in providers_results if p is not None]
                
        except httpx.RequestError as e:
            logger.error(f"HTTP error searching providers: {e}")
            raise HTTPException(status_code=500, detail="Provider search failed")
    
    
    # Sort by rating (descending) and distance (ascending)
    providers.sort(key=lambda p: (-1 * (p.rating or 0), p.distance_miles or 100))
    
    # MOCK FALLBACK: If no providers found (or API error), return fake ones for testing
    if not providers:
        logger.warning("⚠️ No providers found. Generating MOCK providers for testing.")
        print("DEBUG: Generating MOCK providers")
        
        mock_names = [f"Dr. Smith ({category})", f"City {category} Center", f"Best {category} Clinic"]
        if category == "dentist":
             mock_names = ["Bright Smile Dental", "City Dentist", "Dr. John Doe"]
        elif category == "barber":
             mock_names = ["Classic Cuts", "City Barber", "Main St Barbershop"]
             
        for i, name in enumerate(mock_names):
            providers.append(ProviderResult(
                place_id=f"mock-{i}-{category}",
                name=name,
                phone=settings.safe_numbers_list[0] if settings.safe_numbers_list else "+15550000000",
                address=f"{100+i} Main St, Cityville",
                latitude=latitude + (0.01 * i),
                longitude=longitude + (0.01 * i),
                rating=4.5 + (0.1 * i),
                total_ratings=100 + (10 * i),
                open_now=True,
                distance_miles=1.5 + (0.5 * i)
            ))
            
    logger.info(f"Found {len(providers)} providers for '{category}' near ({latitude}, {longitude})")
    
    return SearchResponse(
        providers=providers,
        total=len(providers),
        query=category
    )


@router.get("/{place_id}")
async def get_provider_details(place_id: str):
    """Get detailed information about a specific provider."""
    
    if not settings.google_maps_api_key:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")
    
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,formatted_address,geometry,rating,user_ratings_total,opening_hours,website,reviews",
        "key": settings.google_maps_api_key
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(details_url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") != "OK":
            raise HTTPException(status_code=404, detail="Provider not found")
        
        result = data.get("result", {})
        location = result.get("geometry", {}).get("location", {})
        
        return {
            "place_id": place_id,
            "name": result.get("name"),
            "phone": result.get("formatted_phone_number"),
            "address": result.get("formatted_address"),
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "rating": result.get("rating"),
            "total_ratings": result.get("user_ratings_total"),
            "website": result.get("website"),
            "opening_hours": result.get("opening_hours", {}).get("weekday_text"),
            "reviews": result.get("reviews", [])[:3]  # Limit reviews
        }