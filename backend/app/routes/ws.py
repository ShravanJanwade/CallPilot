from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/campaign/{campaign_id}")
async def campaign_stream(ws: WebSocket, campaign_id: str):
    await ws.accept()
    if campaign_id not in active_connections:
        active_connections[campaign_id] = []
    active_connections[campaign_id].append(ws)
    logger.info(f"Client connected to campaign session {campaign_id}")

    try:
        while True:
            data = await ws.receive_text()
    except WebSocketDisconnect:
        if campaign_id in active_connections:
            active_connections[campaign_id].remove(ws)
        logger.info(f"Client disconnected from campaign session {campaign_id}")


async def broadcast(campaign_id: str, message: dict):
    if campaign_id in active_connections:
        for ws in active_connections[campaign_id]:
            await ws.send_text(json.dumps(message))