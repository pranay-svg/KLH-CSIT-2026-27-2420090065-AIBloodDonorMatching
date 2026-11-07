# Security, Compliance & Data Governance

**AI-Adaptive Blood Donor Matching System**

---

## 1. Ethical Healthcare Data Governance & PII Isolation

Under healthcare data privacy standards (such as HIPAA, GDPR, and Indian DISHA regulations), personal identifiable and clinical data must be handled with strict isolation.

### Principles Applied
1. **Zero PII in Observability**:
   - Prometheus metric labels strictly avoid any high-cardinality or sensitive personal information.
   - Allowed labels: `method`, `endpoint`, `status_code`, `emergency_level`, `blood_group`, `status_field`, `event_type`.
   - Prohibited labels: Donor names, patient names, phone numbers, email addresses, exact street addresses, or individual IDs.
2. **Synthetic Data for Development**:
   - The ML donor response training dataset contains zero real-world donor history. All 1,500 samples are generated algorithmically for academic demonstration.

---

## 2. Secrets Management & Environment Isolation

1. **Git Exclusions**:
   - Root `.gitignore` explicitly prevents `.env`, `*.pem`, `*.key`, and credentials from entering version control.
2. **Environment Template**:
   - `.env.example` provides a sanitized configuration template containing only non-sensitive local development defaults.
3. **Container Credentials**:
   - Production Docker deployments pass credentials and connection strings via runtime environment variables rather than hardcoding in Dockerfiles.

---

## 3. API Input Validation & Defense in Depth

FastAPI models utilize Pydantic v2 schemas to enforce strict type and boundary validations:

```python
class DonorBase(BaseModel):
    name: str = Field(...)
    blood_group: str = Field(...)
    age: int = Field(..., ge=18, le=65)  # Statutory donor age window
    latitude: float = Field(..., ge=-90.0, le=90.0)    # Geographic latitude boundary
    longitude: float = Field(..., ge=-180.0, le=180.0) # Geographic longitude boundary
    donation_count: int = Field(default=0, ge=0)
    days_since_last_donation: int = Field(default=90, ge=0)
    historical_acceptance_rate: float = Field(default=0.85, ge=0.0, le=1.0)
    avg_response_time_mins: float = Field(default=12.5, ge=0.0)

class EmergencyRequestBase(BaseModel):
    units_needed: int = Field(default=2, ge=1, le=10) # Bounded emergency units
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
```

Requests violating these constraints fail immediately with `422 Unprocessable Entity`, preventing SQL/NoSQL injection vectors and numeric overflow exploits.

---

## 4. HTTP Security Headers

The FastAPI middleware pipeline injects standard defensive headers on all HTTP responses:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
- `X-Frame-Options: DENY`: Prevents clickjacking attacks by forbidding iframe rendering.

In the frontend Nginx reverse proxy:
- `X-Frame-Options: "SAMEORIGIN"`
- `X-XSS-Protection: "1; mode=block"`
- `Referrer-Policy: "strict-origin-when-cross-origin"`

---

## 5. Automated Security Verification

The automated script `scripts/security_check.py` validates five core security controls before deployment:
1. Regex scanning across source files for leaked API keys, tokens, or private keys.
2. Verification of `.gitignore` and `.env.example` coverage.
3. Schema boundary testing (rejection of out-of-bounds inputs).
4. Response header validation.
5. Scrape payload audit ensuring zero donor names or phones appear in `/metrics`.

In addition, GitHub Actions runs **Aquasecurity Trivy** to audit filesystem dependencies for known CVEs.
