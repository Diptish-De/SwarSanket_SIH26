import io
from pathlib import Path
from typing import Union, BinaryIO, Dict, Any, cast
import av
import numpy as np


def decode_and_inspect_audio(
    file_source: Union[str, Path, BinaryIO, bytes],
    silence_threshold: float = 0.01,
) -> Dict[str, Any]:
    """
    Decodes audio (WebM/Opus, MP4, WAV, etc.) to PCM float32 waveform
    using PyAV (bundled FFmpeg libraries) and extracts fundamental audio metrics.
    """
    if isinstance(file_source, bytes):
        container = av.open(io.BytesIO(file_source))
    elif isinstance(file_source, (str, Path)):
        container = av.open(str(file_source))
    else:
        container = av.open(file_source)

    try:
        container_any = cast(Any, container)
        audio_stream = next((s for s in container_any.streams if s.type == "audio"), None)
        if audio_stream is None:
            raise ValueError("No audio stream found in media container.")

        codec_ctx = getattr(audio_stream, "codec_context", None)
        sample_rate = getattr(codec_ctx, "sample_rate", None) or getattr(audio_stream, "sample_rate", None) or 48000
        num_channels = getattr(codec_ctx, "channels", None) or getattr(audio_stream, "channels", None) or 1

        # Decode all audio frames into numpy float32
        frames_list = []
        for frame in container_any.decode(audio_stream):
            # frame.to_ndarray() gives shape (channels, samples) in float32 or int16
            frame_any = cast(Any, frame)
            if not hasattr(frame_any, "to_ndarray"):
                continue
            arr = frame_any.to_ndarray()
            # If int16, normalize to float32 range [-1.0, 1.0]
            if np.issubdtype(arr.dtype, np.integer):
                max_val = float(np.iinfo(cast(Any, arr.dtype)).max)
                arr = arr.astype(np.float32) / max_val
            elif arr.dtype != np.float32:
                arr = arr.astype(np.float32)
            frames_list.append(arr)

        if not frames_list:
            raise ValueError("Audio container contained zero decodable audio frames.")

        audio_pcm = np.concatenate(frames_list, axis=1)  # shape: (channels, total_samples)

        # Average across channels if multi-channel (convert to mono for energy calculations)
        if audio_pcm.shape[0] > 1:
            mono_pcm = np.mean(audio_pcm, axis=0)
        else:
            mono_pcm = audio_pcm[0]

        total_samples = int(mono_pcm.shape[0])
        duration_seconds = total_samples / sample_rate if sample_rate > 0 else 0.0

        # Energy & Amplitude Metrics
        peak_amplitude = float(np.max(np.abs(mono_pcm)))
        rms_energy = float(np.sqrt(np.mean(mono_pcm**2)))

        # Silence Analysis: percentage of samples with absolute amplitude below threshold
        silent_samples = int(np.sum(np.abs(mono_pcm) < silence_threshold))
        silence_percentage = (silent_samples / total_samples) * 100.0 if total_samples > 0 else 0.0

        return {
            "success": True,
            "sample_rate": int(sample_rate),
            "num_channels": int(num_channels),
            "duration_seconds": round(duration_seconds, 3),
            "num_samples": total_samples,
            "rms_energy": round(rms_energy, 6),
            "peak_amplitude": round(peak_amplitude, 6),
            "silence_percentage": round(silence_percentage, 2),
            "silence_threshold": silence_threshold,
        }
    finally:
        container.close()


def analyze_silence_runs(
    file_source: Union[str, Path, BinaryIO, bytes],
    frame_ms: float = 20.0,
    min_pause_ms: float = 150.0,
) -> Dict[str, Any]:
    """
    Frame-level acoustic pause analysis for hesitation biomarkers.

    Faster-Whisper word timestamps are contiguous (each word's end abuts the next
    word's start), so inter-word gaps structurally collapse to ~0 s and cannot be
    used to measure hesitation. This routine instead derives pause structure from
    the PCM energy envelope, which captures intra-utterance silence that the ASR
    timeline smooths over.

    Returns pause-run statistics used for CTP_DPI(ms) and CTP_Hesitation Ratio.
    """
    if isinstance(file_source, bytes):
        container = av.open(io.BytesIO(file_source))
    elif isinstance(file_source, (str, Path)):
        container = av.open(str(file_source))
    else:
        container = av.open(file_source)

    try:
        container_any = cast(Any, container)
        audio_stream = next((s for s in container_any.streams if s.type == "audio"), None)
        if audio_stream is None:
            raise ValueError("No audio stream found in media container.")

        codec_ctx = getattr(audio_stream, "codec_context", None)
        sample_rate = getattr(codec_ctx, "sample_rate", None) or getattr(audio_stream, "sample_rate", None) or 48000

        frames_list = []
        for frame in container_any.decode(audio_stream):
            frame_any = cast(Any, frame)
            if not hasattr(frame_any, "to_ndarray"):
                continue
            arr = frame_any.to_ndarray()
            if np.issubdtype(arr.dtype, np.integer):
                arr = arr.astype(np.float32) / float(np.iinfo(cast(Any, arr.dtype)).max)
            elif arr.dtype != np.float32:
                arr = arr.astype(np.float32)
            frames_list.append(arr)

        if not frames_list:
            raise ValueError("Audio container contained zero decodable audio frames.")

        audio_pcm = np.concatenate(frames_list, axis=1)
        mono_pcm = np.mean(audio_pcm, axis=0) if audio_pcm.shape[0] > 1 else audio_pcm[0]
    finally:
        container.close()

    total_samples = int(mono_pcm.shape[0])
    duration_seconds = total_samples / sample_rate if sample_rate > 0 else 0.0
    frame_len = max(1, int(round(sample_rate * frame_ms / 1000.0)))
    n_frames = total_samples // frame_len

    if n_frames < 2 or duration_seconds <= 0:
        return {
            "duration_seconds": round(duration_seconds, 3),
            "pause_count": 0,
            "mean_pause_ms": 0.0,
            "total_pause_seconds": 0.0,
            "pause_ratio": 0.0,
            "silence_frame_ratio": 0.0,
        }

    trimmed = mono_pcm[: n_frames * frame_len].reshape(n_frames, frame_len)
    frame_rms = np.sqrt(np.mean(trimmed.astype(np.float64) ** 2, axis=1))

    # Adaptive floor: relative to the recording's own loud-speech level, so the
    # threshold tracks microphone gain instead of assuming a fixed amplitude.
    speech_level = float(np.percentile(frame_rms, 90))
    threshold = max(1e-4, 0.15 * speech_level)
    is_silent = frame_rms < threshold

    silence_frame_ratio = float(np.mean(is_silent))

    # Extract contiguous silent runs and keep those long enough to be true pauses
    min_run_frames = max(1, int(round(min_pause_ms / frame_ms)))
    pause_durations_ms = []
    run_len = 0
    for silent in is_silent:
        if silent:
            run_len += 1
        else:
            if run_len >= min_run_frames:
                pause_durations_ms.append(run_len * frame_ms)
            run_len = 0
    if run_len >= min_run_frames:
        pause_durations_ms.append(run_len * frame_ms)

    total_pause_seconds = float(sum(pause_durations_ms) / 1000.0)

    return {
        "duration_seconds": round(duration_seconds, 3),
        "pause_count": len(pause_durations_ms),
        "mean_pause_ms": round(float(np.mean(pause_durations_ms)), 3) if pause_durations_ms else 0.0,
        "total_pause_seconds": round(total_pause_seconds, 3),
        "pause_ratio": round(total_pause_seconds / duration_seconds, 6) if duration_seconds > 0 else 0.0,
        "silence_frame_ratio": round(silence_frame_ratio, 6),
    }
