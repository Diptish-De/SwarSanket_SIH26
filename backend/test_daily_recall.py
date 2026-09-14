"""
Daily autobiographical recall scoring checks.

Two contrasting accounts of the same morning are scored: one rich in specific
episodic detail, one vague and habitual. The vague account is the pattern
reported in Alzheimer's disease (fewer internal details, external details
relatively preserved), so the test pins the direction of the separation as well
as the individual counters.

Run: backend\\.venv\\Scripts\\python.exe backend\\test_daily_recall.py
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from daily_recall import score_daily_recall  # noqa: E402

passed = 0


def check(cond, msg):
    global passed
    if not cond:
        print(f"  [FAIL] {msg}")
        sys.exit(1)
    passed += 1
    print(f"  [PASS] {msg}")


print("=" * 78)
print("Daily autobiographical recall")
print("=" * 78)

# A specific account: named people, clock times, places, past-tense events.
RICH = (
    "I woke up at six o'clock this morning because the neighbour's dog was barking. "
    "I made tea in the kitchen and ate two slices of toast with butter. "
    "My daughter Priya called from Delhi at about half past eight and we talked "
    "about her new flat. Then I walked to the market and bought tomatoes, onions "
    "and a kilo of rice. On the way back I stopped at the temple for a few minutes. "
    "In the afternoon I watched the cricket with my husband and fell asleep in the chair."
)

# The same day, told without anchoring: habitual present tense, no names, no
# times, no places, and the same content repeated.
VAGUE = (
    "I usually get up early. I always have my tea. Then I do the normal things, "
    "you know, the usual things that I do every day. I usually go out for a bit. "
    "I always come back. It is the same as usual really. I do things and then I "
    "usually rest. That is the usual thing."
)

print("\n[rich account]")
r = score_daily_recall(RICH, None, "en", 48.0)
d = r["details"]
print(f"  internal={d['internal_details']} external={d['external_details']} "
      f"specificity={d['specificity']}")
print(f"  breakdown={d['breakdown']}")
print(f"  people={d['matched']['people']}")
print(f"  time={d['matched']['time']}")
print(f"  place={d['matched']['place']}")

check(r["scored"] is True, "a detailed account is scored")
check(r["flag"] is None, "no pass/fail flag is ever returned for this task")
check(r["reference_type"] == "within_person", "result is marked as within-person only")
check(d["internal_details"] >= 20, f"rich account yields many internal details ({d['internal_details']})")
check(d["breakdown"]["events"] >= 6, f"past-tense events counted ({d['breakdown']['events']})")
check(d["breakdown"]["time"] >= 3, f"time anchors counted ({d['breakdown']['time']})")
check(d["breakdown"]["place"] >= 3, f"places counted ({d['breakdown']['place']})")
check(
    any(p.lower() == "priya" for p in d["matched"]["people"])
    and any(p.lower() in ("daughter", "husband") for p in d["matched"]["people"]),
    "named person and kinship term both counted as people",
)
check(d["specificity"] >= 0.75, f"specificity is high ({d['specificity']})")
check(d["words_per_minute"] is not None, "speech rate reported when a duration is given")

print("\n[vague account]")
v = score_daily_recall(VAGUE, None, "en", 48.0)
vd = v["details"]
print(f"  internal={vd['internal_details']} external={vd['external_details']} "
      f"specificity={vd['specificity']}")
print(f"  breakdown={vd['breakdown']}")
print(f"  generic={vd['matched']['generic'][:8]}")

check(v["scored"] is True, "a vague account is still scored, not refused")
check(vd["breakdown"]["events"] == 0, "no past-tense events found in a habitual account")
check(vd["external_details"] >= 8, f"habitual markers counted as external ({vd['external_details']})")
check(len(vd["matched"]["repetitions"]) > 0, "repeated content is counted as external")
check(vd["specificity"] <= 0.35, f"specificity is low ({vd['specificity']})")

print("\n[separation]")
gap_internal = d["internal_details"] - vd["internal_details"]
gap_spec = d["specificity"] - vd["specificity"]
print(f"  internal detail gap: {gap_internal}   specificity gap: {round(gap_spec, 3)}")
check(gap_internal >= 15, "the two accounts separate strongly on internal detail")
check(gap_spec >= 0.4, "the two accounts separate strongly on specificity")

print("\n[refusals]")
r = score_daily_recall("Fine.", None, "en", 3.0)
check(r["scored"] is False and r["score"] is None,
      "a two-word answer is left unscored rather than counted")
check("Too little speech" in r["note"], "the refusal says why")

r = score_daily_recall("आज सुबह मैंने चाय पी और बाज़ार गया।", None, "hi", 30.0)
check(r["scored"] is False and "English-only" in r["note"],
      "a non-English account is transcribed but left unscored")

r = score_daily_recall(RICH, None, "en", 0.0)
check(r["details"]["words_per_minute"] is None,
      "no speech rate is invented when the duration is unknown")

print("\n[double counting]")
r = score_daily_recall(
    "Every day I walk. Every day I walk. This morning I walked to the park.",
    None, "en", 20.0,
)
rd = r["details"]
print(f"  internal={rd['internal_details']} external={rd['external_details']} "
      f"generic={rd['matched']['generic']}")
check("every day" in rd["matched"]["generic"], "'every day' is matched as one generic phrase")
check("day" not in rd["matched"]["time"], "'day' inside 'every day' is not also a time detail")
check(rd["breakdown"]["events"] == 1, "the one past-tense event is counted once")

print(f"\nALL {passed} DAILY RECALL CHECKS PASSED.")
