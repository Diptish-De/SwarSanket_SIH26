# SwarSanket (स्वरसंकेत) — Engineering Guidelines

React 19 + Vite + Tailwind CSS v4 web application, FastAPI + PennyLane backend, and Flutter mobile application.

## Development Servers

- **Frontend**: Vite development server runs on `http://localhost:8443` (`npm run dev`).
- **Backend**: FastAPI server runs on `http://localhost:8001` (`python backend/main.py` or `npm run backend`).
- **Mobile**: Flutter app located in `mobile/`.

## Architecture & Code Rules

### Frontend & UI (React 19 + Vite + Tailwind v4)
- **Styling**: Tailwind CSS v4 through `@tailwindcss/vite` configured in `vite.config.ts`. Global theme is in `src/index.css`. No `tailwind.config.js` needed.
- **Patient vs Doctor Separation**:
  - The phone mockup is strictly a **patient wellness** application (Home, History, Profile).
  - Do NOT put doctor dashboards, EHR patient rosters, or clinical inspection tables inside the patient's phone frame view.
  - Doctor View is accessible only from the top desktop toolbar (`doctorDash` screen).
- **Strings**: Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- **Components**: Export components as default exports.

### Backend & Quantum ML (Python 3.11 + FastAPI + PennyLane)
- **Quantum Hybrid**: 8-qubit PennyLane VQC with `AngleEmbedding` (rotation="Y") and `BasicEntanglerLayers` — 3 layers x 8 qubits, weight tensor shape `(3, 8)` (`backend/model_loader.py`). It is NOT `StronglyEntanglingLayers`, which would require a `(3, 8, 3)` weight tensor and will fail to load the checkpoint.
- **Audio Decoding**: Use PyAV container decoding with explicit casting (see `backend/audio_analyzer.py` and `backend/speech_features.py`).
- **Speech-to-Text**: Faster-Whisper with CPU fallback (`backend/screening_engine.py`).

### Dependencies & Deployment
- **This project installs with pnpm.** Vercel builds from `pnpm-lock.yaml` with `--frozen-lockfile`, so the lockfile must always match `package.json`.
- **Adding a dependency**: run `pnpm add <pkg>` and commit the updated `pnpm-lock.yaml` alongside `package.json`. Running `npm install` instead updates nothing pnpm reads, the lockfile silently goes stale, and the next deploy fails with `ERR_PNPM_OUTDATED_LOCKFILE`.
- `package-lock.json` and `yarn.lock` are gitignored on purpose. A second lockfile is what caused that failure; do not commit one.
- `npm run build` / `npx tsc` still work locally against an existing `node_modules`. Only dependency *changes* must go through pnpm.

### Git & Commit Hygiene
- **No AI Co-Authorship Tags**: Never add `Co-Authored-By`, tool signatures, or synthetic contributor metadata to commit messages or PR descriptions. Commits must attribute team contributors only.

### Verification before Finishing
1. `npx tsc --noEmit` exits with code 0.
2. `npx oxfmt src` has formatted modified files.
3. `npm run build` succeeds cleanly.
