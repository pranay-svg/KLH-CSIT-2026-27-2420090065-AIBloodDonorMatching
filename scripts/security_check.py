"""
Stage 5 Security & Data Governance Verification Script.

Automates academic compliance checks:
1. Secrets Audit: Verifies no sensitive keys/tokens hardcoded in codebase.
2. Environment Configuration: Verifies .gitignore properly protects .env.
3. API Input Validation: Verifies Pydantic boundaries on coordinates & blood units.
4. Security Headers: Verifies HTTP response security headers (X-Frame-Options, X-Content-Type-Options).
5. Observability Data Governance: Verifies Prometheus /metrics never leaks donor PII.
"""

import sys
import os
import re
from fastapi.testclient import TestClient

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

def check_no_hardcoded_secrets():
    print("[1/5] Checking for hardcoded secrets...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    patterns = [
        re.compile(r'(?i)(api[_-]?key|secret[_-]?key|password|bearer)\s*=\s*["\'][A-Za-z0-9_\-\.]{16,}["\']'),
        re.compile(r'-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----')
    ]

    suspicious_found = []
    for dirpath, _, filenames in os.walk(root_dir):
        if any(ignored in dirpath for ignored in [".git", "venv", "node_modules", ".pytest_cache", "dist"]):
            continue
        for fname in filenames:
            if fname.endswith((".py", ".js", ".jsx", ".json", ".yml", ".yaml")):
                fpath = os.path.join(dirpath, fname)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        for p in patterns:
                            if p.search(content):
                                suspicious_found.append(fpath)
                except Exception:
                    pass

    assert len(suspicious_found) == 0, f"Potential secrets found in: {suspicious_found}"
    print(" -> PASSED: No hardcoded secrets detected in source tree.")

def check_env_protection():
    print("[2/5] Checking environment variable protection & .gitignore...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    gitignore_path = os.path.join(root_dir, ".gitignore")
    assert os.path.exists(gitignore_path), ".gitignore file is missing!"
    
    with open(gitignore_path, "r", encoding="utf-8") as f:
        gi_content = f.read()
        assert ".env" in gi_content, ".env is not excluded in .gitignore!"
        assert "venv" in gi_content, "venv is not excluded in .gitignore!"
        assert "node_modules" in gi_content, "node_modules is not excluded in .gitignore!"

    example_env = os.path.join(root_dir, ".env.example")
    assert os.path.exists(example_env), ".env.example template is missing!"
    print(" -> PASSED: .gitignore and .env.example are properly configured.")

def check_input_validation():
    print("[3/5] Checking API schema boundary validation...")
    client = TestClient(app)

    # 1. Invalid coordinates for emergency
    res_bad_coords = client.post("/api/emergencies", json={
        "patient_name": "Test Patient",
        "hospital_name": "Test Hospital",
        "required_blood_group": "O+",
        "units_needed": 2,
        "latitude": 999.0, # Invalid latitude > 90
        "longitude": 77.0
    })
    assert res_bad_coords.status_code == 422, f"Expected 422 for invalid latitude, got {res_bad_coords.status_code}"

    # 2. Invalid units needed (0 or negative)
    res_bad_units = client.post("/api/emergencies", json={
        "patient_name": "Test Patient",
        "hospital_name": "Test Hospital",
        "required_blood_group": "O+",
        "units_needed": 0, # Invalid units < 1
        "latitude": 12.97,
        "longitude": 77.59
    })
    assert res_bad_units.status_code == 422, f"Expected 422 for invalid units, got {res_bad_units.status_code}"

    # 3. Invalid donor age (< 18)
    res_bad_age = client.post("/api/donors", json={
        "name": "Underage Donor",
        "blood_group": "B+",
        "age": 15,
        "gender": "Male",
        "phone": "+91 99999 99999",
        "email": "underage@example.com",
        "latitude": 12.97,
        "longitude": 77.59,
        "address": "Bangalore"
    })
    assert res_bad_age.status_code == 422, f"Expected 422 for underage donor, got {res_bad_age.status_code}"

    print(" -> PASSED: Input validation rejects out-of-bounds coordinates, units, and age.")

def check_security_headers():
    print("[4/5] Checking HTTP response security headers...")
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    print(" -> PASSED: Security headers (X-Content-Type-Options, X-Frame-Options) present.")

def check_metrics_pii_protection():
    print("[5/5] Checking Prometheus /metrics data governance (PII protection)...")
    client = TestClient(app)
    res = client.get("/metrics")
    assert res.status_code == 200
    content = res.text

    # Verify no donor PII patterns exist in the scraped metrics
    pii_indicators = ["Aarav", "Pooja", "Vikram", "Sneha", "+91", "@example.com", "Indiranagar", "Koramangala"]
    for pii in pii_indicators:
        assert pii not in content, f"Sensitive PII indicator '{pii}' leaked in /metrics!"

    assert "http_requests_total" in content
    assert "matching_requests_total" in content
    assert "websocket_active_connections" in content
    print(" -> PASSED: /metrics exposes operational metrics with zero donor PII.")

def main():
    print("=" * 60)
    print("STAGE 5 SECURITY & ETHICAL DATA GOVERNANCE AUDIT")
    print("=" * 60)
    check_no_hardcoded_secrets()
    check_env_protection()
    check_input_validation()
    check_security_headers()
    check_metrics_pii_protection()
    print("=" * 60)
    print("ALL SECURITY VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
