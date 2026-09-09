# SwarSanket FastAPI + Quantum-Classical Hybrid Screening Backend
# Target Platform: Render Web Service (Free Tier, 512 MB RAM Docker runtime)
FROM python:3.11-slim

# Prevent Python from writing .pyc files, enable unbuffered logging,
# and restrict thread/memory allocation for low-memory (512 MB) environments
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8001 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    VECLIB_MAXIMUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    TORCH_NUM_THREADS=1 \
    MALLOC_ARENA_MAX=2

# Install essential system runtime libraries:
# - ffmpeg & libsndfile1 for audio decoding (PyAV, soundfile, librosa)
# - curl for health probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install CPU-only PyTorch directly from official PyTorch CPU wheel repo.
# This prevents downloading ~2.5 GB of CUDA / NVIDIA GPU libraries and saves ~300 MB of startup RAM.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch==2.2.2+cpu --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download Faster-Whisper tiny model during image build so the container
# starts instantly without runtime network dependency or cold-start latency
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# Copy application source code and serialized model artifacts
COPY . .

# Expose default port (Render will override via $PORT at runtime)
EXPOSE 8001

# Launch FastAPI ASGI server with Uvicorn (single worker, binding to 0.0.0.0 and dynamic $PORT)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001} --workers 1"]
