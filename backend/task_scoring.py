"""
Standardized speech-task scoring
================================
Three short tasks that sit beside the picture-description model and are scored
against published reference values rather than by the classifier:

  fluency    Semantic verbal fluency, category "animals", 60 seconds.
             Score = number of distinct animals named. Tombaugh, Kozak & Rees
             (1999) report age-stratified norms; below about 12 in a minute is
             roughly one standard deviation under the mean for adults in their
             seventies and is the conservative flag used here. Canning et al.
             (2004, Neurology) found animal fluency alone separates dementia from
             healthy ageing with a cut-off in the 12-15 range.

  recall     Delayed recall of five words heard earlier in the session (the
             Montreal Cognitive Assessment delayed-recall format). In the MoCA
             validation sample (Nasreddine et al. 2005) healthy controls recalled
             a mean of 3.7 of 5, MCI 1.8, Alzheimer's 0.6. Two or fewer is flagged.

  phonation  Sustained vowel /a/. Maximum phonation time under 10 s is the usual
             clinical threshold for adults (Maslan et al. 2011 report healthy
             means of 15-25 s). Jitter, shimmer and HNR are compared with the
             Multi-Dimensional Voice Program thresholds quoted in the Praat manual
             (jitter local 1.04 %, shimmer local 0.35 dB) and an HNR of 20 dB,
             the customary lower bound for a healthy sustained vowel. These are
             voice-quality references, not Alzheimer's-specific cut-offs, and the
             report says so.

Each scorer returns the same shape:

    {
      "task": str, "scored": bool, "score": number | None,
      "flag": bool | None,          # True = below the typical range
      "threshold": str,             # human-readable rule that was applied
      "reference": str,             # where the rule comes from
      "note": str,                  # why it could not be scored, or caveats
      "details": {...}              # task-specific evidence
    }

Nothing here is fused into the classifier's probability. The battery is reported
as "N of M in the typical range" beside the model's output.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any, BinaryIO, Dict, Iterable, List, Optional, Set, Tuple, Union

import numpy as np

TASKS = ("picture", "fluency", "recall", "phonation")

# ── thresholds ──────────────────────────────────────────────────────────────

FLUENCY_MIN_TYPICAL = 12            # distinct animals in 60 s
FLUENCY_FULL_DURATION_S = 55.0      # shorter than this is reported as incomplete

RECALL_TARGET_COUNT = 5
RECALL_MAX_FLAGGED = 2              # 0-2 of 5 recalled -> below typical

PHONATION_MIN_TYPICAL_S = 10.0      # maximum phonation time
JITTER_LOCAL_MAX_PERCENT = 1.04     # MDVP threshold (Praat manual)
SHIMMER_LOCAL_MAX_DB = 0.35         # MDVP threshold (Praat manual)
HNR_MIN_DB = 20.0                   # customary healthy sustained-vowel floor

# ── text normalisation ──────────────────────────────────────────────────────

_PUNCT = re.compile(r"[\s\.,;:!\?\"'()\[\]{}\-–—…।॥]+")


def _tokens(text: str) -> List[str]:
    """Lower-cased, NFC-normalised word tokens; Indic dandas count as spaces."""
    text = unicodedata.normalize("NFC", text or "").lower()
    return [t for t in _PUNCT.split(text) if t]


def _edit_distance(a: str, b: str) -> int:
    if a == b:
        return 0
    if abs(len(a) - len(b)) > 2:
        return 99
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _fuzzy_equal(token: str, target: str) -> bool:
    """Exact match, or one edit for words long enough that one edit is not a
    different word. Absorbs ASR spelling slips without matching 'cat' to 'cut'."""
    if token == target:
        return True
    if len(target) >= 5 and _edit_distance(token, target) <= 1:
        return True
    return False


# ── animal lexicons ─────────────────────────────────────────────────────────
#
# English is the reference lexicon. Hindi and Bengali are provisional lists of
# common animals in the scripts Whisper emits for those languages; other
# languages are transcribed but not scored, and the response says so rather
# than counting words that may or may not be animals.

_EN_ANIMALS = """
dog cat cow bull ox buffalo goat sheep lamb horse pony donkey mule camel
elephant lion tiger leopard cheetah panther jaguar bear monkey ape gorilla
chimpanzee baboon langur deer antelope gazelle rabbit hare mouse rat squirrel
fox jackal wolf hyena pig boar hippopotamus hippo rhinoceros rhino giraffe zebra
kangaroo koala panda otter beaver badger raccoon skunk weasel mongoose
crocodile alligator snake cobra python viper lizard chameleon gecko iguana
turtle tortoise frog toad fish shark whale dolphin octopus squid crab lobster
shrimp prawn jellyfish starfish seal walrus penguin bird sparrow crow raven
pigeon dove parrot peacock eagle hawk falcon vulture owl kite hen chicken
rooster cock duck goose swan turkey ostrich emu flamingo stork crane heron
cuckoo nightingale kingfisher woodpecker hummingbird myna bulbul quail
partridge pheasant butterfly bee wasp ant termite mosquito fly beetle
cockroach spider scorpion worm snail slug moth cricket grasshopper locust
dragonfly ladybird ladybug bat hedgehog porcupine mole armadillo sloth lemur
meerkat bison yak llama alpaca reindeer moose elk caribou wolverine lynx puma
cougar bobcat ocelot orangutan gibbon rat hamster gerbil guinea ferret chinchilla
calf kid foal piglet chick duckling gosling kitten puppy cub tadpole
eel salmon tuna trout carp catfish goldfish sardine mackerel cod herring
stingray ray seahorse clam oyster mussel coral sponge
""".split()

_EN_MULTIWORD = {
    ("polar", "bear"): "polar bear",
    ("guinea", "pig"): "guinea pig",
    ("sea", "lion"): "sea lion",
    ("killer", "whale"): "killer whale",
    ("blue", "whale"): "blue whale",
    ("water", "buffalo"): "water buffalo",
    ("mountain", "goat"): "mountain goat",
    ("wild", "boar"): "wild boar",
    ("king", "cobra"): "king cobra",
    ("sea", "turtle"): "sea turtle",
    ("humming", "bird"): "hummingbird",
}

# Irregular plurals and common variants collapse to one lemma so "mice" and
# "mouse" count once.
_EN_ALIASES = {
    "mice": "mouse", "geese": "goose", "oxen": "ox", "wolves": "wolf",
    "calves": "calf", "lice": "louse", "hippos": "hippo", "rhinos": "rhino",
    "puppies": "puppy", "kitties": "cat", "kitty": "cat", "doggy": "dog",
    "doggie": "dog", "bunny": "rabbit", "bunnies": "rabbit", "cock": "rooster",
    "hippopotamus": "hippo", "rhinoceros": "rhino", "chimp": "chimpanzee",
    "ladybug": "ladybird", "cougar": "puma", "buffaloes": "buffalo",
    "buffalos": "buffalo", "fishes": "fish", "sheeps": "sheep", "deers": "deer",
}


def _en_lemma(token: str) -> Optional[str]:
    if token in _EN_ALIASES:
        return _EN_ALIASES[token]
    if token in _EN_SET:
        return token
    # regular plurals
    for suffix, repl in (("ies", "y"), ("ches", "ch"), ("shes", "sh"), ("xes", "x"),
                         ("sses", "ss"), ("s", "")):
        if token.endswith(suffix) and len(token) > len(suffix) + 2:
            base = token[: -len(suffix)] + repl
            if base in _EN_ALIASES:
                return _EN_ALIASES[base]
            if base in _EN_SET:
                return base
    return None


_EN_SET: Set[str] = set(_EN_ANIMALS)

_HI_ANIMALS = {
    "कुत्ता": "कुत्ता", "कुत्ते": "कुत्ता", "बिल्ली": "बिल्ली", "गाय": "गाय", "बैल": "बैल",
    "सांड": "सांड", "साँड": "सांड", "भैंस": "भैंस", "भैंसा": "भैंस", "बकरी": "बकरी", "बकरा": "बकरी",
    "भेड़": "भेड़", "भेड": "भेड़", "मेमना": "मेमना", "घोड़ा": "घोड़ा", "घोडा": "घोड़ा", "घोड़े": "घोड़ा",
    "गधा": "गधा", "खच्चर": "खच्चर", "ऊंट": "ऊंट", "ऊँट": "ऊंट", "हाथी": "हाथी", "शेर": "शेर",
    "बाघ": "बाघ", "चीता": "चीता", "तेंदुआ": "तेंदुआ", "भालू": "भालू", "बंदर": "बंदर", "बन्दर": "बंदर",
    "लंगूर": "लंगूर", "हिरण": "हिरण", "हिरन": "हिरण", "खरगोश": "खरगोश", "चूहा": "चूहा", "चूहे": "चूहा",
    "गिलहरी": "गिलहरी", "लोमड़ी": "लोमड़ी", "लोमडी": "लोमड़ी", "सियार": "सियार", "गीदड़": "सियार",
    "भेड़िया": "भेड़िया", "भेडिया": "भेड़िया", "लकड़बग्घा": "लकड़बग्घा", "सूअर": "सूअर", "सुअर": "सूअर",
    "मगरमच्छ": "मगरमच्छ", "घड़ियाल": "घड़ियाल", "सांप": "सांप", "साँप": "सांप", "नाग": "सांप",
    "अजगर": "अजगर", "छिपकली": "छिपकली", "गिरगिट": "गिरगिट", "कछुआ": "कछुआ", "मेंढक": "मेंढक",
    "मछली": "मछली", "केकड़ा": "केकड़ा", "झींगा": "झींगा", "व्हेल": "व्हेल", "डॉल्फिन": "डॉल्फिन",
    "शार्क": "शार्क", "ऑक्टोपस": "ऑक्टोपस", "मोर": "मोर", "कबूतर": "कबूतर", "कौआ": "कौआ",
    "कौवा": "कौआ", "तोता": "तोता", "चिड़िया": "चिड़िया", "चिडिया": "चिड़िया", "गौरैया": "गौरैया",
    "मुर्गी": "मुर्गी", "मुर्गा": "मुर्गी", "बत्तख": "बत्तख", "बतख": "बत्तख", "हंस": "हंस",
    "उल्लू": "उल्लू", "बाज": "बाज", "बाज़": "बाज", "चील": "चील", "गिद्ध": "गिद्ध", "कोयल": "कोयल",
    "बुलबुल": "बुलबुल", "मैना": "मैना", "बगुला": "बगुला", "सारस": "सारस", "पेंगुइन": "पेंगुइन",
    "शुतुरमुर्ग": "शुतुरमुर्ग", "तितली": "तितली", "मधुमक्खी": "मधुमक्खी", "चींटी": "चींटी",
    "मच्छर": "मच्छर", "मक्खी": "मक्खी", "मकड़ी": "मकड़ी", "मकडी": "मकड़ी", "बिच्छू": "बिच्छू",
    "कीड़ा": "कीड़ा", "तिलचट्टा": "तिलचट्टा", "कॉकरोच": "तिलचट्टा", "जोंक": "जोंक", "घोंघा": "घोंघा",
    "ज़ेबरा": "ज़ेबरा", "जेबरा": "ज़ेबरा", "जिराफ़": "जिराफ़", "जिराफ": "जिराफ़", "गैंडा": "गैंडा",
    "कंगारू": "कंगारू", "पांडा": "पांडा", "गोरिल्ला": "गोरिल्ला", "चिंपैंजी": "चिंपैंजी",
    "नेवला": "नेवला", "सील": "सील", "ऊदबिलाव": "ऊदबिलाव", "साही": "साही", "चमगादड़": "चमगादड़",
    "याक": "याक", "नीलगाय": "नीलगाय", "बछड़ा": "बछड़ा", "पिल्ला": "पिल्ला", "छछूंदर": "छछूंदर",
    # romanised forms Whisper sometimes emits
    "kutta": "कुत्ता", "billi": "बिल्ली", "gaay": "गाय", "gai": "गाय", "bakri": "बकरी",
    "ghoda": "घोड़ा", "gadha": "गधा", "oont": "ऊंट", "haathi": "हाथी", "hathi": "हाथी",
    "sher": "शेर", "baagh": "बाघ", "bandar": "बंदर", "hiran": "हिरण", "khargosh": "खरगोश",
    "chuha": "चूहा", "machli": "मछली", "machhli": "मछली", "mor": "मोर", "kabutar": "कबूतर",
    "tota": "तोता", "kauwa": "कौआ", "murgi": "मुर्गी", "bhains": "भैंस", "bhalu": "भालू",
    "saap": "सांप", "lomdi": "लोमड़ी", "ullu": "उल्लू", "titli": "तितली", "cheeta": "चीता",
}

_BN_ANIMALS = {
    "কুকুর": "কুকুর", "বিড়াল": "বিড়াল", "বেড়াল": "বিড়াল", "গরু": "গরু", "ষাঁড়": "ষাঁড়",
    "মহিষ": "মহিষ", "মোষ": "মহিষ", "ছাগল": "ছাগল", "ভেড়া": "ভেড়া", "ঘোড়া": "ঘোড়া",
    "গাধা": "গাধা", "খচ্চর": "খচ্চর", "উট": "উট", "হাতি": "হাতি", "সিংহ": "সিংহ", "বাঘ": "বাঘ",
    "চিতা": "চিতা", "ভালুক": "ভালুক", "ভাল্লুক": "ভালুক", "বানর": "বানর", "বাঁদর": "বানর",
    "হনুমান": "হনুমান", "হরিণ": "হরিণ", "খরগোশ": "খরগোশ", "ইঁদুর": "ইঁদুর", "ইদুর": "ইঁদুর",
    "কাঠবিড়ালি": "কাঠবিড়ালি", "শিয়াল": "শিয়াল", "শেয়াল": "শিয়াল", "নেকড়ে": "নেকড়ে",
    "হায়না": "হায়না", "শূকর": "শূকর", "শুয়োর": "শূকর", "কুমির": "কুমির", "সাপ": "সাপ",
    "অজগর": "অজগর", "টিকটিকি": "টিকটিকি", "গিরগিটি": "গিরগিটি", "কচ্ছপ": "কচ্ছপ", "কাছিম": "কচ্ছপ",
    "ব্যাঙ": "ব্যাঙ", "মাছ": "মাছ", "কাঁকড়া": "কাঁকড়া", "চিংড়ি": "চিংড়ি", "তিমি": "তিমি",
    "ডলফিন": "ডলফিন", "শুশুক": "ডলফিন", "হাঙর": "হাঙর", "অক্টোপাস": "অক্টোপাস", "ময়ূর": "ময়ূর",
    "পায়রা": "পায়রা", "কবুতর": "পায়রা", "কাক": "কাক", "টিয়া": "টিয়া", "পাখি": "পাখি",
    "চড়ুই": "চড়ুই", "মুরগি": "মুরগি", "মোরগ": "মুরগি", "হাঁস": "হাঁস", "রাজহাঁস": "রাজহাঁস",
    "পেঁচা": "পেঁচা", "বাজ": "বাজ", "ঈগল": "ঈগল", "চিল": "চিল", "শকুন": "শকুন", "কোকিল": "কোকিল",
    "বুলবুল": "বুলবুল", "ময়না": "ময়না", "বক": "বক", "সারস": "সারস", "পেঙ্গুইন": "পেঙ্গুইন",
    "উটপাখি": "উটপাখি", "প্রজাপতি": "প্রজাপতি", "মৌমাছি": "মৌমাছি", "পিঁপড়ে": "পিঁপড়ে",
    "পিঁপড়া": "পিঁপড়ে", "মশা": "মশা", "মাছি": "মাছি", "মাকড়সা": "মাকড়সা", "বিছে": "বিছে",
    "কেঁচো": "কেঁচো", "আরশোলা": "আরশোলা", "শামুক": "শামুক", "জোঁক": "জোঁক", "জেব্রা": "জেব্রা",
    "জিরাফ": "জিরাফ", "গণ্ডার": "গণ্ডার", "জলহস্তী": "জলহস্তী", "ক্যাঙ্গারু": "ক্যাঙ্গারু",
    "পান্ডা": "পান্ডা", "গরিলা": "গরিলা", "শিম্পাঞ্জি": "শিম্পাঞ্জি", "বেজি": "বেজি", "সীল": "সীল",
    "ভোঁদড়": "ভোঁদড়", "সজারু": "সজারু", "বাদুড়": "বাদুড়", "চামচিকে": "বাদুড়", "বাছুর": "বাছুর",
    "নীলগাই": "নীলগাই", "ছুঁচো": "ছুঁচো",
}

ANIMAL_LEXICONS: Dict[str, Dict[str, str]] = {
    "en": {w: w for w in _EN_SET},
    "hi": _HI_ANIMALS,
    "bn": _BN_ANIMALS,
}

LEXICON_QUALITY = {"en": "reference", "hi": "provisional", "bn": "provisional"}


def _match_animals(tokens: List[str], language: str) -> Tuple[List[str], List[str]]:
    """Returns (animals in order of first mention, repeated mentions)."""
    lexicon = ANIMAL_LEXICONS.get(language, {})
    seen: List[str] = []
    repeats: List[str] = []
    i = 0
    while i < len(tokens):
        lemma: Optional[str] = None
        if language == "en":
            if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) in _EN_MULTIWORD:
                lemma = _EN_MULTIWORD[(tokens[i], tokens[i + 1])]
                i += 1
            else:
                lemma = _en_lemma(tokens[i])
        else:
            lemma = lexicon.get(tokens[i])
        if lemma:
            if lemma in seen:
                repeats.append(lemma)
            else:
                seen.append(lemma)
        i += 1
    return seen, repeats


# ── scorers ────────────────────────────────────────────────────────────────


def score_fluency(
    transcript: str,
    words: Optional[List[Dict[str, Any]]],
    language: str,
    duration_seconds: float,
) -> Dict[str, Any]:
    language = (language or "en").lower()[:2]
    tokens = _tokens(transcript)
    base = {
        "task": "fluency",
        "threshold": f"fewer than {FLUENCY_MIN_TYPICAL} distinct animals in 60 s is below the typical range",
        "reference": "Tombaugh, Kozak & Rees 1999 (age norms); Canning et al. 2004, Neurology",
    }

    if language not in ANIMAL_LEXICONS:
        return {
            **base,
            "scored": False,
            "score": None,
            "flag": None,
            "note": (
                f"No animal lexicon for language '{language}'. The transcript is "
                "kept for a clinician to count by hand; nothing was scored automatically."
            ),
            "details": {"language": language, "word_count": len(tokens), "animals": []},
        }

    animals, repeats = _match_animals(tokens, language)
    count = len(animals)

    # Time course: how many came in the first 15 s. Clustering early then
    # drying up is the classic fluency profile, so it is worth showing.
    first_quarter = None
    if words:
        firsts: Dict[str, float] = {}
        lex = ANIMAL_LEXICONS[language]
        for w in words:
            tok = _tokens(str(w.get("word", "")))
            if not tok:
                continue
            lemma = _en_lemma(tok[0]) if language == "en" else lex.get(tok[0])
            if lemma and lemma not in firsts:
                firsts[lemma] = float(w.get("start", 0.0))
        first_quarter = sum(1 for t in firsts.values() if t < 15.0)

    incomplete = duration_seconds < FLUENCY_FULL_DURATION_S
    note = ""
    if incomplete:
        note = (
            f"Recording lasted {duration_seconds:.0f} s, not the full 60 s; the count "
            "is reported as recorded and is likely an underestimate."
        )
    if LEXICON_QUALITY[language] == "provisional":
        note = (note + " " if note else "") + (
            f"The {language} animal lexicon is provisional; animals not in it are not counted."
        )

    return {
        **base,
        "scored": True,
        "score": count,
        "flag": count < FLUENCY_MIN_TYPICAL,
        "note": note,
        "details": {
            "language": language,
            "lexicon_quality": LEXICON_QUALITY[language],
            "animals": animals,
            "repetitions": repeats,
            "first_15s_count": first_quarter,
            "duration_seconds": round(float(duration_seconds), 1),
            "incomplete": incomplete,
            "word_count": len(tokens),
        },
    }


def score_recall(transcript: str, target_words: Iterable[str], language: str = "") -> Dict[str, Any]:
    targets = [unicodedata.normalize("NFC", str(t)).strip().lower() for t in target_words if str(t).strip()]
    tokens = _tokens(transcript)
    base = {
        "task": "recall",
        "threshold": f"{RECALL_MAX_FLAGGED} or fewer of {len(targets) or RECALL_TARGET_COUNT} words recalled is below the typical range",
        "reference": "MoCA delayed recall; Nasreddine et al. 2005 (controls 3.7/5, MCI 1.8/5, AD 0.6/5)",
    }
    if not targets:
        return {**base, "scored": False, "score": None, "flag": None,
                "note": "No target words were supplied for this recall task.",
                "details": {"recalled": [], "missed": [], "word_count": len(tokens)}}

    recalled: List[str] = []
    missed: List[str] = []
    for target in targets:
        target_tokens = _tokens(target)
        hit = False
        if len(target_tokens) == 1:
            hit = any(_fuzzy_equal(tok, target_tokens[0]) for tok in tokens)
        else:
            joined = " ".join(tokens)
            hit = " ".join(target_tokens) in joined
        (recalled if hit else missed).append(target)

    n = len(recalled)
    return {
        **base,
        "scored": True,
        "score": n,
        "flag": n <= RECALL_MAX_FLAGGED,
        "note": "" if tokens else "Nothing intelligible was transcribed from the recall recording.",
        "details": {
            "recalled": recalled,
            "missed": missed,
            "targets": targets,
            "word_count": len(tokens),
            "language": language,
        },
    }


def _voiced_runs(y: np.ndarray, sr: int, frame_s: float = 0.025, hop_s: float = 0.010,
                 bridge_s: float = 0.30) -> List[Tuple[float, float]]:
    """Runs of frames whose RMS clears an adaptive threshold, bridging short gaps."""
    frame = max(1, int(sr * frame_s))
    hop = max(1, int(sr * hop_s))
    if y.size < frame:
        return []
    n = 1 + (y.size - frame) // hop
    idx = np.arange(frame)[None, :] + hop * np.arange(n)[:, None]
    rms = np.sqrt(np.mean(y[idx] ** 2, axis=1) + 1e-12)
    loud = float(np.percentile(rms, 95))
    # A held vowel fills most of the clip, so a percentile "noise floor" would
    # be the vowel itself. Voicing is therefore judged relative to the loud
    # level (-20 dB), with an absolute floor so a silent clip is not all "on".
    if loud < 3e-3:  # about -50 dBFS: nothing was really said
        return []
    thr = loud * 0.1
    on = rms > thr
    runs: List[Tuple[float, float]] = []
    start: Optional[int] = None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start * hop_s, i * hop_s))
            start = None
    if start is not None:
        runs.append((start * hop_s, n * hop_s))
    # bridge gaps shorter than bridge_s
    merged: List[Tuple[float, float]] = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < bridge_s:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    return merged


def score_phonation(audio_source: Union[str, Path, BinaryIO, bytes]) -> Dict[str, Any]:
    from voice_quality import _decode_mono, analyze_voice_quality

    base = {
        "task": "phonation",
        "threshold": (
            f"maximum phonation time under {PHONATION_MIN_TYPICAL_S:.0f} s, or two of three "
            f"perturbation measures outside range (jitter > {JITTER_LOCAL_MAX_PERCENT} %, "
            f"shimmer > {SHIMMER_LOCAL_MAX_DB} dB, HNR < {HNR_MIN_DB:.0f} dB), is below the typical range"
        ),
        "reference": "MPT: Maslan et al. 2011; jitter/shimmer: MDVP thresholds (Praat manual); HNR 20 dB sustained-vowel floor",
    }

    y, sr = _decode_mono(audio_source)
    if y.size == 0 or sr == 0:
        return {**base, "scored": False, "score": None, "flag": None,
                "note": "The recording could not be decoded.", "details": {}}

    runs = _voiced_runs(y, sr)
    mpt = max((b - a for a, b in runs), default=0.0)
    total_voiced = sum(b - a for a, b in runs)
    duration = y.size / sr

    vq = analyze_voice_quality(audio_source)

    measured = bool(vq.get("measured"))
    out_of_range: List[str] = []
    if measured:
        if vq["jitter_local_percent"] > JITTER_LOCAL_MAX_PERCENT:
            out_of_range.append("jitter")
        if vq["shimmer_local_db"] > SHIMMER_LOCAL_MAX_DB:
            out_of_range.append("shimmer")
        if vq["hnr_db"] < HNR_MIN_DB:
            out_of_range.append("hnr")

    # Without pitch-tracked voicing there is no evidence a vowel was held at
    # all, so neither phonation time nor perturbation is scored.
    if not measured or mpt < 1.0:
        return {**base, "scored": False, "score": round(mpt, 1), "flag": None,
                "note": "No sustained voicing was found; the vowel needs to be held for several seconds.",
                "details": {"max_phonation_seconds": round(mpt, 2), "duration_seconds": round(duration, 2),
                            "voice_quality": vq}}

    flag = (mpt < PHONATION_MIN_TYPICAL_S) or len(out_of_range) >= 2
    note = (
        "Voice-quality thresholds are general laryngeal references, not Alzheimer's-specific cut-offs."
    )
    return {
        **base,
        "scored": True,
        "score": round(mpt, 1),
        "flag": bool(flag),
        "note": note,
        "details": {
            "max_phonation_seconds": round(mpt, 2),
            "total_voiced_seconds": round(total_voiced, 2),
            "duration_seconds": round(duration, 2),
            "voiced_runs": [(round(a, 2), round(b, 2)) for a, b in runs],
            "perturbation_out_of_range": out_of_range,
            "voice_quality": vq,
        },
    }


def summarize_battery(results: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """'N of M in the typical range' over the scored tasks only. No fusion."""
    results = list(results)
    scored = [r for r in results if r.get("scored")]
    typical = sum(1 for r in scored if r.get("flag") is False)
    return {
        "scored_tasks": len(scored),
        "in_typical_range": typical,
        "below_typical": [r["task"] for r in scored if r.get("flag")],
        "unscored": [r["task"] for r in results if not r.get("scored")],
    }
