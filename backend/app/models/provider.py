from pydantic import BaseModel, Field
from typing import Optional


class Provider(BaseModel):
    id: str
    name: str
    phone: str
    address: str
    category: str
    google_rating: float = Field(ge=0, le=5)
    total_reviews: int = 0
    latitude: float
    longitude: float
    distance_miles: Optional[float] = None


class ProviderRanking(BaseModel):
    provider: Provider
    availability_score: float
    rating_score: float
    distance_score: float
    preference_score: float
    total_score: float