from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/transcript/{session_id}")
async def transcript_stream(ws: WebSocket, session_id: str):
    await ws.accept()
    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(ws)
    logger.info(f"Client connected to session {session_id}")

    try:
        while True:
            data = await ws.receive_text()
    except WebSocketDisconnect:
        active_connections[session_id].remove(ws)
        logger.info(f"Client disconnected from session {session_id}")


async def broadcast(session_id: str, message: dict):
    if session_id in active_connections:
        for ws in active_connections[session_id]:
            await ws.send_text(json.dumps(message))