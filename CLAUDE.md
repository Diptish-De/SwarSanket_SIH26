# SwarSanket (स्वरसंकेत) — Claude Code Guidelines

## Overview
SwarSanket is an AI & Quantum-Hybrid acoustic screening platform for early Alzheimer's & MCI detection.
It consists of:
1. **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 web application (`src/`).
2. **Backend**: Python 3.11 + FastAPI + PennyLane Quantum VQC + Faster-Whisper pipeline (`backend/`).
3. **Mobile**: Flutter 3.24+ cross-platform application (`mobile/`).

---

## Development Commands

### Frontend (React + Vite)
- **Dev Server**: Vite is running on `http://localhost:8443` (`npm run dev`).
- **Type Check**: `npx tsc --noEmit`
- **Formatter**: `npx oxfmt src` (check with `npx oxfmt --check src`)
- **Production Build**: `npm run build`

### Backend (Python + FastAPI)
- **Server**: FastAPI runs on `http://localhost:8001` (`python backend/main.py` or `uvicorn backend.main:app --port 8001 --reload`).
- **Python venv**: `backend/.venv`
- **Type Check**: `npx pyright backend`
- **Integration Tests**: `python backend/test_api_analyze.py` and `python backend/run_qa_eval.py`

### Mobile (Flutter)
- **Analyze**: `flutter analyze` (inside `mobile/`)
- **Tests**: `flutter test` (inside `mobile/`)

---

## Architecture & Code Rules

### Frontend & UI
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. Global theme is in `src/index.css`. No `tailwind.config.js` needed.
- **Patient vs Doctor Separation**:
  - The phone mockup is strictly a **patient wellness** application (Home, History, Profile).
  - Do NOT put doctor dashboards, EHR patient rosters, or clinical inspection tables inside the patient's view.
  - Doctor View is accessible only from the top desktop toolbar (`doctorDash` screen).
- **Strings**: Use double quotes for strings containing apostrophes (`"We're here"`), or escape them in single quotes.
- **Components**: Export components as default exports.

### Backend & Quantum ML
- **Quantum Hybrid**: 8-qubit PennyLane VQC with Angle Embedding and Strong Entangling layers (`backend/model_loader.py`).
- **Audio Decoding**: Use PyAV container decoding with explicit casting (see `backend/audio_analyzer.py` and `backend/speech_features.py`).
- **Speech-to-Text**: Faster-Whisper with CPU fallback (`backend/screening_engine.py`).

### Verification before Finishing
Always ensure before concluding any task:
1. `npx tsc --noEmit` exits with code 0.
2. `npx oxfmt src` has formatted modified files.
3. `npm run build` succeeds cleanly.
