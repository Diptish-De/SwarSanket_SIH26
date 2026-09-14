# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` holds the team's engineering rules (Tailwind v4 setup, patient/doctor separation, pnpm lockfile discipline, commit hygiene). Read it too — this file covers architecture and commands, not those rules.

## What this is

**SwarSanket** — a voice-based cognitive-impairment *screening* platform (explicitly not diagnostic). A user describes a scene for 10–15 s; the backend transcribes it, extracts 22 clinical speech/language biomarkers, and classifies with a PyTorch + PennyLane 8-qubit quantum-classical hybrid model with MC-Dropout uncertainty.

Three clients + one backend, all in one repo:

| Path | What | Notes |
|---|---|---|
| `src/` | React 19 + Vite + Tailwind v4 web app | the primary client |
| `backend/` | FastAPI screening service + quantum ML | deployed on Render (free tier, 512 MB) |
| `android/` | **Capacitor** wrapper around the built `dist/` | this is what the CI APK workflow ships |
| `mobile/` | **Flutter** app (separate, native) | `mobile/android/` is its own Android project |

`android/` and `mobile/android/` are unrelated Android projects. `android/` wraps the React bundle; `mobile/android/` belongs to the Flutter app.

## Commands

Frontend (pnpm is the package manager; `npm run` for scripts is fine, but **dependency changes must go through `pnpm add`** — see AGENTS.md):

```bash
pnpm install
npm run dev              # Vite on http://localhost:8443 (host 0.0.0.0)
npm run build            # vite build -> dist/
npx tsc --noEmit         # typecheck — must exit 0 before finishing
npx oxfmt src            # format (oxfmt, no config file; `npm run format` also works)
```

Backend (a Windows venv lives at `backend/.venv`):

```bash
npm run backend                                      # backend\.venv\Scripts\python.exe backend/main.py
backend/.venv/Scripts/python.exe backend/main.py     # equivalent, port 8001
```

Backend modules import each other flat (`from supabase_service import ...`), so uvicorn must be run **from inside `backend/`** as `uvicorn main:app` — `uvicorn backend.main:app` from the repo root fails (the README's snippet is wrong on this point). The Dockerfile does `WORKDIR /app` + `uvicorn main:app`.

Backend tests are **standalone scripts, not pytest**. Each inserts its own directory on `sys.path` and exits non-zero on the first failed check. Run one at a time:

```bash
backend/.venv/Scripts/python.exe backend/test_task_scoring.py
backend/.venv/Scripts/python.exe backend/test_screening_engine.py
backend/.venv/Scripts/python.exe backend/test_api_analyze.py     # in-process, FastAPI TestClient
backend/.venv/Scripts/python.exe backend/test_live_server.py     # needs a server on :8001
```

Frontend tests: only `src/services/dailyCheckIn.test.ts` exists, and there is no test runner wired into `package.json`. Its header documents how to run it (bundle the pure functions with Vite, then execute with node).

Mobile (Flutter): `cd mobile && flutter pub get && flutter analyze && flutter test`.

APK: built by `.github/workflows/build-apk.yml` only on a `v*` tag or manual dispatch — deliberately *not* on every push to main (runner-minute and Vercel-slot quota). It builds the **Capacitor** APK from `android/`, not the Flutter one.

## Architecture

### Screening is a job, not a request

The central design decision. Render's free tier caps a request at ~100 s, and Whisper on a 60 s clip exceeds that, so the synchronous path used to 502 mid-transcription.

- `POST /api/screenings` → `202` with a `recording_id`. Only the upload is synchronous.
- `backend/screening_jobs.py` runs **one** background worker (a tenth of a CPU, 512 MB — two concurrent transcriptions are slower than two sequential ones). Queue position is reported honestly.
- Each stage is written to `public.recordings.processing_status`: `queued → uploading → transcribing → extracting → scoring → completed | failed`. **These exact strings are a contract** — `src/services/screeningJob.ts` switches on them.
- The client follows the row two ways at once and takes whichever terminal state lands first: a Supabase Realtime subscription to `UPDATE`s on that one row, and HTTP polling of `GET /api/screenings/{id}`. Realtime needs `SUPABASE_ANON_KEY` on the backend; without it the response omits the `realtime` block and the client polls.
- `POST /api/analyze-audio` is the old synchronous path. Kept for tests and short clips only; don't route the app through it.

### Backend pipeline

`main.py` (HTTP only) → `screening_jobs.py` (worker/queue) → `screening_engine.py` (orchestration) → `audio_analyzer.py` (PyAV decode/normalize) + `speech_features.py` (22 biomarkers via librosa/parselmouth/spaCy) → `model_loader.py` (inference) → `explainability.py` (VQC gradient attributions).

Everything heavy is **lazy-loaded** (Whisper is a module global initialized on first use) so boot memory stays under ~50 MB and the health probe answers immediately.

The quantum circuit is `AngleEmbedding(rotation="Y")` + **`BasicEntanglerLayers`**, 3 layers × 8 qubits, weight tensor `(3, 8)`. The README prose says "StronglyEntanglingLayers" and is wrong — that would need `(3, 8, 3)` and will fail to load the checkpoint. Trust `backend/model_loader.py`.

`backend/task_scoring.py` holds a separate standardized battery (`fluency`, `recall`, `phonation`, `daily`) scored against published reference ranges. These results sit **beside** the model's probability and are never blended into it. `daily` is deliberately never flagged — no population cut-off exists for an automated detail count, so `src/services/dailyCheckIn.ts` compares a person only against their own earlier check-ins (median of first five scored days, ±1.5 MAD).

### Frontend

`src/App.tsx` is ~10k lines and holds the entire screening flow: design tokens (`C`, `F`), the 9-language translation table and `t()`, every screen component, and `SwarSanketApp` — one big state machine keyed on the `Screen` union in `src/types/index.ts`. The default export is a thin auth gate that renders `AloisAuthContainer` or `SwarSanketApp`. Expect to work inside this file rather than around it.

`src/components/alois/` is the patient-facing shell (5 tabs, daily care, check-in, appointments) orchestrated by `AloisContainer`. Per AGENTS.md, doctor/clinical views never go inside the phone frame — `doctorDash` is reached from the desktop toolbar.

`src/services/` is where the non-UI logic lives:
- `apiConfig.ts` — resolves the backend URL (`VITE_API_BASE_URL` → prod Render URL / `10.0.2.2` on Capacitor Android / localhost), persisted to localStorage so testers can repoint the app at runtime.
- `screeningJob.ts` — the dual-transport job client described above.
- `db.ts` — IndexedDB (`idb`): screenings, audio blobs, a sync queue, doctor notes. The app is offline-capable and syncs later.
- `supabase.ts` — browser Supabase client, auth, profile persistence.
- `dailyCheckIn.ts` — the daily check-in store (IndexedDB v3), the MMSE/MoCA orientation items, the AD8-derived informant rotation, and the within-person trend maths.

There used to be a `demoOverride.ts` that forced a low/elevated outcome from the two halves of the Start button. It was removed: results shown in the app are now always the model's own. Do not reintroduce a path that rewrites a screening result.

Formatting note: oxfmt in this repo emits a blank line between nearly every declaration, interface member and object property. That is the committed style — don't "fix" it by hand.

### Deployment

- Web → Vercel. `vercel.json` rewrites `/api/*` to the Render backend, so the browser never sees cross-origin calls in production. Vercel auto-deploy is **disabled for the `DiPS` branch**.
- Backend → Render Docker web service from `backend/Dockerfile` (CPU-only torch, `OMP_NUM_THREADS=1`, `MALLOC_ARENA_MAX=2`, Whisper `tiny`/`int8` pre-baked into the image). Health check `/api/health`.
- Supabase holds `recordings`, `screenings`, `patient_profiles` (`backend/database/supabase_schema.sql`); `recordings` is in the `supabase_realtime` publication.

`.figma/make/` contains the Figma Make harness scripts (install/dev/format/deploy) and `vite.config.ts` carries four Figma-specific plugins. Leave both alone unless the task is about them.

## Before finishing

1. `npx tsc --noEmit` exits 0.
2. `npx oxfmt src` run over modified files.
3. `npm run build` succeeds.
