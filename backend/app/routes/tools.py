"""
Tool webhook endpoints — ElevenLabs agent calls these mid-conversation.
Includes campaign tracking + Google Calendar integration.
"""
from fastapi import APIRouter, Request
from typing import Optional
from datetime import datetime
import asyncio
import logging
import json
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)
from app import database as db

confirmed_bookings = []
_calendar_service = None


def get_calendar():
    global _calendar_service
    if _calendar_service is None:
        try:
            from app.tools.calendar_tool import CalendarService
            _calendar_service = CalendarService()
        except Exception as e:
            logger.warning(f"⚠️ Calendar not available: {e}")
    return _calendar_service


async def parse_body(request: Request) -> dict:
    raw = await request.body()
    text = raw.decode("utf-8", errors="replace")
    logger.info(f"🔍 RAW BODY: {text}")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = {}
    if "properties" in data and isinstance(data["properties"], dict):
        data = {**data, **data["properties"]}
    if "parameters" in data and isinstance(data["parameters"], dict):
        data = data["parameters"]
    logger.info(f"🔍 PARSED: {data}")
    return data


async def _track_campaign(campaign_id: str, provider_id: str, result_data: dict, broadcast_data: dict):
    """Update campaign state and broadcast to frontend."""
    if not campaign_id:
        return
    try:
        from app.agents.swarm_orchestrator import CampaignManager
        from app.routes.ws import broadcast
        # update_provider_result is now async
        group_id = await CampaignManager.update_provider_result(campaign_id, provider_id, result_data)
        if group_id:
            asyncio.create_task(broadcast(group_id, broadcast_data))
    except Exception as e:
        logger.error(f"⚠️ Campaign tracking error: {e}")


@router.post("/check-calendar")
async def check_calendar(request: Request):
    data = await parse_body(request)
    date = data.get("proposed_date", "")
    time = data.get("proposed_time", "")
    dur = data.get("duration_minutes", 60)
    cid = data.get("campaign_id", "")
    pid = data.get("provider_id", "")

    if not date or not time:
        return {"available": True, "message": "Could not parse date/time, assuming available."}

    logger.info(f"📅 Calendar check: {date} at {time} ({dur}min) [campaign={cid}]")

    # Track the tool call (now awaited)
    await _track_campaign(cid, pid, {}, {
        "type": "tool_called", "campaign_id": cid, "provider_id": pid,
        "tool": "check_calendar", "params": {"date": date, "time": time}
    })

    # Try real Google Calendar
    try:
        cal = get_calendar()
        if cal:
            available = cal.check_availability(date, time, dur)
            if not available:
                return {"available": False, "message": f"Conflict on {date} at {time}. Ask for alternative."}
            return {"available": True, "message": f"User is free on {date} at {time}. Proceed to confirm."}
    except Exception as e:
        logger.warning(f"⚠️ Calendar fallback: {e}")

    # Fallback mock: busy at 2 PM
    if time.startswith("14:"):
        return {"available": False, "message": f"Conflict on {date} at {time}. Ask for alternative."}
    return {"available": True, "message": f"User is free on {date} at {time}. Proceed to confirm."}

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
    data = await parse_body(request)
    cid = data.get("campaign_id", "")
    pid = data.get("provider_id", "")
    name = data.get("provider_name", "Unknown")
    date = data.get("appointment_date", "")
    time = data.get("appointment_time", "")
    svc = data.get("service_type", "Appointment")
    notes = data.get("notes", "")
    campaign_id = data.get("campaign_id", "")
    provider_id = data.get("provider_id", "")

    logger.info(f"✅ Booking: {name} on {date} at {time} [campaign={cid}]")

    booking = {
        "id": len(confirmed_bookings) + 1,
        "provider_name": name, "date": date, "time": time,
        "service": svc, "notes": notes,
        "confirmed_at": datetime.utcnow().isoformat(),
        "calendar_event_id": None,
    }

    # Create Google Calendar event
    try:
        cal = get_calendar()
        if cal and date and time:
            eid = cal.create_event(
                summary=f"{svc} at {name}", date_str=date, time_str=time,
                duration_minutes=60,
                description=f"Booked by CallPilot\nProvider: {name}\nService: {svc}\nNotes: {notes}"
            )
            booking["calendar_event_id"] = eid
            logger.info(f"📆 Calendar event: {eid}")
    except Exception as e:
        logger.warning(f"⚠️ Calendar event error: {e}")

    confirmed_bookings.append(booking)

    # --- DB PERSISTENCE: Save booking to database ---
    try:
        # Step 1: Find the provider in DB by place_id
        provider_db = None
        if pid and pid.strip():
            provider_db = await db.get_provider_by_place_id(pid)

        # Step 2: If not found by place_id, try to find by name
        if not provider_db and name:
            try:
                supabase = db.get_supabase()
                result = supabase.table("providers").select("*").eq("name", name).limit(1).execute()
                if result.data:
                    provider_db = result.data[0]
                    logger.info(f"💾 Found provider by name: {name} → {provider_db['id']}")
            except Exception:
                pass

        if provider_db and provider_db.get("id"):
            booking_data = {
                "provider_id": provider_db["id"],
                "service_type": svc,
                "appointment_date": date if date else datetime.utcnow().date().isoformat(),
                "appointment_time": time if time else "09:00",
                "notes": notes,
                "calendar_event_id": booking.get("calendar_event_id"),
                "status": "confirmed",
            }

            # Find user_id from the campaign mapping
            user_id = None
            try:
                from app.agents.swarm_orchestrator import conversation_map, campaign_groups
                # Try to find user_id from campaign group
                for gid, group in campaign_groups.items():
                    for camp in group.get("campaigns", []):
                        if camp.get("campaign_id") == cid:
                            user_id = group.get("user_id")
                            # Also add campaign DB id if available
                            if camp.get("db_id"):
                                booking_data["campaign_id"] = camp["db_id"]
                            break
                    if user_id:
                        break
            except Exception as e:
                logger.warning(f"⚠️ Could not find user_id from campaign: {e}")

            # Only insert if we have a valid user_id (required by DB)
            if user_id and user_id != "default" and len(str(user_id)) >= 32:
                booking_data["user_id"] = user_id
                db_booking = await db.create_booking(booking_data)
                logger.info(f"💾 Booking saved to DB: {db_booking['id']} for {name}")
            else:
                logger.info(f"📝 Booking for {name} tracked in memory only (no valid user_id)")
        else:
            logger.info(f"📝 Booking for {name} tracked in memory (provider not in DB)")
    except Exception as e:
        logger.warning(f"⚠️ DB booking save failed: {e}", exc_info=True)

    # Track in campaign (now awaited)
    await _track_campaign(cid, pid, {
        "status": "booked", "provider_name": name,
        "offered_slot": {"date": date, "time": time},
        "service_type": svc, "notes": notes,
    }, {
        "type": "booking_confirmed", "campaign_id": cid, "provider_id": pid,
        "provider_name": name, "date": date, "time": time, "service_type": svc,
    })

    return {
        "success": True, "booking_id": booking["id"],
        "message": f"Booked with {name} on {date} at {time} for {svc}.",
        "calendar_event_created": booking["calendar_event_id"] is not None,
    }


@router.post("/no-availability")
async def no_availability(request: Request):
    data = await parse_body(request)
    cid = data.get("campaign_id", "")
    pid = data.get("provider_id", "")
    name = data.get("provider_name", "Unknown")
    reason = data.get("reason", "No reason given")
    campaign_id = data.get("campaign_id", "")
    provider_id = data.get("provider_id", "")

    logger.info(f"❌ No availability: {name} — {reason} [campaign={cid}]")

    # Now awaited
    await _track_campaign(cid, pid, {
        "status": "no_availability", "provider_name": name, "reason": reason,
    }, {
        "type": "no_availability", "campaign_id": cid, "provider_id": pid,
        "provider_name": name, "reason": reason,
    })

    return {"success": True, "message": f"{name} has no availability: {reason}"}


@router.get("/bookings")
async def list_bookings():
    return {"bookings": confirmed_bookings, "total": len(confirmed_bookings)}