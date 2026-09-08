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
