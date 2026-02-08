"""WebSocket manager — push real-time updates to frontend."""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)

# Maps room_id (group_id or campaign_id) -> list of WebSockets
active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/transcript/{room_id}")
async def websocket_endpoint(ws: WebSocket, room_id: str):
    await ws.accept()
    if room_id not in active_connections:
        active_connections[room_id] = []
    active_connections[room_id].append(ws)
    logger.info(f"📡 WS connected: {room_id} ({len(active_connections[room_id])} clients)")
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if room_id in active_connections and ws in active_connections[room_id]:
            active_connections[room_id].remove(ws)
        logger.info(f"📡 WS disconnected: {room_id}")


async def broadcast(room_id: str, message: dict):
    """Send message to all WebSocket clients in a room."""
    if room_id not in active_connections or not active_connections[room_id]:
        return
    msg = json.dumps(message, default=str)
    dead = []
    for ws in active_connections[room_id]:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        active_connections[room_id].remove(ws)