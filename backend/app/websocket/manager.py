"""
WebSocket Connection Manager.

Manages active client connections, handles connection lifecycle,
and provides resilient broadcasting for real-time adaptation events.
Ensures zero-impact on REST operations even if no clients are connected
or if connections drop during transmission.
"""

import logging
from typing import List, Any, Union
from fastapi import WebSocket, WebSocketDisconnect

from app.metrics import WEBSOCKET_ACTIVE_CONNECTIONS, WEBSOCKET_EVENTS_TOTAL

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and handles broadcasts safely."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accepts and registers a new WebSocket client."""
        await websocket.accept()
        if websocket not in self.active_connections:
            self.active_connections.append(websocket)
        WEBSOCKET_ACTIVE_CONNECTIONS.set(len(self.active_connections))
        logger.info(f"WebSocket client connected. Total active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Safely unregisters a WebSocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        WEBSOCKET_ACTIVE_CONNECTIONS.set(len(self.active_connections))
        logger.info(f"WebSocket client disconnected. Total active clients: {len(self.active_connections)}")

    @property
    def client_count(self) -> int:
        """Returns number of active WebSocket connections."""
        return len(self.active_connections)

    async def send_personal_message(self, message: Union[dict, str], websocket: WebSocket) -> bool:
        """
        Sends a direct message to a specific WebSocket client.
        Catches disconnection errors gracefully.
        """
        try:
            if isinstance(message, (dict, list)):
                await websocket.send_json(message)
            else:
                await websocket.send_text(str(message))
            return True
        except (WebSocketDisconnect, RuntimeError, Exception) as exc:
            logger.warning(f"Failed to send personal message to client: {exc}")
            self.disconnect(websocket)
            return False

    async def broadcast(self, message: Union[dict, str]) -> int:
        """
        Broadcasts a message (dict or string) to all connected clients safely.

        Robustness guarantees:
        1. Never raises exceptions to the caller.
        2. Gracefully handles 0 connected clients (no-op).
        3. Automatically cleans up broken/disconnected sockets.
        4. Returns the number of successfully notified clients.
        """
        # Record event broadcast metric
        event_type = "RAW"
        if isinstance(message, dict):
            event_type = str(message.get("event_type", "UNKNOWN"))
        WEBSOCKET_EVENTS_TOTAL.labels(event_type=event_type).inc()

        if not self.active_connections:
            logger.debug("No active WebSocket clients connected. Broadcast skipped.")
            return 0

        successful_sends = 0
        stale_connections = []

        # Iterate over a snapshot to safely permit modification during iteration
        for connection in list(self.active_connections):
            try:
                if isinstance(message, (dict, list)):
                    await connection.send_json(message)
                else:
                    await connection.send_text(str(message))
                successful_sends += 1
            except (WebSocketDisconnect, RuntimeError, Exception) as exc:
                logger.debug(f"Client disconnected during broadcast: {exc}")
                stale_connections.append(connection)

        # Cleanup disconnected clients
        for connection in stale_connections:
            self.disconnect(connection)

        logger.debug(f"Broadcast sent to {successful_sends}/{len(self.active_connections) + len(stale_connections)} clients.")
        return successful_sends


# Singleton instance shared across FastAPI routers and background services
manager = ConnectionManager()
