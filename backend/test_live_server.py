import sys
import time
import requests
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
AUDIO_FILE = BACKEND_DIR / "uploads" / "swarsanket_20260905_103216_dc24d59e.webm"

if not AUDIO_FILE.exists():
    raise FileNotFoundError(f"Target audio file {AUDIO_FILE} not found.")

BASE_URL = "http://127.0.0.1:8001"

print("=" * 80)
print("SwarSanket STEP 96G-F: Live Uvicorn HTTP Server Verification")
print("=" * 80)
print(f"Target URL:        {BASE_URL}")
print(f"Target Audio File: {AUDIO_FILE}")

# 1. Health Check
print("\n[1/3] Sending real HTTP GET to /api/health...")
try:
    res_health = requests.get(f"{BASE_URL}/api/health", timeout=10)
    print(f"  HTTP Status: {res_health.status_code}")
    print(f"  Body:        {res_health.json()}")
    assert res_health.status_code == 200, f"Expected 200, got {res_health.status_code}"
    assert res_health.json().get("status") == "ok", "Health status != ok"
    print("  [PASS] Live GET /api/health verified.")
except Exception as e:
    print(f"  [FAIL] Health check failed: {e}")
    sys.exit(1)

# 2. Live Screening POST Pass 1
print("\n[2/3] Sending real HTTP POST to /api/analyze-audio (Pass 1)...")
t0 = time.time()
with open(AUDIO_FILE, "rb") as f:
    res_post_1 = requests.post(
        f"{BASE_URL}/api/analyze-audio",
        files={"audio": ("real_voice_check.webm", f, "audio/webm")},
        timeout=60,
    )
elapsed_1 = time.time() - t0

print(f"  HTTP Status:           {res_post_1.status_code} (took {elapsed_1:.2f}s)")
assert res_post_1.status_code == 200, f"Expected 200, got {res_post_1.status_code}: {res_post_1.text}"

data_1 = res_post_1.json()
assert data_1.get("success") is True, "success != True"
assert "transcript" in data_1 and len(data_1["transcript"]) > 0, "Missing transcript"
assert len(data_1.get("production_features", {})) == 20, "Expected 20 production features"
assert data_1.get("imputation", {}).get("live_feature_count") == 8, "Expected 8 live features"
assert data_1.get("imputation", {}).get("imputed_feature_count") == 12, "Expected 12 imputed features"

scr_1 = data_1.get("screening", {})
pred_1 = scr_1.get("predicted_class")
prob_1 = scr_1.get("probability")
prob_pct_1 = scr_1.get("probability_percent")
conf_pct_1 = scr_1.get("technical_confidence_percent")
status_1 = scr_1.get("status")
interp_1 = scr_1.get("interpretation")

print(f"  Transcript:            \"{data_1['transcript']}\"")
print(f"  Predicted Class:       {pred_1} ({status_1})")
print(f"  Probability:           {prob_1:.6f} ({prob_pct_1}%)")
print(f"  Technical Confidence:  {conf_pct_1}%")
print(f"  Interpretation:        \"{interp_1}\"")

# SHAP Explainability Assertions
assert "explanation" in data_1, "Missing explanation in response"
expl = data_1["explanation"]
assert "top_positive_contributions" in expl, "Missing top_positive_contributions"
assert "top_negative_contributions" in expl, "Missing top_negative_contributions"
assert "disclaimer" in expl, "Missing disclaimer"
print("\n  [SHAP Explainability Factors]:")
for p in expl.get("top_positive_contributions", [])[:3]:
    print(f"    (+) {p['feature']}: +{p['shap_value']:.4f}")
for n in expl.get("top_negative_contributions", [])[:3]:
    print(f"    (-) {n['feature']}: {n['shap_value']:.4f}")
print(f"  Disclaimer: \"{expl['disclaimer']}\"")
print("  [PASS] Live POST /api/analyze-audio Pass 1 & SHAP verified.")

# 3. Live Screening POST Pass 2 (Determinism Verification)
print("\n[3/3] Sending real HTTP POST to /api/analyze-audio (Pass 2 - Determinism Check)...")
t1 = time.time()
with open(AUDIO_FILE, "rb") as f:
    res_post_2 = requests.post(
        f"{BASE_URL}/api/analyze-audio",
        files={"audio": ("real_voice_check.webm", f, "audio/webm")},
        timeout=60,
    )
elapsed_2 = time.time() - t1

print(f"  HTTP Status:           {res_post_2.status_code} (took {elapsed_2:.2f}s)")
assert res_post_2.status_code == 200, f"Expected 200, got {res_post_2.status_code}"

data_2 = res_post_2.json()
scr_2 = data_2.get("screening", {})
prob_2 = scr_2.get("probability")

prob_delta = abs(prob_1 - prob_2)
print(f"  Pass 1 Probability:    {prob_1:.6f}")
print(f"  Pass 2 Probability:    {prob_2:.6f}")
print(f"  Probability Delta:     {prob_delta:.10f}")

assert prob_delta < 1e-9, f"Non-deterministic probability: delta={prob_delta}"
print("  [PASS] Real live HTTP server output is strictly deterministic.")

print("\n" + "=" * 80)
print("ALL LIVE UVICORN SERVER VERIFICATION CHECKS PASSED.")
print("=" * 80)
