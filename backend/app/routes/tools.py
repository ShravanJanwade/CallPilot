"""
Tool webhook endpoints — ElevenLabs agent calls these mid-conversation.
Now with campaign tracking, WebSocket broadcasting, and Google Calendar integration.
"""
from fastapi import APIRouter, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging
import json
import asyncio

from app.tools.calendar_tool import CalendarService
from app.routes.ws import broadcast
from app.agents.swarm_orchestrator import CampaignManager

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for confirmed bookings
confirmed_bookings = []

# Google Calendar service (initialized lazily)
_calendar_service: Optional[CalendarService] = None


def get_calendar() -> CalendarService:
    global _calendar_service
    if _calendar_service is None:
        _calendar_service = CalendarService()
    return _calendar_service


# ---- Helper: Parse any request format ----
async def parse_request_body(request: Request) -> dict:
    """
    ElevenLabs may send data in unexpected formats.
    This helper logs the raw body and tries to parse it flexibly.
    Also extracts campaign_id and provider_id from dynamic variables.
    """
    raw_body = await request.body()
    raw_text = raw_body.decode("utf-8", errors="replace")
    logger.info(f"🔍 RAW REQUEST BODY: {raw_text}")
    logger.info(f"🔍 HEADERS: {dict(request.headers)}")

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error(f"❌ Failed to parse JSON: {raw_text}")
        data = {}

    # ElevenLabs sometimes nests params under a key
    # Try to flatten common patterns
    if "properties" in data and isinstance(data["properties"], dict):
        data = {**data, **data["properties"]}
    if "parameters" in data and isinstance(data["parameters"], dict):
        data = {**data, **data["parameters"]}
    
    # Look for dynamic_variables that might contain campaign_id/provider_id
    if "dynamic_variables" in data and isinstance(data["dynamic_variables"], dict):
        dv = data["dynamic_variables"]
        if "campaign_id" not in data and "campaign_id" in dv:
            data["campaign_id"] = dv["campaign_id"]
        if "provider_id" not in data and "provider_id" in dv:
            data["provider_id"] = dv["provider_id"]

    logger.info(f"🔍 PARSED DATA: {data}")
    return data


# ---- Endpoints ----

@router.post("/check-calendar")
async def check_calendar(request: Request):
    """Called by ElevenLabs agent when a provider offers a time slot."""
    data = await parse_request_body(request)

    proposed_date = data.get("proposed_date", "")
    proposed_time = data.get("proposed_time", "")
    duration_minutes = data.get("duration_minutes", 60)
    campaign_id = data.get("campaign_id", "")
    provider_id = data.get("provider_id", "")

    if not proposed_date or not proposed_time:
        logger.warning(f"⚠️ Missing date/time in request: {data}")
        return {
            "available": True,
            "message": "Could not parse date/time, assuming available. Please confirm the slot."
        }

    logger.info(f"📅 Calendar check: {proposed_date} at {proposed_time} ({duration_minutes}min) - Campaign: {campaign_id}, Provider: {provider_id}")

    # Broadcast tool called event
    if campaign_id:
        await broadcast(campaign_id, {
            "type": "tool_called",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "tool": "check_calendar",
            "params": {"date": proposed_date, "time": proposed_time}
        })

    # Try real Google Calendar check
    try:
        calendar = get_calendar()
        is_available = calendar.check_availability(proposed_date, proposed_time, duration_minutes)

        result = {
            "available": is_available,
            "message": (
                f"The user is free on {proposed_date} at {proposed_time}. You may proceed to confirm this slot."
                if is_available else
                f"The user has a conflict on {proposed_date} at {proposed_time}. Please ask for an alternative time."
            )
        }
    except Exception as e:
        logger.warning(f"⚠️ Google Calendar error (falling back to mock): {e}")
        # Fallback: mock logic — busy at 2 PM
        is_busy = proposed_time.startswith("14:")
        is_available = not is_busy
        result = {
            "available": is_available,
            "message": (
                f"The user is free on {proposed_date} at {proposed_time}. You may proceed to confirm this slot."
                if is_available else
                f"The user has a conflict on {proposed_date} at {proposed_time}. Please ask for an alternative time."
            )
        }

    # Broadcast result
    if campaign_id:
        await broadcast(campaign_id, {
            "type": "tool_result",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "tool": "check_calendar",
            "result": result
        })
        
        # If slot is available, broadcast slot_offered event
        if is_available:
            await broadcast(campaign_id, {
                "type": "slot_offered",
                "campaign_id": campaign_id,
                "provider_id": provider_id,
                "date": proposed_date,
                "time": proposed_time
            })
            
            # Update campaign manager
            CampaignManager.update_provider_result(campaign_id, provider_id, {
                "status": "negotiating",
                "offered_slot": {"date": proposed_date, "time": proposed_time}
            })

    return result


@router.post("/confirm-booking")
async def confirm_booking(request: Request):
    """Called by ElevenLabs agent after both parties agree on a slot."""
    data = await parse_request_body(request)

    provider_name = data.get("provider_name", "Unknown Provider")
    appointment_date = data.get("appointment_date", "")
    appointment_time = data.get("appointment_time", "")
    service_type = data.get("service_type", "Appointment")
    notes = data.get("notes", "")
    campaign_id = data.get("campaign_id", "")
    provider_id = data.get("provider_id", "")

    logger.info(f"✅ Booking confirmed: {provider_name} on {appointment_date} at {appointment_time} - Campaign: {campaign_id}")

    # Broadcast tool called event
    if campaign_id:
        await broadcast(campaign_id, {
            "type": "tool_called",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "tool": "confirm_booking",
            "params": {"provider": provider_name, "date": appointment_date, "time": appointment_time}
        })

    booking = {
        "id": len(confirmed_bookings) + 1,
        "provider_name": provider_name,
        "provider_id": provider_id,
        "campaign_id": campaign_id,
        "date": appointment_date,
        "time": appointment_time,
        "service": service_type,
        "notes": notes,
        "confirmed_at": datetime.utcnow().isoformat(),
        "calendar_event_id": None
    }

    # Try to create Google Calendar event
    try:
        calendar = get_calendar()
        event_id = calendar.create_event(
            summary=f"{service_type} at {provider_name}",
            date_str=appointment_date,
            time_str=appointment_time,
            duration_minutes=60,
            description=f"Booked by CallPilot\nProvider: {provider_name}\nService: {service_type}\nNotes: {notes}"
        )
        booking["calendar_event_id"] = event_id
        logger.info(f"📆 Google Calendar event created: {event_id}")
    except Exception as e:
        logger.warning(f"⚠️ Could not create Google Calendar event: {e}")

    confirmed_bookings.append(booking)

    # Update campaign manager and broadcast
    if campaign_id:
        CampaignManager.update_provider_result(campaign_id, provider_id, {
            "status": "booked",
            "provider_name": provider_name,
            "offered_slot": {"date": appointment_date, "time": appointment_time},
            "service_type": service_type,
            "notes": notes,
        })
        
        await broadcast(campaign_id, {
            "type": "booking_confirmed",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "booking": {
                "id": booking["id"],
                "provider_name": provider_name,
                "date": appointment_date,
                "time": appointment_time,
                "service": service_type,
                "calendar_event_created": booking["calendar_event_id"] is not None
            }
        })

    return {
        "success": True,
        "message": f"Appointment confirmed with {provider_name} on {appointment_date} at {appointment_time} for {service_type}.",
        "booking_id": booking["id"],
        "calendar_event_created": booking["calendar_event_id"] is not None
    }


@router.post("/no-availability")
async def no_availability(request: Request):
    """Called by ElevenLabs agent when a provider has no suitable slots."""
    data = await parse_request_body(request)

    provider_name = data.get("provider_name", "Unknown Provider")
    reason = data.get("reason", "No reason given")
    campaign_id = data.get("campaign_id", "")
    provider_id = data.get("provider_id", "")

    logger.info(f"❌ No availability: {provider_name} — {reason} - Campaign: {campaign_id}")

    # Broadcast tool called event
    if campaign_id:
        await broadcast(campaign_id, {
            "type": "tool_called",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "tool": "no_availability",
            "params": {"provider": provider_name, "reason": reason}
        })

    # Update campaign manager
    if campaign_id:
        CampaignManager.update_provider_result(campaign_id, provider_id, {
            "status": "no_availability",
            "provider_name": provider_name,
            "reason": reason,
        })
        
        await broadcast(campaign_id, {
            "type": "no_availability",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "provider_name": provider_name,
            "reason": reason
        })
        
        await broadcast(campaign_id, {
            "type": "call_ended",
            "campaign_id": campaign_id,
            "provider_id": provider_id,
            "status": "no_availability",
            "reason": reason
        })

    return {
        "success": True,
        "message": f"Noted that {provider_name} has no availability. Reason: {reason}. You may now end the call politely."
    }


@router.get("/bookings")
async def list_bookings():
    """View all confirmed bookings (for debugging/demo)."""
    return {"bookings": confirmed_bookings, "total": len(confirmed_bookings)}