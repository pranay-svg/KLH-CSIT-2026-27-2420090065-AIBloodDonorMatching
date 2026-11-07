"""
WebSocket API Endpoint.

Provides the real-time bidirectional WebSocket interface (/ws)
for streaming adaptive matching events, status changes, and dynamic re-rankings.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint:
    1. Accepts and registers client.
    2. Sends initial connection acknowledgement.
    3. Keeps connection alive and receives optional client messages/pings.
    4. Handles disconnections cleanly.
    """
    await manager.connect(websocket)
    try:
        # Initial connection acknowledgment
        await websocket.send_json({
            "event_type": "CONNECTED",
            "message": "Connected to AI-Adaptive Blood Donor Matching WebSocket stream",
            "active_clients": manager.client_count
        })

        while True:
            # Listen for optional incoming messages from client (e.g. ping, heartbeat)
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await websocket.send_json({"event_type": "PONG"})
            else:
                logger.debug(f"Received message from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected cleanly.")
    except Exception as exc:
        logger.warning(f"WebSocket connection error: {exc}")
        manager.disconnect(websocket)
