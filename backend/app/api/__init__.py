from app.api.donors import router as donors_router
from app.api.emergencies import router as emergencies_router
from app.api.matching import router as matching_router
from app.api.websockets import router as websockets_router
from app.api.auth import router as auth_router

__all__ = ["donors_router", "emergencies_router", "matching_router", "websockets_router", "auth_router"]


