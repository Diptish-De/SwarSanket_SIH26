# SwarSanket Backend — Render Deployment Guide

FastAPI + Faster-Whisper + PennyLane Quantum-Classical Hybrid Screening Backend.

## Production Deployment to Render

### 1. Service Type
Deploy as a **Web Service** on Render using the included `Dockerfile`.

### 2. Build & Runtime Settings
- **Environment**: `Docker`
- **Dockerfile Path**: `./backend/Dockerfile` (or `./Dockerfile` if Root Directory is set to `backend`)
- **Docker Context**: `./backend` (or `.` if Root Directory is set to `backend`)
- **Instance Type**: **Free ($0 / month, 512 MB RAM)** supported via CPU-only PyTorch, single-worker Uvicorn, and thread/arena limits.

### 3. Low-Memory (512 MB Free Tier) Optimizations
The container is pre-configured with memory constraints to fit within Render's 512 MB cgroup:
- **CPU-Only PyTorch**: Installed via official PyTorch CPU wheel index, eliminating ~2.5 GB of CUDA packages and saving ~300 MB of startup RAM.
- **Thread & Arena Limits**: `OMP_NUM_THREADS=1`, `TORCH_NUM_THREADS=1`, and `MALLOC_ARENA_MAX=2` prevent glibc memory arena explosion and multi-threaded stack allocation on multi-core host nodes.
- **Single-Threaded Faster-Whisper**: `WhisperModel('tiny', compute_type='int8', cpu_threads=1, num_workers=1)`.
- **Pre-Cached ASR Model**: Downloaded into Docker image at build time to prevent cold-start download stalls.
- **Lazy Pipeline Loading**: Boot memory remains <50 MB; Uvicorn binds to `$PORT` in <200 ms for immediate health probe detection.

### 4. Environment Variables
Configure the following in the Render Dashboard:
- `PORT`: Automatically injected by Render (defaults to `8001` if unset).
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins, e.g.:
  ```text
  ALLOWED_ORIGINS=https://swar-sanket.vercel.app,http://localhost:8443
  ```
- `UPLOADS_DIR`: Ephemeral upload directory (defaults to `/tmp/swarsanket_uploads`).

### 5. Health Check
- **Health Check Path**: `/api/health`
- **Expected Response**: `200 OK` (`{"status": "ok", ...}`)

### 6. Local Docker Testing (Optional)
If Docker is installed locally:
```bash
docker build -t swarsanket-backend ./backend
docker run -p 8001:8001 -e PORT=8001 swarsanket-backend
```
