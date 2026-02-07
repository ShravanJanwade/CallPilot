"""
Tool webhook endpoints — ElevenLabs agent calls these mid-conversation.
Now with raw request logging (to debug ElevenLabs format) and Google Calendar integration.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import logging
import json

from app.tools.calendar_tool import CalendarService

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


# ---- Request Models ----
class CheckCalendarRequest(BaseModel):
    proposed_date: str
    proposed_time: str
    duration_minutes: Optional[int] = 60


class ConfirmBookingRequest(BaseModel):
    provider_name: str
    appointment_date: str
    appointment_time: str
    service_type: str
    notes: Optional[str] = ""


class NoAvailabilityRequest(BaseModel):
    provider_name: str
    reason: str


# ---- Helper: Parse any request format ----
async def parse_request_body(request: Request) -> dict:
    """
    ElevenLabs may send data in unexpected formats.
    This helper logs the raw body and tries to parse it flexibly.
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
        data = data["properties"]
    if "parameters" in data and isinstance(data["parameters"], dict):
        data = data["parameters"]

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

    if not proposed_date or not proposed_time:
        logger.warning(f"⚠️ Missing date/time in request: {data}")
        return {
            "available": True,
            "message": "Could not parse date/time, assuming available. Please confirm the slot."
        }

    logger.info(f"📅 Calendar check: {proposed_date} at {proposed_time} ({duration_minutes}min)")

    # Try real Google Calendar check
    try:
        calendar = get_calendar()
        is_available = calendar.check_availability(proposed_date, proposed_time, duration_minutes)

        if not is_available:
            return {
                "available": False,
                "message": f"The user has a conflict on {proposed_date} at {proposed_time}. Please ask for an alternative time."
            }
        else:
            return {
                "available": True,
                "message": f"The user is free on {proposed_date} at {proposed_time}. You may proceed to confirm this slot."
            }
    except Exception as e:
        logger.warning(f"⚠️ Google Calendar error (falling back to mock): {e}")
        # Fallback: mock logic — busy at 2 PM
        is_busy = proposed_time.startswith("14:")
        if is_busy:
            return {
                "available": False,
                "message": f"The user has a conflict on {proposed_date} at {proposed_time}. Please ask for an alternative time."
            }
        return {
            "available": True,
            "message": f"The user is free on {proposed_date} at {proposed_time}. You may proceed to confirm this slot."
        }


@router.post("/confirm-booking")
async def confirm_booking(request: Request):
    """Called by ElevenLabs agent after both parties agree on a slot."""
    data = await parse_request_body(request)

    provider_name = data.get("provider_name", "Unknown Provider")
    appointment_date = data.get("appointment_date", "")
    appointment_time = data.get("appointment_time", "")
    service_type = data.get("service_type", "Appointment")
    notes = data.get("notes", "")

    logger.info(f"✅ Booking confirmed: {provider_name} on {appointment_date} at {appointment_time}")

    booking = {
        "id": len(confirmed_bookings) + 1,
        "provider_name": provider_name,
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

    logger.info(f"❌ No availability: {provider_name} — {reason}")

    return {
        "success": True,
        "message": f"Noted that {provider_name} has no availability. Reason: {reason}. You may now end the call politely."
    }


@router.get("/bookings")
async def list_bookings():
    """View all confirmed bookings (for debugging/demo)."""
    return {"bookings": confirmed_bookings, "total": len(confirmed_bookings)}