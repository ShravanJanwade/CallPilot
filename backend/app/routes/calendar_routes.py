"""Calendar events endpoint — lets frontend show user's schedule."""
from fastapi import APIRouter
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

_cal = None

def _get_cal():
    global _cal
    if _cal is None:
        try:
            from app.tools.calendar_tool import CalendarService
            _cal = CalendarService()
        except Exception as e:
            logger.warning(f"⚠️ Calendar not available: {e}")
    return _cal


@router.get("/events")
async def get_events(start: str, end: str):
    """Get user's calendar events. start/end in YYYY-MM-DD format."""
    cal = _get_cal()
    if not cal:
        return {"events": [], "error": "Calendar not connected"}
    try:
        events = cal.get_events(start, end)
        return {"events": events}
    except Exception as e:
        logger.error(f"❌ Calendar events error: {e}")
        return {"events": [], "error": str(e)}