from fastapi import APIRouter

router = APIRouter()


@router.get("/search")
async def search_providers(category: str, location: str, max_results: int = 10):
    """Search for providers by category and location."""
    # TODO: Integrate Google Places API
    return {"providers": [], "message": "Google Places integration pending"}