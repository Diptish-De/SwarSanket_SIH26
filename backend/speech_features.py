"""
SwarSanket Reproducible Speech Feature Extractor
===============================================
Extracts acoustic, temporal, and linguistic speech markers from:
  1. Decoded PCM audio waveform
  2. Faster-Whisper ASR transcription
  3. Word-level alignment timestamps

NOTE: These features are reproducible engineering metrics calculated directly
from the incoming audio recording and faster-whisper ASR outputs.
They are NOT claimed to be identical to the proprietary CTP dataset feature definitions.
"""

import io
import re
from pathlib import Path
from typing import Union, BinaryIO, Dict, Any, List, Optional, cast
import av
import numpy as np


# Common English and cross-lingual conversational filler words & hesitation markers
DEFAULT_FILLER_LEXICON = {
    "um", "uh", "uhm", "ah", "er", "erm", "eh", "hmm", "hm", "mhm",
    "like", "basically", "actually", "literally", "well", "so"
}

# Standard clinical pause threshold: 250ms (0.25 seconds)
DEFAULT_PAUSE_THRESHOLD_SEC = 0.250


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division guarding against ZeroDivisionError and NaN."""
    if denominator is None or denominator == 0 or np.isnan(denominator):
        return default
    val = numerator / denominator
    return default if np.isnan(val) or np.isinf(val) else float(val)


def decode_audio_pcm(file_source: Union[str, Path, BinaryIO, bytes]) -> Dict[str, Any]:
    """
    Decodes audio (WebM/Opus, MP4, WAV, etc.) to a mono float32 numpy array.
    Safely handles empty, missing, or invalid byte streams without raising uncaught exceptions.
    """
    if isinstance(file_source, bytes) and len(file_source) == 0:
        return {
            "mono_pcm": np.zeros(0, dtype=np.float32),
            "sample_rate": 16000,
            "duration_seconds": 0.0,
        }

    try:
        if isinstance(file_source, bytes):
            container = av.open(io.BytesIO(file_source))
        elif isinstance(file_source, (str, Path)):
            if not Path(file_source).exists() or Path(file_source).stat().st_size == 0:
                return {
                    "mono_pcm": np.zeros(0, dtype=np.float32),
                    "sample_rate": 16000,
                    "duration_seconds": 0.0,
                }
            container = av.open(str(file_source))
        else:
            container = av.open(file_source)
    except Exception:
        return {
            "mono_pcm": np.zeros(0, dtype=np.float32),
            "sample_rate": 16000,
            "duration_seconds": 0.0,
        }

    try:
        container_any = cast(Any, container)
        audio_stream = next((s for s in container_any.streams if s.type == "audio"), None)
        if audio_stream is None:
            return {
                "mono_pcm": np.zeros(0, dtype=np.float32),
                "sample_rate": 16000,
                "duration_seconds": 0.0,
            }

        codec_ctx = getattr(audio_stream, "codec_context", None)
        sample_rate = getattr(codec_ctx, "sample_rate", None) or getattr(audio_stream, "sample_rate", None) or 16000
        frames_list = []
        for frame in container_any.decode(audio_stream):
            frame_any = cast(Any, frame)
            if not hasattr(frame_any, "to_ndarray"):
                continue
            arr = frame_any.to_ndarray()
            if np.issubdtype(arr.dtype, np.integer):
                max_val = float(np.iinfo(cast(Any, arr.dtype)).max)
                arr = arr.astype(np.float32) / max_val
            elif arr.dtype != np.float32:
                arr = arr.astype(np.float32)
            frames_list.append(arr)

        if not frames_list:
            return {
                "mono_pcm": np.zeros(0, dtype=np.float32),
                "sample_rate": sample_rate,
                "duration_seconds": 0.0,
            }

        audio_pcm = np.concatenate(frames_list, axis=1)
        if audio_pcm.shape[0] > 1:
            mono_pcm = np.mean(audio_pcm, axis=0)
        else:
            mono_pcm = audio_pcm[0]

        duration_seconds = float(mono_pcm.shape[0] / sample_rate) if sample_rate > 0 else 0.0

        return {
            "mono_pcm": mono_pcm,
            "sample_rate": sample_rate,
            "duration_seconds": duration_seconds,
        }
    except Exception:
        return {
            "mono_pcm": np.zeros(0, dtype=np.float32),
            "sample_rate": 16000,
            "duration_seconds": 0.0,
        }
    finally:
        try:
            container.close()
        except Exception:
            pass


def extract_acoustic_timing_features(
    mono_pcm: np.ndarray,
    sample_rate: int,
    words: List[Dict[str, Any]],
    total_audio_duration: float,
    pause_threshold_sec: float = DEFAULT_PAUSE_THRESHOLD_SEC,
    noise_floor_threshold: float = 0.01,
) -> Dict[str, Any]:
    """
    Extracts acoustic and temporal features from PCM waveform and word timestamp alignment.

    Formulas & Metrics:
      1. total_audio_duration_sec: Total length of the audio recording (samples / Fs).
      2. speech_duration_sec: Sum of non-overlapping active speaking intervals [start, end] of recognized words.
      3. silence_pause_duration_sec: total_audio_duration_sec - speech_duration_sec.
      4. speech_ratio (Phonation Ratio): speech_duration_sec / total_audio_duration_sec.
      5. pauses: Silence intervals between consecutive words (and leading/trailing boundaries) >= pause_threshold_sec (default 0.25s / 250ms).
      6. pause_count: Total count of pauses exceeding pause_threshold_sec.
      7. average_pause_duration_sec: sum(pause_durations) / pause_count (0.0 if pause_count == 0).
      8. longest_pause_sec: max(pause_durations) (0.0 if no pauses detected).
      9. speech_rate_words_per_sec: word_count / total_audio_duration_sec.
      10. articulation_rate_words_per_sec: word_count / speech_duration_sec.
      11. rms_energy: sqrt(mean(pcm^2)) of normalized float32 waveform.
      12. peak_amplitude: max(|pcm|) absolute peak amplitude in [0.0, 1.0].
      13. speech_activity_ratio: count(|pcm| >= noise_floor_threshold) / total_samples.
    """
    word_count = len(words)

    # 1. Total duration
    if (total_audio_duration is None or total_audio_duration <= 0.0) and sample_rate > 0 and len(mono_pcm) > 0:
        total_audio_duration = float(len(mono_pcm) / sample_rate)
    elif total_audio_duration is None or total_audio_duration < 0.0:
        total_audio_duration = 0.0

    # 2. Speech intervals & duration
    speech_intervals = []
    for w in words:
        start = max(0.0, float(w.get("start", 0.0)))
        end = max(start, float(w.get("end", start)))
        if end > start:
            speech_intervals.append((start, end))

    # Merge overlapping intervals if any
    merged_intervals = []
    for start, end in sorted(speech_intervals, key=lambda x: x[0]):
        if not merged_intervals:
            merged_intervals.append((start, end))
        else:
            prev_start, prev_end = merged_intervals[-1]
            if start <= prev_end:
                merged_intervals[-1] = (prev_start, max(prev_end, end))
            else:
                merged_intervals.append((start, end))

    speech_duration = sum(end - start for start, end in merged_intervals)
    silence_pause_duration = max(0.0, total_audio_duration - speech_duration)
    speech_ratio = safe_div(speech_duration, total_audio_duration, 0.0)

    # 3. Pause analysis (inter-word intervals >= pause_threshold_sec)
    pause_durations = []
    if merged_intervals:
        # Leading silence before first word
        leading_pause = merged_intervals[0][0]
        if leading_pause >= pause_threshold_sec:
            pause_durations.append(leading_pause)

        # Inter-word / inter-interval pauses
        for i in range(len(merged_intervals) - 1):
            pause_gap = merged_intervals[i + 1][0] - merged_intervals[i][1]
            if pause_gap >= pause_threshold_sec:
                pause_durations.append(pause_gap)

        # Trailing silence after last word
        trailing_pause = max(0.0, total_audio_duration - merged_intervals[-1][1])
        if trailing_pause >= pause_threshold_sec:
            pause_durations.append(trailing_pause)
    elif total_audio_duration >= pause_threshold_sec:
        pause_durations.append(total_audio_duration)

    pause_count = len(pause_durations)
    total_pause_duration_gaps = sum(pause_durations)
    avg_pause_duration = safe_div(total_pause_duration_gaps, pause_count, 0.0)
    longest_pause = max(pause_durations) if pause_durations else 0.0

    # 4. Rates
    speech_rate_wps = safe_div(word_count, total_audio_duration, 0.0)
    articulation_rate_wps = safe_div(word_count, speech_duration, 0.0)

    # 5. PCM Acoustic Energy & Amplitude
    if len(mono_pcm) > 0:
        peak_amplitude = float(np.max(np.abs(mono_pcm)))
        rms_energy = float(np.sqrt(np.mean(mono_pcm**2)))
        active_samples = int(np.sum(np.abs(mono_pcm) >= noise_floor_threshold))
        speech_activity_ratio = safe_div(active_samples, len(mono_pcm), 0.0)
    else:
        peak_amplitude = 0.0
        rms_energy = 0.0
        speech_activity_ratio = 0.0

    return {
        "total_audio_duration_sec": round(total_audio_duration, 3),
        "speech_duration_sec": round(speech_duration, 3),
        "silence_pause_duration_sec": round(silence_pause_duration, 3),
        "speech_ratio": round(speech_ratio, 4),
        "pause_count": pause_count,
        "average_pause_duration_sec": round(avg_pause_duration, 3),
        "longest_pause_sec": round(longest_pause, 3),
        "speech_rate_words_per_sec": round(speech_rate_wps, 3),
        "articulation_rate_words_per_sec": round(articulation_rate_wps, 3),
        "rms_energy": round(rms_energy, 6),
        "peak_amplitude": round(peak_amplitude, 6),
        "speech_activity_ratio": round(speech_activity_ratio, 4),
    }


def extract_linguistic_features(
    transcript: str,
    words: List[Dict[str, Any]],
    filler_lexicon: Optional[set] = None,
) -> Dict[str, Any]:
    """
    Extracts lexical and linguistic features from transcribed speech text.

    Formulas & Metrics:
      1. word_count (N): Total count of recognized word tokens.
      2. unique_word_count (V): Count of unique normalized vocabulary words.
      3. lexical_diversity_ttr (Type-Token Ratio): V / N (0.0 if N == 0).
      4. filler_disfluency_count: Recognized fillers (um, uh, like, so, etc.) + immediate word repetitions (e.g. "the the").
      5. hesitation_ratio: filler_disfluency_count / word_count (0.0 if word_count == 0).
      6. sentence_count: Count of syntactic clauses/sentences via terminal punctuation (. ! ?) or segments (min 1 if word_count > 0).
      7. average_words_per_sentence: word_count / sentence_count (0.0 if sentence_count == 0).
    """
    if filler_lexicon is None:
        filler_lexicon = DEFAULT_FILLER_LEXICON

    raw_text = transcript.strip() if transcript else ""

    # Clean word tokens (lowercase, strip non-alphanumeric except apostrophes)
    cleaned_tokens = []
    for w in words:
        token = re.sub(r"[^\w\']", "", str(w.get("word", "")).lower().strip())
        if token:
            cleaned_tokens.append(token)

    # Fallback to splitting raw text if words list was empty
    if not cleaned_tokens and raw_text:
        for t in raw_text.split():
            clean_t = re.sub(r"[^\w\']", "", t.lower().strip())
            if clean_t:
                cleaned_tokens.append(clean_t)

    word_count = len(cleaned_tokens)
    unique_words = set(cleaned_tokens)
    unique_word_count = len(unique_words)
    ttr = safe_div(unique_word_count, word_count, 0.0)

    # Detect filler words and adjacent word repetitions (stutters/disfluencies)
    filler_count = 0
    repetitions_count = 0
    for i, token in enumerate(cleaned_tokens):
        if token in filler_lexicon:
            filler_count += 1
        if i > 0 and token == cleaned_tokens[i - 1]:
            repetitions_count += 1

    total_disfluencies = filler_count + repetitions_count
    hesitation_ratio = safe_div(total_disfluencies, word_count, 0.0)

    # Sentence count estimation (by punctuation + multi-word clauses)
    sentence_splits = [s.strip() for s in re.split(r"[.!?]+", raw_text) if s.strip()]
    sentence_count = len(sentence_splits)
    if sentence_count == 0 and word_count > 0:
        sentence_count = 1

    avg_words_per_sentence = safe_div(word_count, sentence_count, 0.0)

    return {
        "word_count": word_count,
        "unique_word_count": unique_word_count,
        "lexical_diversity_ttr": round(ttr, 4),
        "filler_disfluency_count": total_disfluencies,
        "filler_lexical_count": filler_count,
        "word_repetition_count": repetitions_count,
        "hesitation_ratio": round(hesitation_ratio, 4),
        "sentence_count": sentence_count,
        "average_words_per_sentence": round(avg_words_per_sentence, 2),
    }


def extract_speech_features(
    file_source: Union[str, Path, BinaryIO, bytes],
    transcript: str,
    words: List[Dict[str, Any]],
    total_audio_duration: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Master feature extraction pipeline for SwarSanket.
    Combines decoded audio PCM with ASR transcript and timestamps.

    Returns:
      Clean Python dictionary with structured categories and a flattened feature map.
    """
    # 1. Decode PCM audio
    decoded = decode_audio_pcm(file_source)
    mono_pcm = decoded["mono_pcm"]
    sample_rate = decoded["sample_rate"]
    pcm_duration = decoded["duration_seconds"]

    duration = total_audio_duration if total_audio_duration and total_audio_duration > 0 else pcm_duration

    # 2. Acoustic / Timing features
    acoustic_timing = extract_acoustic_timing_features(
        mono_pcm=mono_pcm,
        sample_rate=sample_rate,
        words=words,
        total_audio_duration=duration,
    )

    # 3. Linguistic features
    linguistic = extract_linguistic_features(
        transcript=transcript,
        words=words,
    )

    # 4. Flattened dictionary of all reproducible features
    all_features = {
        **acoustic_timing,
        **linguistic,
    }

    return {
        "pipeline": "SwarSanket Reproducible Speech Feature Extractor v1.0",
        "audio_metadata": {
            "sample_rate": sample_rate,
            "pcm_samples": len(mono_pcm),
            "calculated_duration_sec": round(duration, 3),
        },
        "transcript_metadata": {
            "raw_transcript": transcript,
            "total_tokens_recognized": len(words),
        },
        "acoustic_timing": acoustic_timing,
        "linguistic": linguistic,
        "all_features": all_features,
    }
