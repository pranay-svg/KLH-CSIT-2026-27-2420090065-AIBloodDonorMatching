import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db, get_db, get_db_mode
from app.services.seed_data import seed_donors_if_empty
from app.services.auth_service import seed_users_if_empty
from app.api.emergencies import seed_emergencies_if_empty
from app.api import donors_router, emergencies_router, matching_router, websockets_router, auth_router
from app.websocket.manager import manager
from app.metrics import HTTP_REQUESTS_TOTAL, HTTP_REQUEST_DURATION_SECONDS, get_metrics_response

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing application...")
    await init_db()
    
    if settings.AUTO_SEED_DATA:
        await seed_donors_if_empty()
        await seed_emergencies_if_empty()
        await seed_users_if_empty()
        
    logger.info("Backend successfully initialized and ready.")
    yield
    logger.info("Shutting down application...")
    await close_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Adaptive Software Engineering (ASE) Project: Real-time context-aware donor recommendation system "
        "for emergency hospital and blood bank operations.\n\n"
        "**ACADEMIC DEMONSTRATION NOTICE**: This system is a donor coordination and ranking tool. "
        "It does NOT make clinical transfusion decisions. Authorized hospital personnel make all final decisions."
    ),
    lifespan=lifespan
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom exception handler to format Pydantic validation errors into clean human-readable strings.
    Ensures 'detail' is always a single coherent string while preserving raw 'errors' for inspection.
    """
    error_messages = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field = ".".join([str(l) for l in loc if l != "body"])
        msg = err.get("msg", "Invalid value")
        if field:
            error_messages.append(f"{field}: {msg}")
        else:
            error_messages.append(msg)
    clean_detail = "; ".join(error_messages) if error_messages else "Request validation failed"
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, clean_detail)
    return JSONResponse(
        status_code=422,
        content={
            "detail": clean_detail,
            "errors": jsonable_encoder(exc.errors())
        }
    )

# Security & Observability HTTP Middleware
@app.middleware("http")
async def prometheus_and_security_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time

    # Normalize path to prevent label cardinality explosion
    endpoint = request.url.path
    if endpoint.startswith("/api/donors/") and endpoint != "/api/donors":
        parts = endpoint.split("/")
        if len(parts) >= 4 and parts[3] in ("status", "location", "response"):
            endpoint = f"/api/donors/{{id}}/{parts[3]}"
        else:
            endpoint = "/api/donors/{id}"
    elif endpoint.startswith("/api/emergencies/") and endpoint != "/api/emergencies":
        parts = endpoint.split("/")
        if len(parts) >= 4 and parts[3] in ("urgency", "status"):
            endpoint = f"/api/emergencies/{{id}}/{parts[3]}"
        else:
            endpoint = "/api/emergencies/{id}"
    elif endpoint.startswith("/api/matching/"):
        parts = endpoint.split("/")
        if len(parts) >= 4 and parts[2] == "weights":
            endpoint = "/api/matching/weights/{level}"
        elif endpoint == "/api/matching/weights":
            endpoint = "/api/matching/weights"
        else:
            endpoint = "/api/matching/{id}"

    HTTP_REQUESTS_TOTAL.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=str(response.status_code)
    ).inc()

    HTTP_REQUEST_DURATION_SECONDS.labels(
        method=request.method,
        endpoint=endpoint
    ).observe(duration)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"

    return response

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev and containerized frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(donors_router)
app.include_router(emergencies_router)
app.include_router(matching_router)
app.include_router(websockets_router)

@app.get("/metrics", tags=["Observability & Metrics"])
async def get_metrics():
    """Prometheus exposition format endpoint returning operational and adaptation metrics."""
    return get_metrics_response()

@app.get("/")
async def root():
    """Root landing endpoint with system status and API documentation links."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "database_mode": get_db_mode(),
        "documentation": "/docs",
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "auth": "/api/auth",
            "donors": "/api/donors",
            "emergencies": "/api/emergencies",
            "matching": "/api/matching",
            "websocket": "/ws"
        },
        "disclaimer": (
            "Academic Demonstration & Donor Coordination System. "
            "Authorized hospital/blood-bank personnel make all final decisions regarding transfusion and clinical eligibility."
        )
    }

@app.get("/health")
async def health_check():
    """System health check endpoint reporting active database mode and record counts."""
    db = get_db()
    donor_count = 0
    emergency_count = 0
    if db:
        donor_count = await db.donors.count_documents({})
        emergency_count = await db.emergencies.count_documents({})

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database_mode": get_db_mode(),
        "metrics": {
            "total_donors": donor_count,
            "total_emergencies": emergency_count,
            "active_websocket_clients": manager.client_count
        },

        "system_type": "Adaptive Software Engineering (ASE) Donor Coordination System",
        "clinical_notice": "For demonstration and recommendation purposes only. Not a medical transfusion device."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
