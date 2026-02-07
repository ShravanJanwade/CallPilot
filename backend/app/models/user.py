from pydantic import BaseModel, Field
from typing import Optional


class UserPreferences(BaseModel):
    prioritize: str = Field(default="earliest", example="earliest | closest | highest_rated")
    weight_availability: Optional[float] = None
    weight_rating: Optional[float] = None
    weight_distance: Optional[float] = None
    calendar_id: str = "primary"