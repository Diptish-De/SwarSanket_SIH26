import os
import uuid
import shutil
import logging
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supabase_service import supabase_service
from screening_jobs import job_manager

# Configure backend logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swarsanket.backend")

app = FastAPI(
    title="SwarSanket Voice Biomarker & Screening Backend",
    description="FastAPI service for acoustic/linguistic feature extraction and 22-Feature Quantum-Hybrid screening inference.",
    version="2.0.0",
)

# Configure CORS: support ALLOWED_ORIGINS env var for production frontend domains (comma-separated),
# while preserving standard local development origins.
raw_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "")
custom_origins = [orig.strip() for orig in raw_allowed_origins.split(",") if orig.strip()]

default_origins = [
    "http://localhost:8443",
    "http://127.0.0.1:8443",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "*",
]
allowed_origins = list(dict.fromkeys(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads storage directory (runtime-safe ephemeral storage in /tmp by default, configurable via UPLOADS_DIR)
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", Path(tempfile.gettempdir()) / "swarsanket_uploads"))
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
    """Health check endpoint confirming service status, active configuration, and Supabase telemetry."""
    res = {
        "status": "ok",
        "service": "SwarSanket Voice Biomarker Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": "PyTorch + PennyLane 8-Qubit Quantum-Classical Hybrid (22 Features, MC Dropout)",
        "pipeline": "Faster-Whisper ASR + spaCy NLP + Quantum Variational Classifier",
    }
    # Attach Supabase health status non-blockingly
    try:
        res["supabase"] = supabase_service.health_check()
    except Exception as e:
        logger.warning(f"Non-fatal Supabase health check error: {e}")
        res["supabase"] = {"connected": False, "status": "error"}
    return res


@app.get("/api/supabase/status")
def get_supabase_status():
    """Returns real-time connectivity and storage telemetry for the Supabase service."""
    try:
        return supabase_service.health_check()
    except Exception as e:
        return {"connected": False, "status": "error", "error": str(e)}


@app.get("/api/supabase/screenings")
def list_supabase_screenings(limit: int = 50):
    """Fetches past screening sessions stored in Supabase cloud PostgreSQL."""
    try:
        screenings = supabase_service.get_screening_history(limit=limit)
        return {
            "total": len(screenings),
            "screenings": screenings,
        }
    except Exception as e:
        return {"total": 0, "screenings": [], "error": str(e)}


@app.post("/api/upload-audio")
async def upload_audio(audio: UploadFile = File(...)):
    """
    Ingests and saves an audio file to backend/uploads/ with a unique identifier.
    Synchronizes to Supabase Storage if configured.
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

        resp = {
            "success": True,
            "filename": saved_path.name,
            "content_type": audio.content_type,
            "size_bytes": size_bytes,
            "saved_path": str(saved_path),
            "supabase_url": None,
            "supabase_storage_path": None,
        }

        # Synchronize to Supabase Storage non-blockingly
        try:
            supabase_upload = supabase_service.upload_audio_file(
                saved_path,
                saved_path.name,
                content_type=audio.content_type or "audio/wav"
            )
            if supabase_upload.get("success"):
                resp["supabase_url"] = supabase_upload.get("public_url")
                resp["supabase_storage_path"] = supabase_upload.get("path")
        except Exception as e:
            logger.warning(f"Non-fatal Supabase storage upload failure: {e}")

        return resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save audio file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while saving audio recording.")
    finally:
        audio.file.close()


def _save_upload(audio: UploadFile) -> "tuple[Path, int]":
    """Writes the multipart body to the uploads directory; refuses empty files."""
    saved_path = _generate_saved_path(audio.filename, audio.content_type or "")
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    size_bytes = os.path.getsize(saved_path)
    if size_bytes == 0:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty (0 bytes).")
    return saved_path, size_bytes


def _realtime_config() -> Optional[dict]:
    """
    What a client needs to follow its recordings row over Supabase Realtime.
    The anon key is designed to be public (it is what the browser SDK uses);
    row access is governed by RLS, not by secrecy of this key. None when the
    backend has no anon key, in which case clients poll the status endpoint.
    """
    if not supabase_service.is_configured() or not supabase_service.anon_key:
        return None
    return {
        "supabase_url": supabase_service.url,
        "anon_key": supabase_service.anon_key,
        "schema": "public",
        "table": "recordings",
        "id_column": "recording_id",
    }


@app.post("/api/screenings", status_code=202)
async def submit_screening(audio: UploadFile = File(...)):
    """
    Asynchronous screening: stores the recording, queues it, and returns at once.
    Follow progress over Supabase Realtime on the returned row, or poll
    GET /api/screenings/{recording_id}. Heavy work never runs inside a request,
    so the hosting proxy's request timeout cannot cut a screening short.
    """
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="No valid audio file provided.")
    try:
        saved_path, size_bytes = _save_upload(audio)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save audio file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while saving audio recording.")
    finally:
        audio.file.close()

    job = job_manager.submit(
        saved_path,
        original_filename=audio.filename,
        content_type=audio.content_type or "audio/webm",
        size_bytes=size_bytes,
    )
    return {
        "success": True,
        **job,
        "poll_url": f"/api/screenings/{job['recording_id']}",
        "realtime": _realtime_config(),
    }


@app.get("/api/screenings/{recording_id}")
def get_screening_status(recording_id: str):
    """Current stage of a queued screening; carries the full result once completed."""
    job = job_manager.status(recording_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown recording id.")
    return {"success": True, **job}


@app.post("/api/analyze-audio")
async def analyze_audio(audio: UploadFile = File(...)):
    """
    Real SwarSanket screening endpoint:
      1. Saves uploaded voice recording (WebM, M4A, WAV).
      2. Runs Faster-Whisper ASR + word timestamps.
      3. Performs spaCy linguistic POS and keyword extraction.
      4. Assembles the 22-feature Quantum-Hybrid contract vector.
      5. Executes 8-Qubit Variational Quantum Circuit inference with MC Dropout.
      6. Attempts non-blocking Supabase Storage upload and screening session persistence.
      7. Returns structured clinical screening signal & uncertainty metadata.
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

        # Run complete live screening engine pipeline (lazy-loaded on demand to ensure <50MB boot RAM)
        from screening_engine import run_screening_pipeline
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
        result["supabase_url"] = None
        result["supabase_saved"] = False

        # Attempt non-blocking Supabase Storage upload & session persistence
        try:
            supabase_upload = supabase_service.upload_audio_file(
                saved_path,
                saved_path.name,
                content_type=audio.content_type or "audio/wav"
            )
            if supabase_upload.get("success"):
                result["supabase_url"] = supabase_upload.get("public_url")

            recording_id = uuid.uuid4().hex[:12]
            audio_info = result.get("audio", {})
            try:
                supabase_service.save_recording_record({
                    "recording_id": recording_id,
                    "original_filename": audio.filename or saved_path.name,
                    "stored_filename": saved_path.name,
                    "storage_path": supabase_upload.get("path"),
                    "supabase_storage_url": result.get("supabase_url"),
                    "audio_format": saved_path.suffix.lstrip(".") or "wav",
                    "duration_seconds": audio_info.get("duration_seconds"),
                    "sample_rate": audio_info.get("sample_rate"),
                    "number_of_channels": audio_info.get("channels"),
                    "file_size_bytes": size_bytes,
                    "processing_status": "completed",
                    "prediction_status": "completed",
                })
            except Exception as rec_err:
                logger.info(f"Non-fatal recording record save warning: {rec_err}")

            db_record = {
                **result,
                "recording_id": recording_id,
                "session_id": f"sess_{recording_id}",
                "supabase_url": result["supabase_url"],
            }
            db_res = supabase_service.save_screening_record(db_record)
            result["supabase_saved"] = db_res.get("saved", False)
        except Exception as sb_err:
            logger.warning(f"Non-fatal Supabase persistence failure: {sb_err}")
            result["supabase_saved"] = False

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
        # Clean up temporary uploaded audio file after analysis to prevent storage leaks
        try:
            saved_path.unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    # Default to port 8001 to align with frontend audioRecorder configuration
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
