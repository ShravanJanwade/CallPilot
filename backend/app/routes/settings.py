"""
User settings routes — manage user preferences and defaults.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from app.routes.auth import get_current_user, users_db

router = APIRouter()
logger = logging.getLogger(__name__)


# ---- Models ----

class UserSettings(BaseModel):
    phone_number: Optional[str] = ""
    default_weight_availability: int = 40
    default_weight_rating: int = 30
    default_weight_distance: int = 20
    default_weight_preference: int = 10
    default_agent_name: str = "Alex"
    default_first_message: str = ""
    calendar_id: str = "primary"
    timezone: str = ""


class SettingsUpdateRequest(BaseModel):
    phone_number: Optional[str] = None
    default_weight_availability: Optional[int] = None
    default_weight_rating: Optional[int] = None
    default_weight_distance: Optional[int] = None
    default_weight_preference: Optional[int] = None
    default_agent_name: Optional[str] = None
    default_first_message: Optional[str] = None
    calendar_id: Optional[str] = None
    timezone: Optional[str] = None


# ---- Endpoints ----

@router.get("", response_model=UserSettings)
async def get_settings(user: dict = Depends(get_current_user)):
    """Get user settings."""
    settings = user.get("settings", {})
    
    return UserSettings(
        phone_number=settings.get("phone_number", ""),
        default_weight_availability=settings.get("default_weight_availability", 40),
        default_weight_rating=settings.get("default_weight_rating", 30),
        default_weight_distance=settings.get("default_weight_distance", 20),
        default_weight_preference=settings.get("default_weight_preference", 10),
        default_agent_name=settings.get("default_agent_name", "Alex"),
        default_first_message=settings.get("default_first_message", ""),
        calendar_id=settings.get("calendar_id", "primary"),
        timezone=settings.get("timezone", "")
    )


@router.put("", response_model=UserSettings)
async def update_settings(request: SettingsUpdateRequest, user: dict = Depends(get_current_user)):
    """Update user settings."""
    
    if "settings" not in user:
        user["settings"] = {}
    
    # Update only provided fields
    if request.phone_number is not None:
        user["settings"]["phone_number"] = request.phone_number
    if request.default_weight_availability is not None:
        user["settings"]["default_weight_availability"] = request.default_weight_availability
    if request.default_weight_rating is not None:
        user["settings"]["default_weight_rating"] = request.default_weight_rating
    if request.default_weight_distance is not None:
        user["settings"]["default_weight_distance"] = request.default_weight_distance
    if request.default_weight_preference is not None:
        user["settings"]["default_weight_preference"] = request.default_weight_preference
    if request.default_agent_name is not None:
        user["settings"]["default_agent_name"] = request.default_agent_name
    if request.default_first_message is not None:
        user["settings"]["default_first_message"] = request.default_first_message
    if request.calendar_id is not None:
        user["settings"]["calendar_id"] = request.calendar_id
    if request.timezone is not None:
        user["settings"]["timezone"] = request.timezone
    
    # Save to in-memory store
    users_db[user["id"]] = user
    
    logger.info(f"⚙️ Settings updated for user {user['email']}")
    
    return await get_settings(user)
