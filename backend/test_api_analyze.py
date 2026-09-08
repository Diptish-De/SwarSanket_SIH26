import sys
import io
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

AUDIO_DIR = BACKEND_DIR / "uploads"
audio_files = list(AUDIO_DIR.glob("*.webm")) + list(AUDIO_DIR.glob("*.m4a")) + list(AUDIO_DIR.glob("*.wav"))

if not audio_files:
    AUDIO_DIR = BACKEND_DIR / "test_audio"
    audio_files = list(AUDIO_DIR.glob("*.webm")) + list(AUDIO_DIR.glob("*.m4a")) + list(AUDIO_DIR.glob("*.wav"))

test_audio_path = audio_files[0]

print("=" * 80)
print("SwarSanket Quantum-Hybrid FastAPI Endpoint Integration Verification")
print("=" * 80)
print(f"Target Audio for API Tests: {test_audio_path}")

# ─── TEST A: GET /api/health ──────────────────────────────────────────────────
print("\n[Test A] Testing GET /api/health...")
res_health = client.get("/api/health")
print(f"  Status Code: {res_health.status_code}")
print(f"  Response:    {res_health.json()}")
assert res_health.status_code == 200, f"Expected 200, got {res_health.status_code}"
assert res_health.json().get("status") == "ok", "Health status is not 'ok'"
assert "Quantum" in res_health.json().get("model", ""), "Model is not Quantum-Hybrid"
print("  [PASS] GET /api/health verified.")

# ─── TEST B: POST /api/analyze-audio (Real WebM Screening) ────────────────────
print("\n[Test B] Testing POST /api/analyze-audio with real WebM recording...")
with open(test_audio_path, "rb") as f:
    file_bytes = f.read()

res_analyze_1 = client.post(
    "/api/analyze-audio",
    files={"audio": (test_audio_path.name, io.BytesIO(file_bytes), "audio/webm")},
)

print(f"  Status Code: {res_analyze_1.status_code}")
assert res_analyze_1.status_code == 200, f"Expected 200, got {res_analyze_1.status_code}: {res_analyze_1.text}"

data_1 = res_analyze_1.json()
assert data_1.get("success") is True, "success is not True"
assert "transcript" in data_1 and len(data_1["transcript"]) > 0, "Transcript is missing or empty"
assert "production_features" in data_1, "production_features missing"
assert len(data_1["production_features"]) == 22, f"Expected 22 production features, got {len(data_1['production_features'])}"

screening_1 = data_1.get("screening", {})
pred_1 = screening_1.get("predicted_class")
prob_1 = screening_1.get("probability")
prob_pct_1 = screening_1.get("probability_percent")
conf_pct_1 = screening_1.get("technical_confidence_percent")
uncertainty_1 = screening_1.get("uncertainty_std")
status_1 = screening_1.get("status")
interp_1 = screening_1.get("interpretation", "")

print(f"  Model Name:            {screening_1.get('model_name')}")
print(f"  Transcript:            \"{data_1['transcript']}\"")
print(f"  Saved Filename:        {data_1.get('filename')}")
print(f"  Predicted Class:       {pred_1} ({status_1})")
print(f"  Probability:           {prob_1} ({prob_pct_1}%)")
print(f"  Uncertainty (std):     {uncertainty_1}")
print(f"  Technical Confidence:  {conf_pct_1}%")
print(f"  Quantum Specs:         {screening_1.get('quantum_specs')}")

assert pred_1 in (0, 1), f"Invalid predicted_class: {pred_1}"
assert 0.0 <= prob_1 <= 1.0, f"Invalid probability: {prob_1}"
assert uncertainty_1 is not None and uncertainty_1 >= 0.0, "Invalid uncertainty_std"
assert "not a diagnosis" in interp_1.lower(), "Interpretation does not contain disclaimer 'not a diagnosis'"
print("  [PASS] POST /api/analyze-audio contract verified.")

# ─── TEST C: Error Handling on Invalid / Empty Upload ──────────────────────────
print("\n[Test C] Testing error handling on empty audio file...")
res_empty = client.post(
    "/api/analyze-audio",
    files={"audio": ("empty.webm", io.BytesIO(b""), "audio/webm")},
)
print(f"  Empty upload status code: {res_empty.status_code}")
print(f"  Empty upload detail:      {res_empty.json()}")
assert res_empty.status_code in (400, 422), f"Expected 400 or 422, got {res_empty.status_code}"
assert "detail" in res_empty.json(), "Response missing safe 'detail' error message"
assert "traceback" not in res_empty.text.lower(), "Stack trace was leaked in response!"
print("  [PASS] Safe HTTP error returned without stack trace leakage.")

# ─── TEST D: Quantum Explainability in API Response ───────────────────────────
print("\n[Test D] Testing Quantum Feature Attribution structure and non-causal framing...")
assert "explanation" in data_1, "Response missing 'explanation' field"
expl = data_1["explanation"]
assert "top_positive_contributions" in expl, "Explanation missing 'top_positive_contributions'"
assert "top_negative_contributions" in expl, "Explanation missing 'top_negative_contributions'"
assert "shap_contributions" in expl, "Explanation missing 'shap_contributions'"
assert len(expl["shap_contributions"]) == 22, f"Expected 22 feature contributions, got {len(expl['shap_contributions'])}"
assert "disclaimer" in expl, "Explanation missing 'disclaimer'"
assert "human_readable_explanation" in expl, "Explanation missing 'human_readable_explanation'"

# Verify safe framing
human_text = expl["human_readable_explanation"].lower()
assert "caused alzheimer" not in human_text
assert "proves alzheimer" not in human_text
assert "not establish clinical causality" in expl["disclaimer"].lower()
print("  [PASS] Quantum Feature Attribution verified with 22 features and safe clinical framing.")

print("\n" + "=" * 80)
print("ALL FASTAPI QUANTUM-HYBRID INTEGRATION TESTS PASSED SUCCESSFULLY.")
print("=" * 80)
