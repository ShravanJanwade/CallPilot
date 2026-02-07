from fastapi import APIRouter, BackgroundTasks
from app.models.appointment import BookingRequest, BookingSession, BookingStatus
import uuid

router = APIRouter()

sessions: dict[str, BookingSession] = {}


@router.post("/start", response_model=dict)
async def start_booking(req: BookingRequest, bg: BackgroundTasks):
    session_id = str(uuid.uuid4())
    session = BookingSession(session_id=session_id, request=req)
    sessions[session_id] = session
    return {"session_id": session_id, "status": "started"}


@router.get("/status/{session_id}", response_model=BookingSession)
async def get_booking_status(session_id: str):
    session = sessions.get(session_id)
    if not session:
        return {"error": "Session not found"}
    return session


@router.post("/confirm/{session_id}")
async def confirm_booking(session_id: str, provider_id: str):
    session = sessions.get(session_id)
    if not session:
        return {"error": "Session not found"}
    session.status = BookingStatus.BOOKED
    return {"status": "confirmed", "provider_id": provider_id}