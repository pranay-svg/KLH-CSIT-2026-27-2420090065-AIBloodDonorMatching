"""
Prometheus Metrics Instrumentation for AI-Adaptive Blood Donor Matching System.

ACADEMIC OBSERVABILITY & ETHICAL METRICS NOTICE:
Tracks operational performance, real-time adaptation rates, and API activity.
Under strict health informatics data governance, NO Protected Health Information (PHI)
or Personally Identifiable Information (PII) such as donor names, contact numbers,
exact street addresses, or individual patient IDs are ever exposed in metric labels.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

# 1. HTTP API Request Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total count of HTTP requests received across API endpoints",
    ["method", "endpoint", "status_code"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request processing latency in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
)

# 2. Adaptive MCDM Matching Engine Metrics
MATCHING_REQUESTS_TOTAL = Counter(
    "matching_requests_total",
    "Total count of donor matching calculations requested",
    ["emergency_level"]
)

MATCHING_DURATION_SECONDS = Histogram(
    "matching_duration_seconds",
    "Latency of multi-criteria donor ranking algorithm in seconds",
    ["emergency_level"],
    buckets=(0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)

MATCHING_RECALCULATIONS_TOTAL = Counter(
    "matching_recalculations_total",
    "Total count of automated adaptive matching recalculations triggered by context events",
    ["emergency_level"]
)

# 3. Emergency Triage Metrics
EMERGENCY_CREATED_TOTAL = Counter(
    "emergency_created_total",
    "Total count of emergency blood requests created",
    ["urgency_level", "blood_group"]
)

EMERGENCY_URGENCY_CHANGES_TOTAL = Counter(
    "emergency_urgency_changes_total",
    "Total count of emergency urgency level modifications",
    ["old_level", "new_level"]
)

# 4. Donor Pool Dynamics Metrics
DONOR_STATUS_CHANGES_TOTAL = Counter(
    "donor_status_changes_total",
    "Total count of donor availability or eligibility state changes",
    ["status_field"]
)

DONOR_LOCATION_CHANGES_TOTAL = Counter(
    "donor_location_changes_total",
    "Total count of donor coordinate update / mobility events"
)

# 5. Real-time WebSocket Metrics
WEBSOCKET_ACTIVE_CONNECTIONS = Gauge(
    "websocket_active_connections",
    "Number of currently connected WebSocket clients receiving adaptation events"
)

WEBSOCKET_EVENTS_TOTAL = Counter(
    "websocket_events_total",
    "Total number of real-time events broadcasted over WebSocket",
    ["event_type"]
)


def get_metrics_response() -> Response:
    """Generates Prometheus standard text format payload."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
