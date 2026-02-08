"""
Calendar routes — fetch user calendar events.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import httpx
import logging

from app.config import settings
from app.routes.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/events")
async def get_calendar_events(
    start: str = Query(..., description="Start date (ISO format)"),
    end: str = Query(..., description="End date (ISO format)"),
    user: dict = Depends(get_current_user)
):
    """Get events from the user's primary Google Calendar."""
    
    access_token = user.get("google_access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Google authentication required")
    
    # Format dates for Google API (RFC3339)
    # Append time to make it full ISO format if just date provided
    if "T" not in start:
        time_min = f"{start}T00:00:00Z"
    else:
        time_min = start
        
    if "T" not in end:
        time_max = f"{end}T23:59:59Z"
    else:
        time_max = end
        
    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    params = {
        "timeMin": time_min,
        "timeMax": time_max,
        "singleEvents": True,
        "orderBy": "startTime"
    }
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers)
            
            # If token expired, try to refresh
            if response.status_code == 401 and user.get("google_refresh_token"):
                logger.info("🔄 Access token expired, refreshing...")
                
                refresh_url = "https://oauth2.googleapis.com/token"
                refresh_data = {
                    "client_id": settings.google_oauth_client_id,
                    "client_secret": settings.google_oauth_client_secret,
                    "refresh_token": user["google_refresh_token"],
                    "grant_type": "refresh_token"
                }
                
                refresh_res = await client.post(refresh_url, data=refresh_data)
                
                if refresh_res.status_code == 200:
                    tokens = refresh_res.json()
                    new_access_token = tokens.get("access_token")
                    
                    # Update user in DB (in-memory specific hack)
                    from app.routes.auth import users_db
                    if user["id"] in users_db:
                        users_db[user["id"]]["google_access_token"] = new_access_token
                        logger.info("✅ Token refreshed and saved")
                    
                    # Retry request with new token
                    headers["Authorization"] = f"Bearer {new_access_token}"
                    response = await client.get(url, params=params, headers=headers)
                else:
                    logger.error(f"Failed to refresh token: {refresh_res.text}")
                    # Continue to let it fail with 401
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Token expired, please re-login")
                
            response.raise_for_status()
            data = response.json()
            
            items = data.get("items", [])
            events = []
            
            for item in items:
                # Skip cancelled events
                if item.get("status") == "cancelled":
                    continue
                    
                start = item.get("start", {})
                end = item.get("end", {})
                
                # Handle all-day events vs timed events
                start_time = start.get("dateTime") or start.get("date")
                end_time = end.get("dateTime") or end.get("date")
                
                events.append({
                    "id": item.get("id"),
                    "title": item.get("summary", "Busy"),
                    "start": start_time,
                    "end": end_time,
                    "allDay": "date" in start
                })
                
            return {"events": events}
            
        except httpx.RequestError as e:
            logger.error(f"HTTP error fetching calendar events: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch calendar events")
