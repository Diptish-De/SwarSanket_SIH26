# SwarSanket FastAPI + Quantum-Classical Hybrid Screening Backend
# Target Platform: Render Web Service (Docker runtime)
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8001

# Install essential system runtime libraries:
# - ffmpeg & libsndfile1 for audio decoding (PyAV, soundfile, librosa)
# - git & curl for dependency retrieval
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Pre-download Faster-Whisper tiny model during image build so the container
# starts instantly without runtime network dependency or cold-start latency
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# Copy application source code and serialized model artifacts
COPY . .

# Expose default port (Render will override via $PORT at runtime)
EXPOSE 8001

# Launch FastAPI ASGI server with Uvicorn, binding to 0.0.0.0 and dynamic $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
