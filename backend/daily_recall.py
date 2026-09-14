"""
Daily autobiographical recall scoring
=====================================
Scores a short "tell me about your day" recording.

Why this task. Episodic memory for recent personal events is among the first
abilities to decline in Alzheimer's disease, and it declines before a person
fails a standard office cognitive test. A daily 40-second answer is the only
practical way to watch it.

How it is scored. The method follows the Autobiographical Interview (Levine,
Svoboda, Hay, Winocur & Moscovitch, 2002, Psychology and Aging), which splits a
personal narrative into:

  internal details  - bound to one specific event: what happened, when, where,
                      who was there, what was perceived or felt.
  external details  - not bound to that event: general facts, habits and
                      routines, opinions, repetitions, off-topic remarks.

People with Alzheimer's disease produce markedly fewer internal details while
external details are relatively preserved, so the *ratio* moves earlier and more
cleanly than raw talkativeness. That pattern is reported for AD and amnestic MCI
(for example Irish et al. 2011, Brain; Murphy et al. 2008, Neuropsychologia).

What this module does NOT claim. Levine's protocol is scored by trained human
raters against a manual. This is an automated approximation built from
part-of-speech tags, the dependency parse and curated lexicons. It is useful for
tracking one person over time; it is not interchangeable with hand scoring, and
there is no published cut-off for automated detail counts.

Consequences for the product, enforced below:
  * No absolute threshold and no pass/fail flag is ever returned. The result
    carries reference_type "within_person": it is meaningful only against the
    same speaker's own earlier check-ins.
  * English only. The lexicons and the parser are English; other languages are
    transcribed and returned unscored rather than scored badly.
"""

from __future__ import annotations

import sys
from typing import Any, Dict, List, Optional, Set, Tuple

# Days needed before a personal baseline means anything. Used by the client to
# decide when to start showing a trend; kept here so both ends agree.
BASELINE_MIN_CHECKINS = 5

SUPPORTED_LANGUAGES = ("en",)

# ── lexicons ────────────────────────────────────────────────────────────────
#
# Deliberately small and concrete. A large list would inflate every speaker's
# count equally and blur the within-person change this task exists to measure.

TIME_WORDS: Set[str] = {
    "morning", "afternoon", "evening", "night", "midnight", "noon", "midday",
    "dawn", "dusk", "sunrise", "sunset", "today", "yesterday", "tonight",
    "breakfast", "lunch", "dinner", "supper", "teatime", "brunch",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "hour", "minute", "moment", "morning", "o'clock", "am", "pm", "clock",
    "early", "late", "earlier", "afterwards", "then", "before", "after",
    "week", "weekend", "birthday", "anniversary", "festival", "holiday",
}

PLACE_WORDS: Set[str] = {
    "home", "house", "kitchen", "bedroom", "bathroom", "balcony", "terrace",
    "roof", "garden", "yard", "veranda", "porch", "hall", "room", "doorway",
    "street", "road", "lane", "market", "bazaar", "shop", "store", "mall",
    "temple", "church", "mosque", "gurudwara", "park", "garden", "field",
    "hospital", "clinic", "pharmacy", "chemist", "bank", "office", "school",
    "college", "station", "bus", "train", "platform", "stop", "corner",
    "restaurant", "cafe", "canteen", "library", "gym", "salon", "barber",
    "village", "town", "city", "neighbourhood", "neighborhood", "colony",
    "upstairs", "downstairs", "outside", "inside", "downtown",
}

PERSON_WORDS: Set[str] = {
    "wife", "husband", "spouse", "partner", "son", "daughter", "child",
    "children", "kid", "grandson", "granddaughter", "grandchild", "grandson",
    "mother", "father", "mom", "mum", "dad", "papa", "mama", "parent",
    "sister", "brother", "sibling", "aunt", "uncle", "cousin", "nephew",
    "niece", "in-law", "family", "relative",
    "friend", "neighbour", "neighbor", "guest", "visitor", "colleague",
    "doctor", "nurse", "therapist", "helper", "maid", "driver", "postman",
    "shopkeeper", "vendor", "priest", "teacher", "man", "woman", "boy", "girl",
    "someone", "everybody",
}

# Habitual and generic markers: the speaker has left today and is describing how
# things usually are. Levine's protocol counts this as external.
HABITUAL_MARKERS: Set[str] = {
    "usually", "normally", "generally", "typically", "always", "never",
    "often", "sometimes", "occasionally", "regularly", "everyday", "daily",
    "routine", "habit", "anyway", "generally",
}

# Multi-token habitual phrases, matched on the lemma sequence.
HABITUAL_PHRASES: Tuple[Tuple[str, ...], ...] = (
    ("every", "day"), ("every", "morning"), ("every", "evening"),
    ("every", "night"), ("all", "the", "time"), ("as", "usual"),
    ("in", "general"), ("most", "day"), ("these", "day"),
)

# Verbs that carry no event content on their own; counting them as "what
# happened" would reward filler.
LIGHT_VERBS: Set[str] = {
    "be", "have", "do", "will", "would", "can", "could", "shall", "should",
    "may", "might", "must", "get", "let",
}

# Nouns too abstract to be a perceptual detail.
ABSTRACT_NOUNS: Set[str] = {
    "thing", "things", "stuff", "something", "anything", "nothing", "lot",
    "bit", "kind", "sort", "way", "time", "day", "life", "work", "problem",
    "idea", "reason", "point", "part", "case", "fact", "matter",
    # Quantity and clock fragments that sit under a locative preposition
    # without naming a place: "at half past eight", "for a couple of hours".
    "half", "quarter", "couple", "number", "side", "end", "middle", "front",
}

LOCATIVE_PREPS: Set[str] = {
    "in", "at", "on", "near", "beside", "inside", "outside", "under", "over",
    "behind", "between", "across", "around", "towards", "toward", "into",
    "onto", "from", "to", "by", "through", "up", "down",
}

# Hesitation and self-correction markers. Not scored as a deficit; surfaced so a
# clinician can see them, because word-finding pauses are part of the picture.
FILLER_WORDS: Set[str] = {
    "um", "uh", "er", "erm", "hmm", "mm", "eh", "ah", "uhh", "umm",
}


def _empty(language: str, reason: str, word_count: int = 0) -> Dict[str, Any]:
    return {
        "task": "daily",
        "scored": False,
        "score": None,
        "flag": None,
        "reference_type": "within_person",
        "threshold": "no absolute threshold; compared only with this speaker's own earlier check-ins",
        "reference": "Autobiographical Interview, Levine et al. 2002 (automated approximation)",
        "note": reason,
        "details": {"language": language, "word_count": word_count},
    }


_NLP = None


def _load_nlp():
    """
    Returns a spaCy pipeline with the tagger and parser, which is all this
    scorer uses.

    Reuses the screening engine's model when that module is already imported: a
    second copy would cost about 50 MB of resident memory in a 512 MB container
    for no benefit. It does not import the engine to get one, because doing so
    would drag torch, PennyLane and the VQC weights into a process that only
    needs to count nouns - roughly 400 MB and half a minute for nothing.
    """
    global _NLP

    if _NLP is not None:
        return _NLP

    engine = sys.modules.get("screening_engine")
    if engine is not None and getattr(engine, "nlp", None) is not None:
        _NLP = engine.nlp
        return _NLP

    import spacy

    # Same disable list as the engine, so both paths tag and parse identically.
    _NLP = spacy.load("en_core_web_sm", disable=["ner"])
    return _NLP


def score_daily_recall(
    transcript: str,
    words: Optional[List[Dict[str, Any]]] = None,
    language: str = "en",
    duration_seconds: float = 0.0,
) -> Dict[str, Any]:
    """
    Splits a spoken account of the speaker's day into internal (episodic) and
    external (generic) details, following the Autobiographical Interview.

    Returns the standard battery shape. `score` is the internal detail count and
    `flag` is always None: there is no published cut-off for an automated count,
    so a single day says nothing on its own.
    """
    language = (language or "en").lower()[:2]
    text = (transcript or "").strip()

    if language not in SUPPORTED_LANGUAGES:
        return _empty(
            language,
            f"Detail scoring is English-only; '{language}' was transcribed and kept "
            "for a clinician to read, but not scored.",
            len(text.split()),
        )

    if len(text.split()) < 8:
        return _empty(
            language,
            "Too little speech to describe a day. Nothing was scored rather than "
            "reporting a count built on a few words.",
            len(text.split()),
        )

    nlp = _load_nlp()
    doc = nlp(text)

    events: List[str] = []
    times: List[str] = []
    places: List[str] = []
    people: List[str] = []
    percepts: List[str] = []

    external_generic: List[str] = []
    repetitions: List[str] = []
    fillers = 0

    seen_content: Set[str] = set()
    counted: Set[int] = set()  # token indices already scored as some detail

    lemmas = [tok.lemma_.lower() for tok in doc]

    # Multi-token habitual phrases first, so "every day" is not also counted as
    # a time detail by "day".
    habitual_spans: Set[int] = set()
    for phrase in HABITUAL_PHRASES:
        n = len(phrase)
        for i in range(len(lemmas) - n + 1):
            if tuple(lemmas[i : i + n]) == phrase:
                external_generic.append(" ".join(phrase))
                habitual_spans.update(range(i, i + n))

    for tok in doc:
        if tok.is_space or tok.is_punct:
            continue

        lemma = tok.lemma_.lower()
        lower = tok.text.lower()

        if lower in FILLER_WORDS:
            fillers += 1
            continue

        if tok.i in habitual_spans:
            continue

        # ── external: habitual and generic markers ────────────────────────
        if lemma in HABITUAL_MARKERS or lower in HABITUAL_MARKERS:
            external_generic.append(lower)
            counted.add(tok.i)
            continue

        # ── internal: what happened ───────────────────────────────────────
        # Past tense is the grammatical signature of a specific past event.
        # Distinct lemmas only: saying "walked" four times is one event type.
        if tok.pos_ in ("VERB", "AUX") and lemma not in LIGHT_VERBS:
            if tok.tag_ in ("VBD", "VBN"):
                if lemma not in events:
                    events.append(lemma)
                counted.add(tok.i)
                continue

            # Present-tense lexical verbs in a narrative about today are
            # generic statements ("I take my tablets", "I like tea").
            if tok.tag_ in ("VBP", "VBZ"):
                external_generic.append(lemma)
                counted.add(tok.i)
                continue

        # ── internal: when ────────────────────────────────────────────────
        if lemma in TIME_WORDS or lower in TIME_WORDS:
            if lemma not in times:
                times.append(lemma)
            counted.add(tok.i)
            continue

        # A bare number next to a time word is a clock reading.
        if tok.like_num:
            neighbours = {
                doc[j].lemma_.lower()
                for j in (tok.i - 1, tok.i + 1)
                if 0 <= j < len(doc)
            }
            if neighbours & TIME_WORDS:
                if tok.text not in times:
                    times.append(tok.text)
                counted.add(tok.i)
                continue

        # ── internal: who ─────────────────────────────────────────────────
        # Proper nouns are available from the tagger, so no NER pass is needed.
        if tok.pos_ == "PROPN" or lemma in PERSON_WORDS:
            key = lemma if lemma in PERSON_WORDS else tok.text
            if key.lower() not in {p.lower() for p in people}:
                people.append(key)
            counted.add(tok.i)
            continue

        # ── internal: where ───────────────────────────────────────────────
        if tok.pos_ in ("NOUN", "PROPN"):
            is_place_word = lemma in PLACE_WORDS
            # Object of a locative preposition: "in the kitchen", "to the market".
            is_locative_object = (
                tok.dep_ == "pobj"
                and tok.head.pos_ == "ADP"
                and tok.head.lemma_.lower() in LOCATIVE_PREPS
            )
            # "on the way", "at half past eight": grammatically locative, but
            # not a place. The abstract list filters them out of the count.
            if (is_place_word or is_locative_object) and lemma not in ABSTRACT_NOUNS:
                if lemma not in places:
                    places.append(lemma)
                counted.add(tok.i)
                continue

        # ── internal: what was there ──────────────────────────────────────
        # Remaining concrete common nouns: the objects and percepts of the
        # scene. Abstractions are excluded so "things" is not a detail.
        if tok.pos_ == "NOUN" and lemma not in ABSTRACT_NOUNS and len(lemma) > 2:
            if lemma not in percepts:
                percepts.append(lemma)
            counted.add(tok.i)
            continue

        # ── external: repetition of content already said ──────────────────
        if tok.pos_ in ("NOUN", "VERB", "ADJ", "ADV") and len(lemma) > 2:
            if lemma in seen_content:
                repetitions.append(lemma)
            else:
                seen_content.add(lemma)

    internal_total = (
        len(events) + len(times) + len(places) + len(people) + len(percepts)
    )
    external_total = len(external_generic) + len(repetitions)
    denom = internal_total + external_total
    specificity = round(internal_total / denom, 4) if denom else 0.0

    word_count = len([t for t in doc if not t.is_punct and not t.is_space])
    words_per_minute = (
        round(word_count / (duration_seconds / 60.0), 1)
        if duration_seconds and duration_seconds > 2.0
        else None
    )

    return {
        "task": "daily",
        "scored": True,
        # The headline number is the internal detail count. It is a measurement,
        # not a verdict: see flag and reference_type below.
        "score": internal_total,
        "flag": None,
        "reference_type": "within_person",
        "threshold": (
            "no absolute threshold: automated detail counts have no published "
            "cut-off, so this is read only against this speaker's own baseline"
        ),
        "reference": (
            "Autobiographical Interview (Levine et al. 2002, Psychology and Aging); "
            "reduced internal detail with preserved external detail in AD and aMCI "
            "(Irish et al. 2011; Murphy et al. 2008). Automated approximation, not "
            "manual scoring."
        ),
        "note": (
            "One day on its own means nothing. Sleep, mood and how much happened "
            "that day all move these counts."
        ),
        "details": {
            "language": language,
            "internal_details": internal_total,
            "external_details": external_total,
            "specificity": specificity,
            "breakdown": {
                "events": len(events),
                "time": len(times),
                "place": len(places),
                "people": len(people),
                "perceptual": len(percepts),
            },
            "matched": {
                "events": events[:25],
                "time": times[:25],
                "place": places[:25],
                "people": people[:25],
                "perceptual": percepts[:25],
                "generic": external_generic[:25],
                "repetitions": repetitions[:25],
            },
            "fillers": fillers,
            "word_count": word_count,
            "duration_seconds": round(float(duration_seconds), 1),
            "words_per_minute": words_per_minute,
            "baseline_min_checkins": BASELINE_MIN_CHECKINS,
        },
    }
