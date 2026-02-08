from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Maps room_id (group_id or campaign_id) -> list of WebSockets
active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/transcript/{room_id}")
async def websocket_endpoint(ws: WebSocket, room_id: str):
    """
    Generic WebSocket endpoint for both groups and campaigns.
    Frontend connects to /ws/transcript/{group_id} to get updates for the whole group.
    """
    await ws.accept()
    if room_id not in active_connections:
        active_connections[room_id] = []
    active_connections[room_id].append(ws)
    logger.info(f"Client connected to session {room_id}")

    try:
        while True:
            # We don't expect much upstream data from client, but we need to keep connection open
            await ws.receive_text()
    except WebSocketDisconnect:
        if room_id in active_connections:
            try:
                active_connections[room_id].remove(ws)
                if not active_connections[room_id]:
                    del active_connections[room_id]
            except ValueError:
                pass
        logger.info(f"Client disconnected from session {room_id}")


async def broadcast(room_id: str, message: dict):
    """Push updates to all WebSocket clients in a room (group_id or campaign_id)."""
    if room_id in active_connections:
        dead = []
        for ws in active_connections[room_id]:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                active_connections[room_id].remove(ws)
            except ValueError:
                pass