import os
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from screening_engine import run_screening_pipeline

# Configure backend logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swarsanket.backend")

app = FastAPI(
    title="SwarSanket Voice Biomarker & Screening Backend",
    description="FastAPI service for acoustic/linguistic feature extraction and 22-Feature Quantum-Hybrid screening inference.",
    version="2.0.0",
)

# Enable CORS for Vite frontend running on localhost / 127.0.0.1
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8443",
        "http://127.0.0.1:8443",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads storage directory
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _generate_saved_path(original_filename: str, content_type: str = "") -> Path:
    """Generates a unique timestamped file path for incoming audio recordings."""
    ext = Path(original_filename or "").suffix.lower()
    if not ext:
        if "webm" in content_type:
            ext = ".webm"
        elif "mp4" in content_type or "m4a" in content_type:
            ext = ".m4a"
        elif "wav" in content_type:
            ext = ".wav"
        else:
            ext = ".webm"

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    unique_filename = f"swarsanket_{timestamp}_{unique_id}{ext}"
    return UPLOADS_DIR / unique_filename


@app.get("/api/health")
def health_check():
    """Health check endpoint confirming service status and active configuration."""
    return {
        "status": "ok",
        "service": "SwarSanket Voice Biomarker Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": "PyTorch + PennyLane 8-Qubit Quantum-Classical Hybrid (22 Features, MC Dropout)",
        "pipeline": "Faster-Whisper ASR + spaCy NLP + Quantum Variational Classifier",
    }


@app.post("/api/upload-audio")
async def upload_audio(audio: UploadFile = File(...)):
    """
    Ingests and saves an audio file to backend/uploads/ with a unique identifier.
    """
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="No valid audio file provided.")

    saved_path = _generate_saved_path(audio.filename, audio.content_type or "")

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        size_bytes = os.path.getsize(saved_path)
        if size_bytes == 0:
            saved_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty (0 bytes).")

        return {
            "success": True,
            "filename": saved_path.name,
            "content_type": audio.content_type,
            "size_bytes": size_bytes,
            "saved_path": str(saved_path),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save audio file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while saving audio recording.")
    finally:
        audio.file.close()


@app.post("/api/analyze-audio")
async def analyze_audio(audio: UploadFile = File(...)):
    """
    Real SwarSanket screening endpoint:
      1. Saves uploaded voice recording (WebM, M4A, WAV).
      2. Runs Faster-Whisper ASR + word timestamps.
      3. Performs spaCy linguistic POS and keyword extraction.
      4. Assembles the 22-feature Quantum-Hybrid contract vector.
      5. Executes 8-Qubit Variational Quantum Circuit inference with MC Dropout.
      6. Returns structured clinical screening signal & uncertainty metadata.
    """

    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="No valid audio file provided.")

    saved_path = _generate_saved_path(audio.filename, audio.content_type or "")

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        size_bytes = os.path.getsize(saved_path)
        if size_bytes == 0:
            saved_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty (0 bytes).")

        # Run complete live screening engine pipeline
        result = run_screening_pipeline(str(saved_path))

        if not result.get("success"):
            error_msg = result.get("error", "Unknown error")
            logger.error(f"Screening engine processing error on '{saved_path.name}': {error_msg}")
            raise HTTPException(
                status_code=422,
                detail="Unable to analyze audio recording. Please ensure the recording is clear and contains audible speech.",
            )

        # Attach saved filename metadata
        result["filename"] = saved_path.name
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error during audio analysis of '{saved_path.name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the voice screening. Please try again.",
        )
    finally:
        audio.file.close()


if __name__ == "__main__":
    import uvicorn
    # Default to port 8001 to align with frontend audioRecorder configuration
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
