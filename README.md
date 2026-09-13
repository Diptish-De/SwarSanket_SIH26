# SwarSanket (स्वरसंकेत)

> **Non-Invasive Cognitive Impairment & Alzheimer's-Related Voice Screening Platform**  
> Powered by Faster-Whisper ASR, 22 Clinical Speech Biomarkers, and an 8-Qubit Quantum-Classical Variational Neural Network.

---

## 🚀 Live Demo

👉 **[Open SwarSanket Web App](https://swar-sanket.vercel.app)**

### Backend

The SwarSanket backend is deployed on Render and provides the voice-analysis API used by the web application.

- Backend API: https://sih-26-swarsanket-backend.onrender.com
- Health Check: https://sih-26-swarsanket-backend.onrender.com/api/health

---

## ⚠️ Important Medical Disclaimer

> **SCREENING SYSTEM ONLY — NOT A DIAGNOSTIC INSTRUMENT**  
> SwarSanket is an investigational, non-invasive digital screening tool designed for early cognitive impairment screening and Alzheimer's-related risk signal detection.  
> - It **does NOT** provide a medical diagnosis of Alzheimer's disease, dementia, or any other neurological condition.  
> - Outputs are expressed strictly as a **"lower screening signal"** or an **"elevated screening signal"**, accompanied by calibrated uncertainty metrics and relative biomarker attributions.  
> - Any individual exhibiting an elevated screening signal should seek formal comprehensive evaluation from a certified neurologist, geriatrician, or licensed healthcare professional.

---

## Overview

Cognitive decline associated with Alzheimer's disease frequently manifests in subtle speech, acoustic, and linguistic alterations years prior to noticeable clinical presentation. Conventional neuropsychological assessments (e.g., MMSE, MoCA) require clinical administration, are time-intensive, and often face accessibility barriers.

**SwarSanket** provides an accessible, non-invasive voice screening system accessible across web and mobile platforms. Users describe a standardized scene (such as the Cookie Theft picture task) for 10–15 seconds. The platform analyzes acoustic stability, acoustic hesitations, linguistic density, and structural language patterns through a hybrid classical-quantum machine learning pipeline to compute calibrated screening indicators.

---

## Architecture Flow

```
                  +-----------------------------------+
                  |       Voice Audio Recording       |
                  |     (10–15s Scene Description)    |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Flutter Mobile App   |                       |   React 19 Web App    |
|   (Android / iOS)     |                       |   (Vite + Tailwind)   |
+-----------+-----------+                       +-----------+-----------+
            |                                               |
            |     Multipart HTTP POST /api/analyze-audio    |
            +-----------------------+-----------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      FastAPI Screening Server     |
                  |     (Uvicorn ASGI on port 8001)   |
                  +-----------------+-----------------+
                                    |
                  +-----------------+-----------------+
                  |       PyAV Container Decoder      |
                  |   Validates & normalizes to 16kHz |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|   Faster-Whisper ASR  |                       |  Librosa / Scipy /    |
|   Speech-to-Text &    |                       |  Parselmouth Acoustics|
|  Timeline Segmentation|                       |  Pitch, Jitter, Energy|
+-----------+-----------+                       +-----------+-----------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      spaCy Linguistic Parser      |
                  |   Part-of-Speech, Syntactic &     |
                  |    Information Unit (IU) Density  |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |    22 Clinical Feature Vector     |
                  |  Median Imputer + Robust Scaler   |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |    Quantum-Classical Classifier   |
                  |  PyTorch Linear Projection (22->8)|
                  |        + PennyLane 8-Qubit VQC    |
                  |  AngleEmbedding + StronglyEntangle|
                  |   + Output Linear Classification  |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
| Epistemic Uncertainty |                       | Explainability Engine |
|   Monte Carlo Dropout |                       | VQC Gradient Salience |
|  (30 Stochastic Passes|                       | Normalized Relative % |
|   Mean, StdDev, 95% CI|                       | Top Risk Contributors |
+-----------+-----------+                       +-----------+-----------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      Screening Result Payload     |
                  | Class, Probability, Confidence,   |
                  | Transcript, Audio Metrics, SHAP   |
                  +-----------------------------------+
```

---

## 📱 Mobile App Preview

SwarSanket includes a Flutter-based mobile experience for guided voice-based cognitive impairment screening. The mobile application provides an accessible interface with multilingual audio prompts, seamless microphone capture, and physician-oriented screening signal monitoring.

| Language Selection | Voice Screening Home | Doctor Clinical Hub |
|---|---|---|
| ![Language Selection](docs/screenshots/language-selection.png) | ![Voice Screening Home](docs/screenshots/homepage.png.jpeg) | ![Doctor Clinical Hub](docs/screenshots/doctor-clinical-hub.png) |

### Language Selection
Multilingual screening-language selection and onboarding experience.

### Voice Screening Home
Patient-facing home screen for starting a voice screening and accessing screening-related information.

### Doctor Clinical Hub
Clinician-facing overview of recent patient screening results and screening signals.

---

## Key Features

### 1. Robust Speech & Linguistic Feature Extraction
- **Faster-Whisper ASR**: Accurate speech-to-text with word-level timestamps and acoustic pause identification.
- **Multilingual Support**: Supports English, Hindi, Bengali, Tamil, Telugu, and Marathi speech patterns.
- **Acoustic Profiling**: Fundamental frequency variation ($F_0$ SD), RMS energy, hesitation ratios, phonation pause intervals (DPI, RST, EST).
- **Linguistic & Cognitive Metrics**: Part-of-speech ratios (verb count, noun ratio, pronoun proportion, noun-to-verb ratio), phrase length distributions, unique Information Unit (IU) count, IU density, and semantic communication efficiency.

### 2. Quantum-Classical Variational Architecture
- **8-Qubit Variational Quantum Circuit (VQC)** built with **PennyLane** and **PyTorch**.
- **Angle Embedding**: Features are mapped into quantum states using rotational gates ($R_y$).
- **Strongly Entangling Layers**: Quantum entangling operations capture complex multi-feature interactions across acoustic and linguistic dimensions.
- **Hybrid Integration**: Classical pre-processing and post-quantum dense layers with batch normalization and dropout.

### 3. Epistemic Uncertainty Estimation
- Utilizes **Monte Carlo (MC) Dropout** with 30 stochastic forward passes during inference.
- Computes mean probability, standard deviation (epistemic uncertainty), and a 95% confidence interval ($[\mu - 1.96\sigma, \mu + 1.96\sigma]$).
- Prevents overconfident predictions on noisy, short, or ambiguous audio samples.

### 4. Normalized Quantum Gradient Explainability
- Evaluates parameter-shift gradients through the 8-qubit quantum circuit to quantify feature sensitivity.
- Normalizes raw attributions into proportional impact percentages (`impact_percent`, `formatted_impact`).
- Distinguishes factors pushing toward an elevated screening signal versus those reinforcing normal baseline stability.

### 5. Multi-Platform Clients
- **Flutter Native Mobile App** (Android): Real-time microphone capture, local audio caching, dynamic LAN IP server selection, and clear clinical summaries.
- **React 19 Web App**: Responsive web interface with visual tasks, live waveform rendering, caregiver circle configuration, and printable ABHA-ready clinical summary exports.

---

## The 22 Selected Biomarkers

The screening model evaluates 22 clinical speech and language biomarkers:

| Feature Name | Category | Clinical Rationale |
|---|---|---|
| `CTP_F0 SD(st)` | Acoustic | Fundamental frequency standard deviation (pitch variability / monotone detection) |
| `CTP_DPI(ms)` | Acoustic | Duration of Phonation Intervals (prosodic fluency and articulation pause lengths) |
| `CTP_RST(-/s)` | Acoustic | Running Speech Tempo (speed of continuous phonated segments) |
| `CTP_EST` | Acoustic | Phonation pause ratio across running utterances |
| `CTP_Voiced Rate(1/s)` | Acoustic | Rate of voiced vocal cord vibrations per second |
| `CTP_Hesitation Ratio` | Acoustic | Proportion of speech occupied by acoustic hesitations and silent blocks |
| `CTP_Energy Mean(Pa^2·s)` | Acoustic | Vocal intensity and acoustic energy consistency |
| `CTP_verb_num` | Linguistic | Raw verb count in narrative speech |
| `CTP_noun_ratio` | Linguistic | Proportion of total vocabulary consisting of nouns |
| `CTP_Pronouns_ratio` | Linguistic | Proportion of pronouns (often increases with noun-retrieval difficulty) |
| `CTP_noun to verb` | Linguistic | Ratio of nouns to verbs indicating lexical diversity |
| `CTP_Word Rate(-/s)` | Linguistic | Overall articulation rate (words per second) |
| `CTP_Noun No Phrase Rate` | Syntactic | Rate of isolated or unembellished noun phrases |
| `CTP_Verb phrase type proportion`| Syntactic | Structural complexity of verb phrases |
| `CTP_Prep phrase type proportion`| Syntactic | Usage frequency of prepositional phrases |
| `CTP_Prep average phrase type length 1` | Syntactic | Average depth and length of prepositional structures |
| `CTP_num_unique_IU` | Cognitive | Number of distinct Information Units mentioned from the stimulus scene |
| `CTP_num_unique_keywords` | Cognitive | Number of unique topical semantic keywords |
| `CTP_unique_IU_densitys` | Cognitive | Ratio of unique Information Units relative to total word count |
| `CTP_total_IU_density` | Cognitive | Overall semantic density across the response |
| `CTP_keyword_to_non_keyword_ratio` | Cognitive | Proportion of thematic keywords versus conversational filler |
| `CTP_unique_IU_efficiency` | Cognitive | Rate of information unit transmission per minute of speech |

---

## Repository Structure

```
SIH-26/
├── backend/                            # FastAPI Screening Service & Quantum ML Engine
│   ├── main.py                         # Application entrypoint & HTTP endpoints
│   ├── screening_engine.py             # Feature orchestration & classification pipeline
│   ├── audio_analyzer.py               # Audio container parsing, normalization & validation
│   ├── speech_features.py              # 22-biomarker acoustic & linguistic extractors
│   ├── model_loader.py                 # PyTorch + PennyLane Quantum Hybrid model loader
│   ├── explainability.py               # VQC gradient sensitivity & attribution calculations
│   ├── requirements.txt                # Python backend dependencies
│   ├── test_api_analyze.py             # Integration test suite for backend API
│   ├── test_live_server.py             # Live endpoint health and payload tests
│   ├── models/                         # Serialized weights and preprocessors
│   │   ├── swarsanket_quantum_hybrid_model.pt   # PyTorch/PennyLane trained weights
│   │   ├── swarsanket_qh_scaler.pkl             # RobustScaler artifact
│   │   ├── swarsanket_qh_imputer.pkl            # Median imputer artifact
│   │   ├── swarsanket_qh_selected_features.json # Feature manifest
│   │   └── swarsanket_qh_model_config.json      # Quantum circuit configuration
│   └── test_audio/                     # Sample audio fixtures for automated tests
│
├── mobile/                             # Flutter Mobile Application
│   ├── lib/
│   │   ├── main.dart                   # Application entrypoint & router
│   │   ├── screens/                    # Voice check, recording, and results screens
│   │   ├── models/                     # Strongly typed screening API models
│   │   └── services/                   # ApiService (multipart HTTP, dynamic server IP)
│   ├── android/                        # Android project configuration (permissions, cleartext)
│   ├── pubspec.yaml                    # Flutter package dependencies
│   └── test/                           # Flutter unit and widget tests
│
├── src/                                # React Web Application
│   ├── App.tsx                         # Main single-page application shell
│   ├── components/                     # UI components, modals, and APK download handler
│   ├── services/                       # API gateway, Web Audio recorder, IndexedDB, TTS
│   └── types/                          # TypeScript definitions and API contracts
│
├── public/                             # Public static assets and downloaded APK bundle
├── package.json                        # Frontend web package configuration
├── vite.config.ts                      # Vite build and dev server configuration
└── README.md                           # Project documentation
```

---

## Prerequisites

| Requirement | Recommended Version | Purpose |
|---|---|---|
| **Python** | 3.11.x | Backend engine, PyTorch, PennyLane, Faster-Whisper |
| **Node.js** | 20.x or 22.x LTS | React frontend development and build tooling |
| **npm** / **pnpm** | Modern | Web dependency management |
| **Java / OpenJDK** | OpenJDK 21 | Android Gradle build toolchain (for mobile builds) |
| **Android SDK** | API 34, 35, or 36 | Android compilation and platform tools (`adb`) |
| **Flutter SDK** | 3.24.x – 3.47.x | Flutter mobile compilation |

---

## Installation & Setup

### 1. Backend Setup (FastAPI + Quantum ML)

```bash
# Navigate to the repository root
cd SIH-26

# Create a virtual environment with Python 3.11
python3.11 -m venv backend/.venv

# Activate the virtual environment
# On macOS / Linux:
source backend/.venv/bin/activate
# On Windows:
# .\backend\.venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# Download the spaCy English language model
python -m spacy download en_core_web_sm
```

#### Run the Backend Server
```bash
# Start the server with live reload on port 8001
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
```

*Or directly using python:*
```bash
python backend/main.py
```

#### Verify Backend Status
```bash
curl http://localhost:8001/api/health
```

Expected output:
```json
{
  "status": "ok",
  "service": "SwarSanket Voice Biomarker Backend",
  "timestamp": "2026-09-09T14:19:46.686479+00:00",
  "model": "PyTorch + PennyLane 8-Qubit Quantum-Classical Hybrid (22 Features, MC Dropout)",
  "pipeline": "Faster-Whisper ASR + spaCy NLP + Quantum Variational Classifier"
}
```

Interactive OpenAPI Swagger documentation is available at:  
👉 **[http://localhost:8001/docs](http://localhost:8001/docs)**

---

### 2. Frontend Setup (React 19 Web App)

```bash
# From repository root, install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The web interface will be accessible at:  
👉 **[http://localhost:8443](http://localhost:8443)** (or `http://localhost:5173`)

To compile the production distribution bundle:
```bash
npm run build
```

---

### 3. Mobile Setup (Flutter Android App)

```bash
# Navigate to the mobile directory
cd mobile

# Fetch Flutter dependencies
flutter pub get

# Run static analysis
flutter analyze

# Execute unit tests
flutter test
```

#### Running on a Device or Emulator
```bash
flutter run
```

#### Building a Release APK
```bash
flutter build apk --release --android-skip-build-dependency-validation
```

The signed release APK will be generated at:  
`mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## API Reference

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Returns backend availability, active model type, and pipeline components.
- **Response**: `200 OK`

### 2. Audio Screening Analysis
- **Endpoint**: `POST /api/analyze-audio`
- **Content-Type**: `multipart/form-data`
- **Field**: `audio` (Upload binary: `.wav`, `.m4a`, `.webm`, `.mp3`)
- **Timeout**: Up to 60 seconds (allows full Whisper transcription and 30-pass MC Dropout inference)

#### Example Request:
```bash
curl -X POST http://localhost:8001/api/analyze-audio \
  -F "audio=@backend/test_audio/case6_second_speaker_zira_15s.wav"
```

#### Response Structure:
```json
{
  "success": true,
  "transcript": "In the kitchen, the young boy is standing on a wobbly stool...",
  "detected_language": "en",
  "word_count": 39,
  "audio": {
    "duration_seconds": 14.07,
    "sample_rate": 22050,
    "rms_energy": 0.0948,
    "silence_percentage": 40.47
  },
  "live_features": {
    "CTP_F0 SD(st)": 5.554,
    "CTP_DPI(ms)": 665.0,
    "CTP_Hesitation Ratio": 0.189,
    "CTP_total_IU_density": 0.5128
  },
  "screening": {
    "predicted_class": 1,
    "status": "elevated screening signal",
    "probability": 0.884,
    "uncertainty_std": 0.028,
    "confidence_interval_95": [0.829, 0.939],
    "technical_confidence": 94.4
  },
  "explanation": {
    "method": "PennyLane 8-Qubit Variational Quantum Circuit Gradient Sensitivity",
    "top_positive_contributions": [
      {
        "feature": "CTP_Hesitation Ratio",
        "value": 0.189,
        "impact_percent": 18.3,
        "formatted_impact": "+18.3%",
        "description": "Proportion of recording duration occupied by acoustic hesitation and pauses"
      }
    ],
    "top_negative_contributions": []
  },
  "disclaimer": "This result is for research screening purposes only and does not constitute a formal clinical diagnosis."
}
```

---

## Automated Verification Suite

Run full-stack validation across all layers:

```bash
# 1. Backend Unit & API Integration Tests
python backend/test_api_analyze.py
python backend/test_live_server.py

# 2. Frontend Web Build & Typecheck
npm run build

# 3. Flutter Mobile Unit Tests
cd mobile && flutter test
```

---

## Network Configuration for Physical Devices

When testing on physical mobile phones over local Wi-Fi:
1. Ensure the Mac/host and the phone are connected to the **same Wi-Fi network**.
2. Find your host LAN IP (e.g. `10.214.104.72`):
   ```bash
   ipconfig getifaddr en0
   ```
3. The Flutter application includes an in-app **"Change Server IP"** dialog allowing you to configure `http://<YOUR_LAN_IP>:8001` dynamically.
4. Android network security configuration in `mobile/android/app/src/main/AndroidManifest.xml` permits cleartext HTTP for local IP testing (`android:usesCleartextTraffic="true"`).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
