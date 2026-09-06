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
    raise FileNotFoundError(f"No audio files found in {AUDIO_DIR} to run API tests.")

test_audio_path = audio_files[0]

print("=" * 80)
print("SwarSanket STEP 96G-E: FastAPI Endpoint Integration Verification")
print("=" * 80)
print(f"Target Audio for API Tests: {test_audio_path}")

# ─── TEST A: GET /api/health ──────────────────────────────────────────────────
print("\n[Test A] Testing GET /api/health...")
res_health = client.get("/api/health")
print(f"  Status Code: {res_health.status_code}")
print(f"  Response:    {res_health.json()}")
assert res_health.status_code == 200, f"Expected 200, got {res_health.status_code}"
assert res_health.json().get("status") == "ok", "Health status is not 'ok'"
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
assert len(data_1["production_features"]) == 20, f"Expected 20 production features, got {len(data_1['production_features'])}"

imputation_meta = data_1.get("imputation", {})
assert imputation_meta.get("live_feature_count") == 8, f"Expected 8 live features, got {imputation_meta.get('live_feature_count')}"
assert imputation_meta.get("imputed_feature_count") == 12, f"Expected 12 imputed features, got {imputation_meta.get('imputed_feature_count')}"
assert imputation_meta.get("total_feature_count") == 20, f"Expected 20 total features, got {imputation_meta.get('total_feature_count')}"

screening_1 = data_1.get("screening", {})
pred_1 = screening_1.get("predicted_class")
prob_1 = screening_1.get("probability")
prob_pct_1 = screening_1.get("probability_percent")
conf_pct_1 = screening_1.get("technical_confidence_percent")
status_1 = screening_1.get("status")
interp_1 = screening_1.get("interpretation", "")

print(f"  Transcript:            \"{data_1['transcript']}\"")
print(f"  Saved Filename:        {data_1.get('filename')}")
print(f"  Predicted Class:       {pred_1} ({status_1})")
print(f"  Probability:           {prob_1} ({prob_pct_1}%)")
print(f"  Technical Confidence:  {conf_pct_1}%")
print(f"  Interpretation:        \"{interp_1}\"")
print(f"  Limitation Note:       \"{imputation_meta.get('imputation_note')}\"")

assert pred_1 in (0, 1), f"Invalid predicted_class: {pred_1}"
assert 0.0 <= prob_1 <= 1.0, f"Invalid probability: {prob_1}"
assert "not a diagnosis" in interp_1.lower(), "Interpretation does not contain disclaimer 'not a diagnosis'"
print("  [PASS] POST /api/analyze-audio contract verified.")

# ─── TEST C: Determinism (Pass 2 through API) ─────────────────────────────────
print("\n[Test C] Testing API determinism (Consecutive Pass 2 on same audio)...")
res_analyze_2 = client.post(
    "/api/analyze-audio",
    files={"audio": (test_audio_path.name, io.BytesIO(file_bytes), "audio/webm")},
)

assert res_analyze_2.status_code == 200, f"Expected 200, got {res_analyze_2.status_code}"
data_2 = res_analyze_2.json()
screening_2 = data_2.get("screening", {})
pred_2 = screening_2.get("predicted_class")
prob_2 = screening_2.get("probability")

prob_delta = abs(prob_1 - prob_2)
print(f"  Pass 1 Probability:    {prob_1:.6f}")
print(f"  Pass 2 Probability:    {prob_2:.6f}")
print(f"  Absolute Delta:        {prob_delta:.10f}")

assert pred_1 == pred_2, f"Predicted class mismatch: {pred_1} vs {pred_2}"
assert prob_delta < 1e-9, f"Non-deterministic probability: delta={prob_delta}"
print("  [PASS] API inference is strictly deterministic (Delta < 1e-9).")

# ─── TEST D: Error Handling on Invalid / Empty Upload ──────────────────────────
print("\n[Test D] Testing error handling on empty audio file...")
res_empty = client.post(
    "/api/analyze-audio",
    files={"audio": ("empty.webm", io.BytesIO(b""), "audio/webm")},
)
print(f"  Empty upload status code: {res_empty.status_code}")
print(f"  Empty upload detail:      {res_empty.json()}")
assert res_empty.status_code in (400, 422), f"Expected 400 or 422, got {res_empty.status_code}"
assert "detail" in res_empty.json(), "Response missing safe 'detail' error message"
# Ensure stack traces are not exposed
assert "traceback" not in res_empty.text.lower(), "Stack trace was leaked in response!"
print("  [PASS] Safe HTTP error returned without stack trace leakage.")

# ─── TEST E: Existing POST /api/upload-audio Verification ─────────────────────
print("\n[Test E] Testing existing POST /api/upload-audio endpoint...")
res_upload = client.post(
    "/api/upload-audio",
    files={"audio": ("upload_test.webm", io.BytesIO(file_bytes), "audio/webm")},
)
print(f"  Status Code: {res_upload.status_code}")
assert res_upload.status_code == 200, f"Expected 200, got {res_upload.status_code}"
upload_data = res_upload.json()
assert upload_data.get("success") is True, "Upload success is not True"
assert upload_data.get("size_bytes") > 0, "Upload size_bytes is 0"
print(f"  Upload saved to: {upload_data.get('saved_path')}")
print("  [PASS] POST /api/upload-audio verified functional.")

# ─── TEST F: SHAP Explainability in API Response ──────────────────────────────
print("\n[Test F] Testing SHAP Explainability structure and non-causal framing...")
assert "explanation" in data_1, "Response missing 'explanation' field"
expl = data_1["explanation"]
assert "base_value" in expl, "Explanation missing 'base_value'"
assert "top_positive_contributions" in expl, "Explanation missing 'top_positive_contributions'"
assert "top_negative_contributions" in expl, "Explanation missing 'top_negative_contributions'"
assert "shap_contributions" in expl, "Explanation missing 'shap_contributions'"
assert len(expl["shap_contributions"]) == 20, f"Expected 20 feature contributions, got {len(expl['shap_contributions'])}"
assert "disclaimer" in expl, "Explanation missing 'disclaimer'"
assert "human_readable_explanation" in expl, "Explanation missing 'human_readable_explanation'"

# Verify safe framing
human_text = expl["human_readable_explanation"].lower()
assert "caused alzheimer" not in human_text
assert "proves alzheimer" not in human_text
assert "not establish clinical causality" in expl["disclaimer"].lower()

# Verify additivity
recon_prob = expl.get("reconstructed_probability")
assert recon_prob is not None
prob_err = abs(prob_1 - recon_prob)
print(f"  Base Value (Margin):   {expl['base_value']:.6f}")
print(f"  Reconstructed Prob:    {recon_prob:.6f}")
print(f"  Reconstruction Delta:  {prob_err:.8f}")
assert prob_err < 1e-5, f"Reconstruction error too large: {prob_err}"
print("  [PASS] SHAP Explainability verified with exact additivity and safe framing.")

print("\n" + "=" * 80)
print("ALL FASTAPI & SHAP EXPLAINABILITY INTEGRATION TESTS PASSED SUCCESSFULLY.")
print("=" * 80)

