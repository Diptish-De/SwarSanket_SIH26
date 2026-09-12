"""
SwarSanket Voice Quality Analysis
=================================
Measures fundamental frequency statistics and voice perturbation from the PCM
waveform: F0 mean/SD, jitter, shimmer and harmonics-to-noise ratio.

WHY THIS MODULE EXISTS
----------------------
These four quantities were previously not measured at all:

  - `CTP_F0 SD(st)` - a live input to the 22-feature model - was always the
    training median (5.554), so pitch variability contributed a constant to
    every prediction regardless of the speaker.
  - jitter (1.5%), shimmer (2.3 dB) and HNR (24.5 dB) were fixed literals in the
    frontend, displayed to the user as if they had been measured.

All four are directly computable from the waveform, so they are now computed.

METHOD
------
Classical short-time autocorrelation pipeline (Boersma 1993):

  1. Per-frame normalised autocorrelation yields F0 and a harmonicity ratio -
     the fraction of frame energy explained by the periodic component.
  2. A frame is voiced when both that ratio and the frame energy clear a floor
     set relative to the recording's own speech level, so the decision tracks
     microphone gain instead of assuming a fixed amplitude.
  3. Within each contiguous voiced run, glottal cycles are located by peak
     picking at the locally estimated period, and jitter/shimmer are measured
     cycle-to-cycle. Frame-to-frame differencing would average perturbation away
     across the ~4 cycles inside a frame and systematically understate it.

This is not Praat, and absolute values will differ from a Praat report by a
small margin. They are internally consistent, which is what a within-speaker
longitudinal comparison actually requires.
"""

import io
from pathlib import Path
from typing import Any, BinaryIO, Dict, List, Tuple, Union, cast

import av
import numpy as np
from scipy.signal import butter, filtfilt

# Human voice F0 bounds, widened at the low end for elderly male speakers.
F0_MIN_HZ = 60.0
F0_MAX_HZ = 400.0

# Normalised autocorrelation peak required to call a frame voiced.
VOICING_CORR_FLOOR = 0.45

# Below this many voiced frames (~0.3 s at a 10 ms hop) the standard deviation
# is dominated by estimation noise rather than by the speaker.
MIN_VOICED_FRAMES = 30


def _decode_mono(
    file_source: Union[str, Path, BinaryIO, bytes],
) -> Tuple[np.ndarray, int]:
    """Decodes any supported container to a mono float64 waveform and its rate."""
    if isinstance(file_source, bytes):
        container = av.open(io.BytesIO(file_source))
    elif isinstance(file_source, (str, Path)):
        container = av.open(str(file_source))
    else:
        container = av.open(file_source)

    try:
        container_any = cast(Any, container)
        stream = next((s for s in container_any.streams if s.type == "audio"), None)
        if stream is None:
            return np.zeros(0), 0

        codec_ctx = getattr(stream, "codec_context", None)
        sample_rate = (
            getattr(codec_ctx, "sample_rate", None)
            or getattr(stream, "sample_rate", None)
            or 48000
        )

        chunks: List[np.ndarray] = []
        for frame in container_any.decode(stream):
            frame_any = cast(Any, frame)
            if not hasattr(frame_any, "to_ndarray"):
                continue
            arr = frame_any.to_ndarray()
            if np.issubdtype(arr.dtype, np.integer):
                arr = arr.astype(np.float64) / float(
                    np.iinfo(cast(Any, arr.dtype)).max
                )
            else:
                arr = arr.astype(np.float64)
            chunks.append(arr)

        if not chunks:
            return np.zeros(0), int(sample_rate)

        pcm = np.concatenate(chunks, axis=1)
        mono = np.mean(pcm, axis=0) if pcm.shape[0] > 1 else pcm[0]
        return mono.astype(np.float64), int(sample_rate)
    finally:
        container.close()


def _normalized_autocorr(frame: np.ndarray) -> np.ndarray:
    """
    Window-corrected normalised autocorrelation (Boersma 1993, section 3).

    A plain autocorrelation of a windowed frame is biased downward at longer
    lags by two effects: the Hanning taper itself, and the shrinking overlap of
    the shifted copies. Both make a perfectly periodic signal look noisy, which
    is why an uncorrected estimate produces an HNR of a few dB for clean speech
    instead of the expected 15-25 dB. Dividing the signal's autocorrelation by
    the window's own autocorrelation removes both.
    """
    n = frame.size
    window = np.hanning(n)
    x = (frame - float(np.mean(frame))) * window

    energy = float(np.dot(x, x))
    if energy <= 0.0:
        return np.zeros(n)

    rx = np.correlate(x, x, mode="full")[n - 1 :] / energy
    rw = np.correlate(window, window, mode="full")[n - 1 :]
    if rw[0] <= 0.0:
        return np.zeros(n)
    rw = rw / rw[0]

    # Below ~10% window overlap the correction divides by near-zero and the
    # result is meaningless, so those lags are zeroed rather than amplified.
    out = np.zeros(n)
    valid = rw > 0.1
    out[valid] = rx[valid] / rw[valid]
    return out


def _frame_f0(
    frame: np.ndarray,
    sample_rate: int,
    f0_min: float = F0_MIN_HZ,
    f0_max: float = F0_MAX_HZ,
) -> Tuple[float, float]:
    """
    Returns (f0_hz, harmonicity) for a single frame, or (0.0, 0.0) if unvoiced.

    `harmonicity` is the window-corrected autocorrelation peak, i.e. the share
    of the frame's energy carried by its periodic component.
    """
    corr = _normalized_autocorr(frame)
    if corr.size == 0 or not np.any(corr):
        return 0.0, 0.0

    min_lag = max(1, int(sample_rate / f0_max))
    max_lag = min(len(corr) - 2, int(sample_rate / f0_min))
    if max_lag <= min_lag:
        return 0.0, 0.0

    search = corr[min_lag : max_lag + 1]
    idx = int(np.argmax(search))
    lag = float(min_lag + idx)
    peak = float(min(search[idx], 0.999999))
    if peak <= 0.0:
        return 0.0, 0.0

    # Parabolic interpolation for sub-sample period resolution. Without it the
    # period is quantised to the sample grid and the resulting jitter measures
    # that quantisation instead of the voice.
    int_lag = int(lag)
    if 0 < int_lag < len(corr) - 1:
        y0, y1, y2 = corr[int_lag - 1], corr[int_lag], corr[int_lag + 1]
        denom = 2.0 * (y0 - 2.0 * y1 + y2)
        if abs(denom) > 1e-12:
            lag = lag + float((y0 - y2) / denom)

    if lag <= 0.0:
        return 0.0, 0.0
    return float(sample_rate / lag), peak


def _cycle_measurements(
    segment: np.ndarray, period_samples: float, sample_rate: int
) -> Tuple[List[float], List[float]]:
    """
    Marks successive glottal cycles and returns (periods, peak amplitudes).

    Cycles are delimited by positive-going zero crossings of a band-passed copy
    of the segment, not by peak picking on the raw waveform. Two reasons:

      - Running speech carries strong formant energy above F0, so maxima of the
        raw signal latch onto whichever harmonic dominates locally and hop
        between them. Band-passing around F0 leaves one quasi-sinusoid.
      - A sinusoid's peak is flat, so its location is highly sensitive to noise,
        whereas its zero crossing is the steepest point on the waveform and is
        the most noise-robust landmark available. Peak picking inside a search
        window also cannot fail gracefully: it returns the window edge, which
        produces periods pinned to the search bounds rather than an honest
        measurement.

    Crossings are linearly interpolated for sub-sample resolution, since a
    period quantised to the 48 kHz grid carries ~0.25% spurious jitter at
    typical F0 - the same order as the quantity being measured.

    Amplitudes are taken from the ORIGINAL waveform within each cycle, because
    shimmer is a property of the full glottal pulse, not of the filtered
    fundamental.
    """
    periods: List[float] = []
    amplitudes: List[float] = []

    window = int(round(period_samples))
    if window < 2 or segment.size < 4 * window:
        return periods, amplitudes

    f0 = sample_rate / period_samples
    nyquist = sample_rate / 2.0
    low = max(0.5 * f0, 40.0) / nyquist
    high = min(1.7 * f0, 0.9 * nyquist) / nyquist
    if not 0.0 < low < high < 1.0:
        return periods, amplitudes

    try:
        # output="ba" is the default, but stating it lets the type checker see a
        # 2-tuple rather than the zpk/sos overloads butter can also return.
        coeffs = cast(
            Tuple[np.ndarray, np.ndarray],
            butter(2, [low, high], btype="band", output="ba"),
        )
        fundamental = np.asarray(filtfilt(coeffs[0], coeffs[1], segment))
    except Exception:
        return periods, amplitudes

    # Positive-going zero crossings, linearly interpolated.
    sign = np.signbit(fundamental)
    idx = np.flatnonzero(sign[:-1] & ~sign[1:])
    if idx.size < 4:
        return periods, amplitudes

    y0 = fundamental[idx]
    y1 = fundamental[idx + 1]
    denom = y1 - y0
    frac = np.where(np.abs(denom) > 1e-12, -y0 / np.where(denom == 0, 1e-12, denom), 0.0)
    crossings = idx.astype(np.float64) + np.clip(frac, 0.0, 1.0)

    raw_periods = np.diff(crossings)

    # A crossing pair spanning far from the expected period means the band-pass
    # let through a harmonic or dropped a cycle; those are tracking failures, not
    # perturbation, and are discarded rather than allowed to inflate jitter.
    valid = (raw_periods > 0.7 * period_samples) & (raw_periods < 1.4 * period_samples)

    for i in range(raw_periods.size):
        if not valid[i]:
            continue
        lo = int(crossings[i])
        hi = int(crossings[i + 1])
        if hi <= lo or hi > segment.size:
            continue
        periods.append(float(raw_periods[i]))
        amplitudes.append(float(np.max(np.abs(segment[lo:hi]))))

    return periods, amplitudes


def _empty_result() -> Dict[str, Any]:
    return {
        "measured": False,
        "voiced_frame_count": 0,
        "voiced_ratio": 0.0,
        "f0_mean_hz": 0.0,
        "f0_sd_hz": 0.0,
        "f0_sd_semitones": 0.0,
        "jitter_local_percent": 0.0,
        "jitter_rap_percent": 0.0,
        "shimmer_local_db": 0.0,
        "hnr_db": 0.0,
        "cycles_analyzed": 0,
        "voiced_runs_analyzed": 0,
    }


def analyze_voice_quality(
    file_source: Union[str, Path, BinaryIO, bytes],
    frame_ms: float = 40.0,
    hop_ms: float = 10.0,
) -> Dict[str, Any]:
    """
    Measures F0 statistics and voice perturbation from a recording.

    Returns `measured: False` with zeroed values when the recording holds too
    little voiced speech to support an estimate. Callers MUST fall back to the
    training median in that case; presenting a zero as if it were a measurement
    is exactly the failure this module was written to remove.
    """
    try:
        mono, sample_rate = _decode_mono(file_source)
    except Exception:
        return _empty_result()

    if sample_rate <= 0 or mono.size == 0:
        return _empty_result()

    frame_len = int(sample_rate * frame_ms / 1000.0)
    hop_len = int(sample_rate * hop_ms / 1000.0)
    if frame_len < 32 or hop_len < 1 or mono.size < frame_len:
        return _empty_result()

    n_frames = 1 + (mono.size - frame_len) // hop_len
    if n_frames < 5:
        return _empty_result()

    # Adaptive energy floor, mirroring the pause detector in audio_analyzer.
    frame_rms = np.array(
        [
            float(
                np.sqrt(
                    np.mean(mono[i * hop_len : i * hop_len + frame_len] ** 2)
                )
            )
            for i in range(n_frames)
        ]
    )
    energy_floor = max(1e-5, 0.15 * float(np.percentile(frame_rms, 90)))

    f0_values = np.zeros(n_frames)
    harmonicity = np.zeros(n_frames)

    for i in range(n_frames):
        if frame_rms[i] < energy_floor:
            continue
        frame = mono[i * hop_len : i * hop_len + frame_len]
        f0, corr_peak = _frame_f0(frame, sample_rate)
        if f0 > 0.0 and corr_peak >= VOICING_CORR_FLOOR:
            f0_values[i] = f0
            harmonicity[i] = corr_peak

    voiced_mask = f0_values > 0.0
    voiced_count = int(np.sum(voiced_mask))
    if voiced_count < MIN_VOICED_FRAMES:
        return _empty_result()

    voiced_f0 = f0_values[voiced_mask]

    # Octave-error guard. A handful of frames locked onto 2x or 0.5x the true F0
    # would otherwise dominate the standard deviation.
    median_f0 = float(np.median(voiced_f0))
    keep = (voiced_f0 > 0.6 * median_f0) & (voiced_f0 < 1.7 * median_f0)
    if int(np.sum(keep)) >= 20:
        voiced_f0 = voiced_f0[keep]
        median_f0 = float(np.median(voiced_f0))

    f0_mean = float(np.mean(voiced_f0))
    f0_sd_hz = float(np.std(voiced_f0))

    # Semitone form is the speaker-independent one, and is how CTP_F0 SD(st) is
    # defined: a 20 Hz spread means something very different on a 90 Hz voice
    # than on a 220 Hz one.
    f0_sd_semitones = float(np.std(12.0 * np.log2(voiced_f0 / median_f0)))

    # HNR from the mean periodic energy fraction r: HNR = 10 log10(r / (1 - r)).
    r = float(np.clip(np.mean(harmonicity[voiced_mask]), 1e-6, 0.999999))
    hnr_db = float(10.0 * np.log10(r / (1.0 - r)))

    # Cycle-level perturbation, accumulated PER voiced run. Differencing a
    # single concatenated list would subtract the last cycle of one run from the
    # first cycle of the next - across a pause, a different vowel and a different
    # pitch - and a 12 s clip holds ~70 runs, so those boundary jumps dominate
    # the result and report a healthy voice at 16% jitter.
    run_periods: List[np.ndarray] = []
    run_amplitudes: List[np.ndarray] = []
    run_start = None

    for i in range(n_frames + 1):
        voiced = i < n_frames and bool(voiced_mask[i])
        if voiced and run_start is None:
            run_start = i
        elif not voiced and run_start is not None:
            run_f0 = f0_values[run_start:i]
            run_f0 = run_f0[run_f0 > 0]
            if run_f0.size >= 4:
                start_sample = run_start * hop_len
                end_sample = min(mono.size, (i - 1) * hop_len + frame_len)
                segment = mono[start_sample:end_sample]
                period_samples = sample_rate / float(np.median(run_f0))
                periods, amps = _cycle_measurements(
                    segment, period_samples, sample_rate
                )
                if len(periods) >= 3:
                    run_periods.append(np.asarray(periods, dtype=np.float64))
                    run_amplitudes.append(np.asarray(amps, dtype=np.float64))
            run_start = None

    # Local jitter and RAP are both accumulated as sums of absolute differences
    # over a total cycle count, so each run contributes in proportion to its
    # length without any cross-run difference ever being taken.
    jitter_abs_sum = 0.0
    rap_abs_sum = 0.0
    period_sum = 0.0
    jitter_n = 0
    rap_n = 0

    for periods in run_periods:
        jitter_abs_sum += float(np.sum(np.abs(np.diff(periods))))
        jitter_n += periods.size - 1
        period_sum += float(np.sum(periods))

        # RAP: each period against the mean of itself and its two neighbours.
        # Connected speech glides in pitch continuously, and that glide is
        # intonation, not perturbation; the 3-point baseline removes it, which
        # local jitter alone cannot do.
        if periods.size >= 3:
            smooth = (periods[:-2] + periods[1:-1] + periods[2:]) / 3.0
            rap_abs_sum += float(np.sum(np.abs(periods[1:-1] - smooth)))
            rap_n += periods.size - 2

    total_cycles = int(sum(p.size for p in run_periods))
    mean_period = period_sum / total_cycles if total_cycles > 0 else 0.0

    jitter_percent = (
        100.0 * (jitter_abs_sum / jitter_n) / mean_period
        if jitter_n > 0 and mean_period > 0.0
        else 0.0
    )
    jitter_rap_percent = (
        100.0 * (rap_abs_sum / rap_n) / mean_period
        if rap_n > 0 and mean_period > 0.0
        else 0.0
    )

    shimmer_sum = 0.0
    shimmer_n = 0
    for amps in run_amplitudes:
        a = amps[amps > 1e-9]
        if a.size >= 2:
            shimmer_sum += float(np.sum(np.abs(20.0 * np.log10(a[1:] / a[:-1]))))
            shimmer_n += a.size - 1
    shimmer_db = shimmer_sum / shimmer_n if shimmer_n > 0 else 0.0

    return {
        "measured": True,
        "voiced_frame_count": voiced_count,
        "voiced_ratio": round(float(np.mean(voiced_mask)), 6),
        "f0_mean_hz": round(f0_mean, 3),
        "f0_sd_hz": round(f0_sd_hz, 3),
        "f0_sd_semitones": round(f0_sd_semitones, 4),
        "jitter_local_percent": round(jitter_percent, 4),
        "jitter_rap_percent": round(jitter_rap_percent, 4),
        "shimmer_local_db": round(shimmer_db, 4),
        "hnr_db": round(hnr_db, 3),
        "cycles_analyzed": total_cycles,
        "voiced_runs_analyzed": len(run_periods),
    }
