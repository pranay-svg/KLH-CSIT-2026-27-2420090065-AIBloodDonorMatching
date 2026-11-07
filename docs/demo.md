# End-to-End Academic Demonstration Walkthrough

**AI-Adaptive Blood Donor Matching System**  
*Academic Viva & Evaluation Guide*

---

## 1. Quick Start Commands

### Terminal 1: Backend Server
```powershell
backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
- Swagger Docs: `http://localhost:8001/docs`
- Health Endpoint: `http://localhost:8001/health`
- Prometheus Metrics: `http://localhost:8001/metrics`
- WebSocket Stream: `ws://localhost:8001/ws`

### Terminal 2: React Command Center Frontend
```powershell
cd frontend
npm run dev
```
- Open browser at `http://localhost:5173`

---

## 2. Automated Demonstration Script (13 Steps)

You can run the fully automated end-to-end demonstration script:
```powershell
backend\venv\Scripts\python.exe backend/verify_stage4_demo.py
```

### Scenario Execution Flow
1. **Step 0 — Database Reset**: Calls `POST /api/donors/seed/reset` to ensure clean benchmark state (20 benchmark donors).
2. **Step A — Emergency Request Creation**: Creates an $O^+$ Routine emergency at Victoria Hospital Trauma Center (`POST /api/emergencies`).
3. **Step B — Initial Donor Ranking**: Evaluates candidates via Multi-Criteria Decision Making (MCDM). Top candidate is `Dr. Aarav Patel` ($O^+$).
4. **Step C & D — Score Breakdown**: Explains the composite priority score breakdown (Compatibility: 100%, Distance: 93.6%, ML Response Probability: 76.9%, Fatigue: 52.4%, Routine Weights: $w_{comp}=0.30, w_{dist}=0.35, w_{ml}=0.25, w_{fatigue}=0.10$).
5. **Step E & F — Urgency Escalation**: Triage level shifts `Routine` $\to$ `Critical` via `PATCH /api/emergencies/{id}/urgency`. Broadcasts `EMERGENCY_URGENCY_CHANGED` over WebSocket. Distance weight jumps to $0.50$ and fatigue penalty drops to $0.05$.
6. **Step G — Real-Time Re-Ranking**: Server automatically emits `MATCHING_RECALCULATED`. React Command Center updates rankings live without refreshing the browser.
7. **Step H & I — Donor Unavailability Handling**: Top candidate is toggled to unavailable (`PATCH /api/donors/{id}/status`). Emits `DONOR_STATUS_CHANGED`. Backup candidate `Priyanka Nair` ($O^-$) is automatically promoted to Rank #1.
8. **Step J & K — Donor Geo-Mobility**: Backup donor updates GPS coordinates to Victoria Hospital gate (`PATCH /api/donors/{id}/location`). Emits `DONOR_LOCATION_CHANGED`.
9. **Step L — Proximity Re-Ranking**: Updated transit distance drops to $0.21\text{ km}$ (ETA $5.4\text{ mins}$) and priority score updates to $82.4\%$.
10. **Step M — Live Activity Telemetry**: Activity panel logs all broadcasted WebSocket adaptation events.

---

## 3. Observability Demonstration (Prometheus & Grafana)

1. Open `http://localhost:8001/metrics` to view live Prometheus metric text exposition:
   - `http_requests_total`: Shows request counts by endpoint and HTTP status.
   - `http_request_duration_seconds_bucket`: Latency histogram.
   - `matching_requests_total`: Matching counts by urgency level.
   - `websocket_active_connections`: Gauge showing active browser clients.
   - `websocket_events_total`: Events broadcasted by event type.
2. If Docker Compose is running (`docker compose up`), navigate to `http://localhost:3000` (Grafana, `admin`/`admin`):
   - Open **"AI-Adaptive Blood Donor Matching Dashboard"** to see live graphs of request throughput, P95 latencies, active WebSocket connections, and emergency triage distributions.

---

## 4. Academic Viva Talking Points

1. **Why Adaptive Software Engineering?**  
   Emergency blood matching cannot use static rules. When triage urgency escalates from Routine to Critical, the system shifts optimization weights dynamically to prioritize immediate proximity and rapid response.
2. **Explainable AI vs. Black-Box Scoring**:  
   Every donor recommendation includes an explicit breakdown of biological compatibility, distance, predicted response probability, and donor fatigue penalty, eliminating black-box opacity for clinical staff.
3. **Resilient Closed-Loop Synchronization**:  
   Changes in donor availability, donor mobility, or hospital triage trigger automated re-ranking via WebSockets with zero page reloads and graceful handling of zero connected clients.
