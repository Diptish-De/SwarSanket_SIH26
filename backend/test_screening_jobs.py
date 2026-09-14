"""
Asynchronous screening job contract test.

Proves that POST /api/screenings returns before any inference happens, that the
job then advances through real stages, and that the completed result carries
the same contract as the synchronous /api/analyze-audio endpoint. Also checks
that a clip without speech ends as a refusal, not a crash, and that an unknown
id is a clean 404.

Run: backend\\.venv\\Scripts\\python.exe backend\\test_screening_jobs.py
"""
import io
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

TEST_AUDIO = BACKEND_DIR / "test_audio"
long_clip = max(
    list(TEST_AUDIO.glob("*.wav")) + list(TEST_AUDIO.glob("*.webm")),
    key=lambda p: p.stat().st_size,
)

STAGE_ORDER = ["queued", "uploading", "transcribing", "extracting", "scoring", "completed"]
passed = 0


def check(cond, msg):
    global passed
    if not cond:
        print(f"  [FAIL] {msg}")
        sys.exit(1)
    passed += 1
    print(f"  [PASS] {msg}")


def wait_for(recording_id, timeout_s=240):
    seen = []
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        res = client.get(f"/api/screenings/{recording_id}")
        assert res.status_code == 200, res.text
        body = res.json()
        if not seen or seen[-1] != body["status"]:
            seen.append(body["status"])
        if body["status"] in ("completed", "failed"):
            return body, seen
        time.sleep(0.25)
    raise AssertionError(f"job {recording_id} did not finish; stages seen: {seen}")


print("=" * 78)
print("Asynchronous screening job pipeline")
print("=" * 78)
print(f"Clip: {long_clip.name} ({long_clip.stat().st_size} bytes)")

# 1. Submission returns immediately, before inference.
t0 = time.perf_counter()
with open(long_clip, "rb") as f:
    res = client.post("/api/screenings", files={"audio": (long_clip.name, f, "audio/wav")})
submit_s = time.perf_counter() - t0
print(f"  submit HTTP {res.status_code} in {submit_s:.2f}s")
check(res.status_code == 202, "POST /api/screenings answers 202 Accepted")
body = res.json()
rid = body["recording_id"]
check(body["status"] == "queued" and body["poll_url"] == f"/api/screenings/{rid}",
      "response carries recording_id, queued status and poll_url")
check("realtime" in body, "response carries a realtime block (may be null without an anon key)")
check(submit_s < 20, f"submission returned in {submit_s:.1f}s, well inside any proxy timeout")

# 2. The job advances through the real stages and completes.
final, seen = wait_for(rid)
print(f"  stages observed: {' -> '.join(seen)}")
check(final["status"] == "completed", "job reached completed")
order = [STAGE_ORDER.index(s) for s in seen if s in STAGE_ORDER]
check(order == sorted(order), "stages arrived in pipeline order")
check(any(s in seen for s in ("transcribing", "extracting", "scoring")),
      "at least one intermediate stage was observable (progress is real, not guessed)")

# 3. Completed result has the synchronous endpoint's contract.
result = final["result"]
for key in ("transcript", "word_count", "audio", "live_features", "production_features", "screening"):
    check(key in result, f"result has '{key}'")
scr = result["screening"]
check(scr.get("probability") is not None and 0.0 <= scr["probability"] <= 1.0,
      f"probability present: {scr.get('probability')}")
check(result.get("recording_id") == rid, "result echoes the recording_id")
check(isinstance(result.get("processing_seconds"), (int, float)),
      f"processing time reported: {result.get('processing_seconds')}s")
check(final["queue_position"] is None and final["error"] is None,
      "terminal job has no queue position and no error")

# 4. Status endpoint is idempotent after completion.
again = client.get(f"/api/screenings/{rid}").json()
check(again["status"] == "completed" and again["result"]["screening"]["probability"] == scr["probability"],
      "status is stable on re-read")

# 5. A clip without speech is refused, not crashed.
import numpy as np  # noqa: E402
import wave  # noqa: E402

buf = io.BytesIO()
with wave.open(buf, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    w.writeframes((np.random.default_rng(0).normal(0, 20, 16000 * 3)).astype(np.int16).tobytes())
buf.seek(0)
res = client.post("/api/screenings", files={"audio": ("silence.wav", buf, "audio/wav")})
check(res.status_code == 202, "silent clip is still accepted for processing")
final_s, seen_s = wait_for(res.json()["recording_id"], timeout_s=120)
print(f"  silent clip: {' -> '.join(seen_s)}  error={final_s['error']!r}")
check(final_s["status"] == "failed" and final_s["error"] and "Traceback" not in final_s["error"],
      "silent clip ends as a clean failure message without a stack trace")

# 6. Unknown id.
check(client.get("/api/screenings/doesnotexist").status_code == 404, "unknown id answers 404")

# 7. Empty upload.
res = client.post("/api/screenings", files={"audio": ("empty.wav", io.BytesIO(b""), "audio/wav")})
check(res.status_code == 400, "empty upload is refused with 400")

print(f"\nALL {passed} JOB PIPELINE CHECKS PASSED.")
