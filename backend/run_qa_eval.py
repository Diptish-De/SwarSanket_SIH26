"""
SwarSanket Step 99: Real-World End-to-End QA Runner
===================================================
Tests all 8 test cases against the /api/analyze-audio endpoint.
Records comprehensive metrics without modifying any model or ML artifacts.
"""

import sys
import io
import json
from pathlib import Path
from datetime import datetime

# Set up paths
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TEST_AUDIO_DIR = BACKEND_DIR / "test_audio"

test_cases = [
    {
        "id": 1,
        "name": "Normal 10–20 second speech",
        "filename": "case1_normal_speech_12s.webm",
        "mime_type": "audio/webm",
        "description": "Real 12.66s WebM user recording from prototype voice check",
    },
    {
        "id": 2,
        "name": "Very short speech (~1–2s)",
        "filename": "case2_short_1s.wav",
        "mime_type": "audio/wav",
        "description": "Brief speech utterance ('Yes, ready.') ~1.5s",
    },
    {
        "id": 3,
        "name": "Silence (no speech)",
        "filename": "case3_silence_6s.wav",
        "mime_type": "audio/wav",
        "description": "6 seconds of ambient background silence (RMS < 0.0001)",
    },
    {
        "id": 4,
        "name": "Poor / low-volume speech",
        "filename": "case4_low_volume_speech_8s.wav",
        "mime_type": "audio/wav",
        "description": "Speech attenuated by 28 dB (whisper/distant microphone)",
    },
    {
        "id": 5,
        "name": "30–60 second speech",
        "filename": "case5_long_speech_35s.wav",
        "mime_type": "audio/wav",
        "description": "Sustained narrative speech (~35 seconds, 65 words)",
    },
    {
        "id": 6,
        "name": "Second speaker (female voice)",
        "filename": "case6_second_speaker_zira_15s.wav",
        "mime_type": "audio/wav",
        "description": "Female voice (Microsoft Zira) describing cookie theft scene (~15s)",
    },
    {
        "id": 7,
        "name": "Hindi speech",
        "filename": "case7_hindi_speech_12s.mp3",
        "mime_type": "audio/mp3",
        "description": "Hindi natural speech utterance (~12s)",
    },
    {
        "id": 8,
        "name": "Bengali speech",
        "filename": "case8_bengali_speech_12s.mp3",
        "mime_type": "audio/mp3",
        "description": "Bengali natural speech utterance (~12s)",
    },
]


def run_qa_suite():
    results = []

    print("=" * 90)
    print("SwarSanket Step 99: Real-World End-to-End QA Test Suite")
    print(f"Timestamp: {datetime.utcnow().isoformat()}Z")
    print("=" * 90)

    for tc in test_cases:
        filepath = TEST_AUDIO_DIR / tc["filename"]
        print(f"\n--- [Test {tc['id']}/8] {tc['name']} ---")
        print(f"  File: {tc['filename']} ({filepath.stat().st_size} bytes)")
        print(f"  Description: {tc['description']}")

        with open(filepath, "rb") as f:
            file_bytes = f.read()

        http_status = None
        response_json = {}
        error_detail = None

        try:
            res = client.post(
                "/api/analyze-audio",
                files={"audio": (tc["filename"], io.BytesIO(file_bytes), tc["mime_type"])},
            )
            http_status = res.status_code
            try:
                response_json = res.json()
            except Exception:
                response_json = {"raw_text": res.text}
        except Exception as ex:
            error_detail = str(ex)

        print(f"  HTTP Status:       {http_status}")

        if http_status == 200:
            success = response_json.get("success", False)
            transcript = response_json.get("transcript", "")
            detected_lang = response_json.get("detected_language", "unknown")
            word_count = response_json.get("word_count", 0)
            duration = response_json.get("audio", {}).get("duration_seconds", 0.0)
            rms = response_json.get("audio", {}).get("rms_energy", 0.0)
            live_count = response_json.get("imputation", {}).get("live_feature_count", 0)
            imputed_count = response_json.get("imputation", {}).get("imputed_feature_count", 0)
            
            screening = response_json.get("screening", {})
            pred_class = screening.get("predicted_class")
            prob = screening.get("probability")
            prob_pct = screening.get("probability_percent")
            conf_pct = screening.get("technical_confidence_percent")
            status_text = screening.get("status")
            interpretation = screening.get("interpretation")

            explanation = response_json.get("explanation", {})
            has_shap = "shap_contributions" in explanation
            top_pos = [f"{x['feature']} (+{x['shap_value']:.3f})" for x in explanation.get("top_positive_contributions", [])[:2]]
            top_neg = [f"{x['feature']} ({x['shap_value']:.3f})" for x in explanation.get("top_negative_contributions", [])[:2]]

            asr_success = bool(transcript.strip())

            print(f"  ASR Succeeded:     {asr_success} (detected language: {detected_lang})")
            print(f"  Transcript:        \"{transcript[:80]}{'...' if len(transcript) > 80 else ''}\"")
            print(f"  Audio Duration:    {duration:.2f}s (RMS: {rms:.5f})")
            print(f"  Feature Counts:    {live_count} live / {imputed_count} median-imputed")
            print(f"  Screening Output:  Class {pred_class} | Prob: {prob_pct}% | Confidence: {conf_pct}% | Status: \"{status_text}\"")
            print(f"  Interpretation:    \"{interpretation}\"")
            print(f"  SHAP Available:    {has_shap} (Top+: {top_pos} | Top-: {top_neg})")

            # Determine React frontend behavior
            if pred_class == 1:
                frontend_screen = "resultElevated ('Evaluation Recommended')"
            else:
                frontend_screen = "resultLow ('Voice Check Complete')"

            results.append({
                "id": tc["id"],
                "name": tc["name"],
                "filename": tc["filename"],
                "http_status": http_status,
                "asr_success": asr_success,
                "detected_language": detected_lang,
                "transcript": transcript,
                "audio_duration": duration,
                "word_count": word_count,
                "live_feature_count": live_count,
                "imputed_feature_count": imputed_count,
                "screening_response": {
                    "predicted_class": pred_class,
                    "probability": prob,
                    "probability_percent": prob_pct,
                    "technical_confidence_percent": conf_pct,
                    "status": status_text,
                    "interpretation": interpretation,
                },
                "shap_response": {
                    "available": has_shap,
                    "top_positive": top_pos,
                    "top_negative": top_neg,
                    "disclaimer": explanation.get("disclaimer"),
                },
                "frontend_behavior": frontend_screen,
                "errors": None,
                "full_payload": response_json,
            })
        else:
            detail = response_json.get("detail", response_json.get("raw_text", str(error_detail)))
            print(f"  ASR Succeeded:     False")
            print(f"  HTTP Error Detail: {detail}")
            print(f"  Frontend Behavior: Graceful error banner: \"{detail}\" (stays on voice check, no crash)")
            results.append({
                "id": tc["id"],
                "name": tc["name"],
                "filename": tc["filename"],
                "http_status": http_status,
                "asr_success": False,
                "detected_language": "N/A",
                "transcript": "",
                "audio_duration": 0.0,
                "word_count": 0,
                "live_feature_count": 0,
                "imputed_feature_count": 0,
                "screening_response": None,
                "shap_response": None,
                "frontend_behavior": f"Error toast displayed: '{detail}'",
                "errors": detail,
                "full_payload": response_json,
            })

    output_path = BACKEND_DIR / "qa_step99_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 90)
    print(f"QA test suite completed. Full results saved to: {output_path}")
    print("=" * 90)
    return results


if __name__ == "__main__":
    run_qa_suite()
