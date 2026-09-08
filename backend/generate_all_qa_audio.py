"""
Generate and prepare the 8 QA audio test cases for Step 99.
"""

import os
import shutil
import urllib.request
import urllib.parse
from pathlib import Path
import numpy as np
import scipy.io.wavfile as wavfile
import av

BASE_DIR = Path(__file__).resolve().parent
TEST_AUDIO_DIR = BASE_DIR / "test_audio"
TEST_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR = BASE_DIR / "uploads"


def create_case_1_normal():
    """Case 1: Normal 10-20 second speech (Real WebM recording from uploads)."""
    src = UPLOADS_DIR / "swarsanket_20260905_103216_dc24d59e.webm"
    dest = TEST_AUDIO_DIR / "case1_normal_speech_12s.webm"
    if src.exists():
        shutil.copyfile(src, dest)
        print(f"Case 1 created: {dest.name} ({dest.stat().st_size} bytes)")
    else:
        raise FileNotFoundError(f"Source file {src} not found")


def create_case_2_short():
    """Case 2: Very short speech (~1.2 seconds)."""
    # Generated via powershell David voice
    wav_path = TEST_AUDIO_DIR / "case2_short_1s.wav"
    ps_cmd = f"powershell -Command \"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft David Desktop'); $s.SetOutputToWaveFile('{wav_path}'); $s.Speak('Yes, ready.'); $s.Dispose();\""
    os.system(ps_cmd)
    print(f"Case 2 created: {wav_path.name} ({wav_path.stat().st_size} bytes)")


def create_case_3_silence():
    """Case 3: Silence (~6 seconds, near-zero RMS)."""
    sample_rate = 16000
    duration = 6.0
    num_samples = int(sample_rate * duration)
    # Extremely low ambient floor (RMS ~ 0.00005)
    noise = np.random.normal(0, 0.00005, num_samples).astype(np.float32)
    # Scale to int16
    int16_data = (noise * 32767).astype(np.int16)
    wav_path = TEST_AUDIO_DIR / "case3_silence_6s.wav"
    wavfile.write(str(wav_path), sample_rate, int16_data)
    print(f"Case 3 created: {wav_path.name} ({wav_path.stat().st_size} bytes)")


def create_case_4_low_volume():
    """Case 4: Poor/low-volume audio (Speech attenuated by ~28 dB)."""
    # First generate clear speech with David
    temp_wav = TEST_AUDIO_DIR / "temp_david_speech.wav"
    ps_cmd = f"powershell -Command \"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft David Desktop'); $s.SetOutputToWaveFile('{temp_wav}'); $s.Speak('I am speaking very quietly in a distant room and the microphone can barely detect my voice.'); $s.Dispose();\""
    os.system(ps_cmd)

    sr, data = wavfile.read(str(temp_wav))
    # Attenuate amplitude by factor of 0.04 (-28 dB)
    low_vol = (data.astype(np.float32) * 0.035).astype(np.int16)
    wav_path = TEST_AUDIO_DIR / "case4_low_volume_speech_8s.wav"
    wavfile.write(str(wav_path), sr, low_vol)
    temp_wav.unlink(missing_ok=True)
    print(f"Case 4 created: {wav_path.name} ({wav_path.stat().st_size} bytes)")


def create_case_5_long_speech():
    """Case 5: 30-60 second speech (~40 seconds)."""
    text = (
        "Yesterday morning I went for a walk in the park near my house. "
        "The sun was shining brightly, and there were many people jogging and walking their dogs. "
        "I stopped by the small pond to watch the ducks swimming across the calm water. "
        "Afterwards, I visited the local bakery to buy fresh bread and warm coffee for breakfast. "
        "It was a peaceful and refreshing start to the day."
    )
    wav_path = TEST_AUDIO_DIR / "case5_long_speech_35s.wav"
    ps_cmd = f"powershell -Command \"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft David Desktop'); $s.Rate = -1; $s.SetOutputToWaveFile('{wav_path}'); $s.Speak('{text}'); $s.Dispose();\""
    os.system(ps_cmd)
    print(f"Case 5 created: {wav_path.name} ({wav_path.stat().st_size} bytes)")


def create_case_6_second_speaker():
    """Case 6: Second speaker (Female speaker - Microsoft Zira Desktop, ~15 seconds)."""
    text = (
        "In the kitchen, the young boy is standing on a wobbly stool trying to reach the cookie jar. "
        "His sister is standing beside him asking for a cookie. "
        "Meanwhile, water from the sink is overflowing onto the kitchen floor."
    )
    wav_path = TEST_AUDIO_DIR / "case6_second_speaker_zira_15s.wav"
    ps_cmd = f"powershell -Command \"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Zira Desktop'); $s.SetOutputToWaveFile('{wav_path}'); $s.Speak('{text}'); $s.Dispose();\""
    os.system(ps_cmd)
    print(f"Case 6 created: {wav_path.name} ({wav_path.stat().st_size} bytes)")


def create_case_7_hindi():
    """Case 7: Hindi speech (Google TTS, ~12 seconds)."""
    hindi_text = "नमस्ते। आज सुबह मैं बगीचे में घूमने गया था। वहाँ बहुत सारे सुंदर फूल खिले थे और ठंडी हवा चल रही थी। मुझे बहुत अच्छा लगा।"
    url = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + urllib.parse.quote(hindi_text) + "&tl=hi&client=tw-ob"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    audio_path = TEST_AUDIO_DIR / "case7_hindi_speech_12s.mp3"
    with urllib.request.urlopen(req) as resp, open(audio_path, "wb") as f:
        f.write(resp.read())
    print(f"Case 7 created: {audio_path.name} ({audio_path.stat().st_size} bytes)")


def create_case_8_bengali():
    """Case 8: Bengali speech (Google TTS, ~12 seconds)."""
    bengali_text = "নমস্কার। আজ সকালে আমি পার্কে হাঁটতে গিয়েছিলাম। সেখানে অনেক সুন্দর ফুল ফুটেছিল এবং মৃদু বাতাস বইছিল। আমার মন খুব ভালো হয়ে গেল।"
    url = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + urllib.parse.quote(bengali_text) + "&tl=bn&client=tw-ob"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    audio_path = TEST_AUDIO_DIR / "case8_bengali_speech_12s.mp3"
    with urllib.request.urlopen(req) as resp, open(audio_path, "wb") as f:
        f.write(resp.read())
    print(f"Case 8 created: {audio_path.name} ({audio_path.stat().st_size} bytes)")


if __name__ == "__main__":
    print("=" * 60)
    print("Generating 8 Real QA Audio Test Cases")
    print("=" * 60)
    create_case_1_normal()
    create_case_2_short()
    create_case_3_silence()
    create_case_4_low_volume()
    create_case_5_long_speech()
    create_case_6_second_speaker()
    create_case_7_hindi()
    create_case_8_bengali()
    print("=" * 60)
    print("All 8 test audio files prepared successfully.")
