# SwarSanket (स्वरसंकेत)
### AI & Quantum-Hybrid Acoustic Screening for Early Alzheimer's Detection

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Python: 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)
[![PennyLane: Quantum](https://img.shields.io/badge/PennyLane-Quantum_VQC-792ee5.svg)](https://pennylane.ai/)
[![React: 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite: 8](https://img.shields.io/badge/Vite-8.0-646cff.svg)](https://vitejs.dev/)
[![Flutter](https://img.shields.io/badge/Flutter-3.24+-02569B.svg)](https://flutter.dev/)
[![Tailwind CSS: v4](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)

**SwarSanket** is a privacy-first, multimodal cognitive screening platform designed for early detection and baseline monitoring of Mild Cognitive Impairment (MCI) and Alzheimer's Disease through non-invasive acoustic biomarkers and speech patterns. 

The system leverages an **8-Qubit Variational Quantum Circuit (VQC)** powered by PennyLane, integrated with **Faster-Whisper** acoustic transcription, real-time voice feature extraction, and an **offline-first PWA/mobile client** compliant with India's DPDP Act and ABHA standards.

---

## Key Features

- **Quantum-Hybrid ML Pipeline**: 8-qubit PennyLane VQC with Angle Embedding and Strong Entangling gates paired with classical dense layers for high-sensitivity cognitive risk classification.
- **Acoustic Biomarker Extraction**: Millisecond-level extraction of fundamental frequency ($F_0$), jitter (local/rap), shimmer (apq3/apq5), Harmonics-to-Noise Ratio (HNR), pause latency, speech tempo, and 13-band MFCCs using PyAV and Librosa.
- **Linguistic Hesitation Analysis**: Multilingual Whisper model processing speech across English, Hindi, Bengali, Tamil, Telugu, and Marathi for hesitation pauses, repetition loops, and semantic cohesion.
- **Patient-Centric Mobile Experience**: Large accessible typography, voice instructions with adjustable pacing (Relaxed 0.8x vs. Standard 1.0x), and live audio speaker testing.
- **Offline-First Architecture**: Zero network requirement during screening. Audio recordings and metrics are encrypted and stored locally in browser IndexedDB with automatic synchronization when connectivity is restored.
- **Family & Caregiver Circle**: Real-time risk alerts and companion updates for designated caregivers when cognitive hesitation markers exceed baseline thresholds.
- **Clinical Summary Export**: One-click generation of ABHA-ready clinical PDF reports summarizing acoustic stability, voice quality grades, and longitudinal trend lines.

---

## Repository Structure

```
SIH-26/
├── backend/                      # Python FastAPI & Quantum ML Engine
│   ├── main.py                   # FastAPI application & API endpoints
│   ├── model_loader.py           # Quantum Hybrid PyTorch + PennyLane model loader
│   ├── screening_engine.py       # Whisper speech-to-text & linguistic engine
│   ├── audio_analyzer.py         # PyAV audio container decoding & validation
│   ├── speech_features.py        # Acoustic feature extraction (jitter, shimmer, MFCCs)
│   ├── explainability.py         # Quantum feature attribution & salience maps
│   ├── models/                   # Serialized quantum weights (.pt) & scalers
│   └── requirements.txt          # Python dependencies
├── src/                          # React 19 + Vite 8 Web Application
│   ├── App.tsx                   # Main application shell & patient UI
│   ├── components/               # Reusable UI components & modals
│   ├── services/
│   │   ├── apiConfig.ts          # Backend API gateway & health check service
│   │   ├── audioRecorder.ts      # Web Audio API microphone & WAV encoder
│   │   ├── db.ts                 # IndexedDB offline database & sync queue
│   │   ├── report.ts             # Clinical PDF summary generator
│   │   └── tts.ts                # Multilingual speech synthesis
│   └── types/                    # TypeScript data models & contracts
├── mobile/                       # Flutter Cross-Platform Mobile Application
│   ├── lib/
│   │   ├── screens/              # Flutter screens (Home, Profile, Voice Check)
│   │   ├── services/             # Flutter audio & storage services
│   │   └── main.dart             # Flutter entrypoint
│   └── test/                     # Flutter widget & unit test suite
├── public/                       # Static public assets, logo, model visualizations
└── README.md
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Python**: v3.10 or v3.11
- **Git**
- *(Optional for mobile)*: **Flutter SDK** v3.24+

---

## 1. How to Start the Backend (FastAPI + Quantum ML)

The backend provides the API for audio feature extraction, Faster-Whisper transcription, and Quantum-Hybrid inference on `http://localhost:8001`.

### Step 1: Navigate to the repository root
```bash
cd SIH-26
```

### Step 2: Create and activate a Python virtual environment

**On Windows (PowerShell):**
```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

### Step 3: Install dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

> **Note**: For GPU acceleration (optional), ensure PyTorch with CUDA is installed. The backend automatically runs on CPU using optimized PennyLane `default.qubit` if CUDA is unavailable.

### Step 4: Run the Backend Server

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
```

*Or run the runner script directly:*
```bash
python backend/main.py
```

### Step 5: Verify Backend Health

Open your browser or run in a terminal:
```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{"status":"healthy","service":"SwarSanket Cognitive Screening Engine","model_loaded":true,"quantum_enabled":true}
```

Interactive Swagger API documentation is available at:
👉 **[http://localhost:8001/docs](http://localhost:8001/docs)**

---

## 2. How to Start the Frontend (React + Vite Web App)

The frontend provides the patient screening interface, real-time microphone recording, visual cognitive tasks, caregiver controls, and clinical dashboard.

### Step 1: Open a new terminal and navigate to the repository root
```bash
cd SIH-26
```

### Step 2: Install Node.js dependencies
```bash
npm install
```

### Step 3: Launch the Development Server
```bash
npm run dev
```

The Vite development server will start immediately at:
👉 **[http://localhost:8443](http://localhost:8443)** (or `http://localhost:5173`)

### Step 4: Build for Production (Optional)
To generate the optimized static build:
```bash
npm run build
```
The output bundle will be created inside the `dist/` directory.

---

## 3. How to Run the Mobile Application (Flutter)

If you wish to test the native mobile build for Android or iOS:

```bash
cd mobile
flutter pub get
flutter run
```

To run mobile automated tests:
```bash
flutter test
```

---

## Verification & Testing Suite

You can verify all platform layers using the following commands:

### Backend Tests
```bash
# Integration test against /api/health and /api/analyze-audio
python backend/test_api_analyze.py

# Model inference & evaluation verification
python backend/run_qa_eval.py

# Static type check
npx pyright backend
```

### Frontend Checks
```bash
# TypeScript type checking
npx tsc --noEmit

# Code formatting
npx oxfmt --check src
```

---

## Technical Specifications

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Acoustic Frontend** | PyAV, Librosa, NumPy | 16kHz audio container parsing, $F_0$, Jitter, Shimmer, HNR, MFCC extraction |
| **Speech-to-Text** | Faster-Whisper (CTranslate2) | Zero-latency multilingual transcription & acoustic pause calculation |
| **Quantum Neural Network** | PennyLane + PyTorch | 8-Qubit VQC with parameter shift differentiation & angle state embedding |
| **Web Client** | React 19, TypeScript, Tailwind CSS v4 | Responsive mobile-frame UI, Web Audio API recorder, Recharts graphs |
| **Offline Storage** | IndexedDB (Native Web API) | Encrypted client-side storage for sessions, waveforms, and offline sync |
| **Mobile Client** | Flutter 3.24, Dart | Cross-platform native application for Android and iOS |

---

## Data Privacy & Clinical Disclaimer

- **Privacy by Design**: SwarSanket does not transmit unencrypted raw audio to external third-party cloud servers. Inference is performed directly within the secure backend, and audio can be stored exclusively on the user's local device.
- **Investigational Screening Tool**: SwarSanket is designed as an early non-invasive cognitive risk indicator and assistive screening platform. It does not provide definitive medical diagnoses. Users exhibiting elevated risk metrics are advised to consult a qualified neurologist or geriatric clinician.
