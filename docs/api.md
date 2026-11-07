# REST & WebSocket API Specification

**AI-Adaptive Blood Donor Matching System**

Base URL: `http://localhost:8001`  
WebSocket Stream: `ws://localhost:8001/ws`  
Interactive Swagger Docs: `http://localhost:8001/docs`

---

## 1. System & Observability Endpoints

### `GET /`
Returns root landing status, documentation URLs, active database mode, and clinical disclaimer.

### `GET /health`
Returns system health, database mode (`mongodb` or `in_memory`), active record counts, and WebSocket client connections.

```json
{
  "status": "healthy",
  "timestamp": "2026-09-10T14:00:00.000000+00:00",
  "version": "1.0.0",
  "environment": "production",
  "database_mode": "in_memory",
  "metrics": {
    "total_donors": 20,
    "total_emergencies": 2,
    "active_websocket_clients": 1
  },
  "system_type": "Adaptive Software Engineering (ASE) Donor Coordination System",
  "clinical_notice": "For demonstration and recommendation purposes only. Not a medical transfusion device."
}
```

### `GET /metrics`
Exposes Prometheus exposition format metrics for scrapers. Includes HTTP throughput, request latency, matching calculations, emergency creation rates, and WebSocket event dynamics.

---

## 2. Donors API (`/api/donors`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/donors` | List donors with optional query filters (`blood_group`, `is_available`, `is_eligible`) |
| `GET` | `/api/donors/{id}` | Get single donor details |
| `POST` | `/api/donors` | Register a new donor |
| `PUT` | `/api/donors/{id}` | Update donor profile |
| `PATCH` | `/api/donors/{id}/status` | Update availability/eligibility (triggers WebSocket recalculation) |
| `PATCH` | `/api/donors/{id}/location` | Update GPS coordinates (triggers WebSocket geo-adaptation) |
| `POST` | `/api/donors/{id}/response` | Simulate donor dispatch response (`ACCEPTED` / `DECLINED`) |
| `POST` | `/api/donors/seed/reset` | Reset donor pool to the benchmark 20 records |
| `DELETE` | `/api/donors/{id}` | Remove donor record |

---

## 3. Emergencies API (`/api/emergencies`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/emergencies` | List emergency blood requests with status/urgency filters |
| `GET` | `/api/emergencies/{id}` | Get single emergency request |
| `POST` | `/api/emergencies` | Create an emergency request |
| `PATCH` | `/api/emergencies/{id}/urgency` | Escalate/de-escalate urgency (`Routine`, `Urgent`, `Critical`) |
| `PATCH` | `/api/emergencies/{id}/status` | Update lifecycle (`Open`, `Matched`, `Fulfilled`, `Cancelled`) |
| `DELETE` | `/api/emergencies/{id}` | Delete emergency request |

---

## 4. Matching & Adaptive Engine API (`/api/matching`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/matching/weights` | Get MCDM criteria weights for all urgency levels |
| `GET` | `/api/matching/weights/{level}` | Get active weights for a specific level (`Routine`, `Urgent`, `Critical`) |
| `GET` | `/api/matching/{emergency_id}` | Execute Adaptive MCDM matching engine and return ranked donors |

---

## 5. Real-Time WebSocket API (`/ws`)

### Connection Lifecycle
- **Connect**: Client connects to `ws://localhost:8001/ws`. Server sends `CONNECTED` acknowledgment with active client count.
- **Keepalive**: Client sends `"ping"`, server replies `{"event_type": "PONG"}`.
- **Disconnect**: Clean closure automatically unregisters client from broadcast group.

### Broadcast Event Types
1. `DONOR_STATUS_CHANGED`: Emitted on donor availability/eligibility toggles.
2. `DONOR_LOCATION_CHANGED`: Emitted on donor mobility coordinate shifts.
3. `EMERGENCY_URGENCY_CHANGED`: Emitted on emergency triage escalation.
4. `DONOR_RESPONSE_RECEIVED`: Emitted when candidate acknowledges mobilization.
5. `MATCHING_RECALCULATED`: Emitted with re-ranked candidates and explainable rationales.
