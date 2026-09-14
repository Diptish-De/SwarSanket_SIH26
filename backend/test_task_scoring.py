"""
Standardized task scoring checks.

Text scorers are exercised on fixed transcripts so the thresholds and lexicon
handling are pinned; the phonation scorer runs on a synthesized vowel with known
duration and a synthesized breathy, unstable vowel, so the flag direction is
verified rather than assumed. Finally the job endpoint is driven end-to-end for
a phonation task so the task/params plumbing is covered.

Run: backend\\.venv\\Scripts\\python.exe backend\\test_task_scoring.py
"""
import io
import json
import sys
import time
import wave
from pathlib import Path

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from task_scoring import (  # noqa: E402
    FLUENCY_MIN_TYPICAL, PHONATION_MIN_TYPICAL_S, RECALL_MAX_FLAGGED,
    score_fluency, score_phonation, score_recall, summarize_battery,
)

passed = 0


def check(cond, msg):
    global passed
    if not cond:
        print(f"  [FAIL] {msg}")
        sys.exit(1)
    passed += 1
    print(f"  [PASS] {msg}")


print("=" * 78)
print("Standardized task scoring")
print("=" * 78)

# ── fluency ─────────────────────────────────────────────────────────────────
print("\n[fluency]")
good = ("dog, cat, cow, horse, goat, sheep, lion, tiger, elephant, monkey, "
        "deer, rabbit, mouse, mice, snake, crocodile, parrot, crow, peacock, fish.")
r = score_fluency(good, None, "en", 60.0)
print(f"  {r['score']} animals: {r['details']['animals']}")
check(r["scored"] and r["score"] == 19, "19 distinct animals counted; 'mice' collapses onto 'mouse'")
check(r["flag"] is False, "19 animals is within the typical range")
check(r["details"]["repetitions"] == ["mouse"], "the repeated lemma is listed as a repetition")

poor = "dog... cat... um, cow. dog. a table, a chair, dog again, cat."
r = score_fluency(poor, None, "en", 60.0)
check(r["score"] == 3 and r["flag"] is True, f"3 animals with intrusions and repeats is flagged (< {FLUENCY_MIN_TYPICAL})")
check("table" not in r["details"]["animals"], "non-animals are not counted")

r = score_fluency("polar bear, guinea pig, bear, pig, sea lion, lion", None, "en", 60.0)
check(r["score"] == 6, "multi-word animals count separately from their components")

r = score_fluency("dogs cats cows horses puppies", None, "en", 60.0)
check(r["score"] == 5, "regular and irregular plurals resolve to lemmas")

r = score_fluency("कुत्ता बिल्ली गाय भैंस बकरी हाथी शेर बंदर मोर तोता मछली सांप चूहा", None, "hi", 60.0)
check(r["scored"] and r["score"] == 13 and r["flag"] is False, "Hindi animals are counted from the provisional lexicon")
check("provisional" in r["note"], "the Hindi result says its lexicon is provisional")

r = score_fluency("கால்நடை நாய் பூனை", None, "ta", 60.0)
check(r["scored"] is False and r["flag"] is None and "No animal lexicon" in r["note"],
      "a language without a lexicon is left unscored, not guessed")

r = score_fluency(good, None, "en", 31.0)
check(r["details"]["incomplete"] and "not the full 60 s" in r["note"], "a short fluency recording is marked incomplete")

words = [{"word": w, "start": 2.0 * i, "end": 2.0 * i + 0.5} for i, w in enumerate(
    ["dog", "cat", "cow", "horse", "goat", "sheep", "lion", "tiger", "elephant", "monkey"])]
r = score_fluency(" ".join(w["word"] for w in words), words, "en", 60.0)
check(r["details"]["first_15s_count"] == 8, "time course counts animals named in the first 15 s")

# ── recall ──────────────────────────────────────────────────────────────────
print("\n[recall]")
targets = ["Cow", "River", "Book", "House", "Flower"]
r = score_recall("um, cow... house, and I think a flower. a book? yes book.", targets)
check(r["score"] == 4 and r["flag"] is False, "4 of 5 recalled, in typical range")
check(r["details"]["missed"] == ["river"], "the missed word is listed")

r = score_recall("cow and... I don't remember.", targets)
check(r["score"] == 1 and r["flag"] is True, f"1 of 5 is flagged (<= {RECALL_MAX_FLAGGED})")

r = score_recall("flowr, hous, rivr", targets)
check(r["score"] == 3, "one-letter ASR slips still match words of five or more letters")

r = score_recall("cot, boot", targets)
check(r["score"] == 0, "short words do not fuzzy-match ('cot' is not 'cow')")

r = score_recall("गाय, किताब और फूल", ["गाय", "नदी", "किताब", "घर", "फूल"])
check(r["score"] == 3, "Devanagari targets match Devanagari transcript tokens")

r = score_recall("cow", [])
check(r["scored"] is False, "no targets -> unscored")

# ── phonation ───────────────────────────────────────────────────────────────
print("\n[phonation]")


def synth_vowel(seconds, f0=140.0, jitter=0.002, shimmer=0.01, noise=0.002, sr=16000, lead=0.5, tail=0.5):
    """
    Builds the vowel cycle by cycle so `jitter` and `shimmer` are genuine
    cycle-to-cycle perturbations (the quantities the scorer measures), not slow
    drift. `noise` sets the aperiodic share and therefore the HNR.
    """
    rng = np.random.default_rng(7)
    n = int(seconds * sr)
    pieces = []
    total = 0
    while total < n:
        period = (sr / f0) * (1.0 + jitter * rng.standard_normal())
        amp = 1.0 + shimmer * rng.standard_normal()
        length = max(8, int(round(period)))
        phase = 2 * np.pi * np.arange(length) / period
        cyc = np.zeros(length)
        for h, a in ((1, 1.0), (2, 0.5), (3, 0.3), (4, 0.15), (5, 0.1)):
            cyc += a * np.sin(h * phase)
        pieces.append(amp * cyc)
        total += length
    y = np.concatenate(pieces)[:n]
    y = y + noise * rng.standard_normal(n)
    fade = int(0.05 * sr)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    y = np.concatenate([
        0.0005 * rng.standard_normal(int(lead * sr)),
        y,
        0.0005 * rng.standard_normal(int(tail * sr)),
    ])
    y = y / np.max(np.abs(y)) * 0.6
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    return buf.getvalue()


steady = synth_vowel(14.0)
r = score_phonation(steady)
print(f"  steady 14 s vowel -> MPT {r['score']} s, out of range: {r['details'].get('perturbation_out_of_range')}, "
      f"jitter {r['details']['voice_quality'].get('jitter_local_percent')}%, HNR {r['details']['voice_quality'].get('hnr_db')} dB")
check(r["scored"] and 13.0 <= r["score"] <= 15.0, "maximum phonation time is measured to within a second")
check(r["flag"] is False, "a steady 14 s vowel is within the typical range")

short = synth_vowel(5.0)
r = score_phonation(short)
check(r["scored"] and 4.0 <= r["score"] <= 6.0 and r["flag"] is True,
      f"a 5 s vowel is flagged (MPT < {PHONATION_MIN_TYPICAL_S:.0f} s)")

unstable = synth_vowel(14.0, jitter=0.03, shimmer=0.15, noise=0.08)
r = score_phonation(unstable)
print(f"  unstable vowel -> out of range: {r['details'].get('perturbation_out_of_range')}, "
      f"jitter {r['details']['voice_quality'].get('jitter_local_percent')}%, HNR {r['details']['voice_quality'].get('hnr_db')} dB")
check(r["scored"] and r["flag"] is True and len(r["details"]["perturbation_out_of_range"]) >= 2,
      "a rough, breathy vowel is flagged on at least two perturbation measures")

silence = synth_vowel(0.2, lead=2.0, tail=2.0)
r = score_phonation(silence)
check(r["scored"] is False and r["flag"] is None, "near-silence is unscored, not scored as zero")

# ── summary ─────────────────────────────────────────────────────────────────
print("\n[battery summary]")
s = summarize_battery([
    {"task": "fluency", "scored": True, "flag": False},
    {"task": "recall", "scored": True, "flag": True},
    {"task": "phonation", "scored": False, "flag": None},
])
check(s == {"scored_tasks": 2, "in_typical_range": 1, "below_typical": ["recall"], "unscored": ["phonation"]},
      "summary reports N of M over scored tasks only, with unscored listed")

# ── job endpoint plumbing ───────────────────────────────────────────────────
print("\n[job endpoint: task=phonation]")
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)
res = client.post("/api/screenings", files={"audio": ("vowel.wav", io.BytesIO(steady), "audio/wav")},
                  data={"task": "phonation"})
check(res.status_code == 202 and res.json()["task"] == "phonation", "phonation task accepted and echoed")
rid = res.json()["recording_id"]
deadline = time.time() + 120
body = None
while time.time() < deadline:
    body = client.get(f"/api/screenings/{rid}").json()
    if body["status"] in ("completed", "failed"):
        break
    time.sleep(0.2)
check(body and body["status"] == "completed", f"phonation job completed: {body and body['status']}")
check(body["result"]["battery"]["task"] == "phonation" and body["result"]["battery"]["flag"] is False,
      "job result carries the battery score")

res = client.post("/api/screenings", files={"audio": ("x.wav", io.BytesIO(steady), "audio/wav")},
                  data={"task": "recall"})
check(res.status_code == 400, "recall without target_words is refused with 400")
res = client.post("/api/screenings", files={"audio": ("x.wav", io.BytesIO(steady), "audio/wav")},
                  data={"task": "juggling"})
check(res.status_code == 400, "unknown task is refused with 400")
res = client.post("/api/screenings", files={"audio": ("x.wav", io.BytesIO(steady), "audio/wav")},
                  data={"task": "recall", "params": json.dumps({"target_words": ["a"], "language": "en"})})
check(res.status_code == 202, "recall with target_words is accepted")
rid2 = res.json()["recording_id"]
while time.time() < deadline:
    body = client.get(f"/api/screenings/{rid2}").json()
    if body["status"] in ("completed", "failed"):
        break
    time.sleep(0.2)

print(f"\nALL {passed} TASK SCORING CHECKS PASSED.")
