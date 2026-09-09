# SwarSanket Backend — Render Deployment Guide

FastAPI + Faster-Whisper + PennyLane Quantum-Classical Hybrid Screening Backend.

## Production Deployment to Render

### 1. Service Type
Deploy as a **Web Service** on Render using the included `Dockerfile`.

### 2. Build & Runtime Settings
- **Environment**: `Docker`
- **Dockerfile Path**: `./backend/Dockerfile` (or `./Dockerfile` if Root Directory is set to `backend`)
- **Docker Context**: `./backend` (or `.` if Root Directory is set to `backend`)
- **Instance Type**: Recommended `Standard` (min 2 GB RAM) for Faster-Whisper tiny + PyTorch + PennyLane ML inference.

### 3. Environment Variables
Configure the following in the Render Dashboard:
- `PORT`: Automatically injected by Render (defaults to `8001` if unset).
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins, e.g.:
  ```text
  ALLOWED_ORIGINS=https://swarsanket.vercel.app,http://localhost:8443
  ```
- `UPLOADS_DIR`: Ephemeral upload directory (defaults to `/tmp/swarsanket_uploads`).

### 4. Health Check
- **Health Check Path**: `/api/health`
- **Expected Response**: `200 OK` (`{"status": "ok", ...}`)

### 5. Local Docker Testing (Optional)
If Docker is installed locally:
```bash
docker build -t swarsanket-backend ./backend
docker run -p 8001:8001 -e PORT=8001 swarsanket-backend
```
