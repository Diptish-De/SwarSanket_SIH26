import os
import uuid
import shutil
import logging
import tempfile
from pathlib import Path
from datetime import datetime, timezone

from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import optional_supabase_user, require_supabase_user
from supabase_service import supabase_service

# Configure backend logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swarsanket.backend")

app = FastAPI(
    title="SwarSanket Voice Biomarker & Screening Backend",
    description="FastAPI service for acoustic/linguistic feature extraction and 22-Feature Quantum-Hybrid screening inference.",
    version="2.0.0",
)

SUPABASE_ADMIN_API_KEY = os.environ.get("SUPABASE_ADMIN_API_KEY", "").strip()


class PatientProfilePayload(BaseModel):
    patient_id: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    caregiver_email: Optional[str] = None

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


@app.get("/api/patient/me")
def get_my_patient_profile(user: Dict[str, Any] = Depends(require_supabase_user)):
    profile = supabase_service.get_patient_profile_by_auth_user_id(user["id"])

    if profile is None:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    return profile


@app.put("/api/patient/me")
def update_my_patient_profile(
    payload: PatientProfilePayload,
    user: Dict[str, Any] = Depends(require_supabase_user),
):
    profile_data = payload.dict(exclude_none=True)
    profile_data["legacy_patient_id"] = profile_data.pop("patient_id", None)
    profile_data.setdefault("full_name", user.get("user_metadata", {}).get("full_name"))
    profile_data.setdefault("username", user.get("user_metadata", {}).get("username"))

    profile = supabase_service.get_or_create_authenticated_profile(
        user["id"],
        profile_data,
    )

    if profile is None:
        raise HTTPException(status_code=503, detail="Patient profile service is unavailable.")

    return profile


@app.get("/api/supabase/my-screenings")
def list_my_screenings(user: Dict[str, Any] = Depends(require_supabase_user)):
    profile = supabase_service.get_patient_profile_by_auth_user_id(user["id"])

    if profile is None:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    screenings = supabase_service.get_patient_screening_history(profile["id"])
    return {"total": len(screenings), "screenings": screenings}


@app.get("/api/supabase/screenings")
def list_supabase_screenings(
    limit: int = 50,
    patient_id: str | None = None,
    x_supabase_admin_key: str | None = Header(default=None),
):
    """Fetches screening history only for an explicitly authorized server client."""
    if not SUPABASE_ADMIN_API_KEY or x_supabase_admin_key != SUPABASE_ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Screening history access is not authorized.")

    try:
        screenings = (
            supabase_service.get_patient_screening_history(patient_id, limit=limit)
            if patient_id
            else supabase_service.get_screening_history(limit=limit)
        )
        return {
            "total": len(screenings),
            "screenings": screenings,
        }
    except Exception as e:
        return {"total": 0, "screenings": [], "error": str(e)}


@app.post("/api/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    patient_id: str | None = Form(default=None),
):
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


@app.post("/api/analyze-audio")
async def analyze_audio(
    audio: UploadFile = File(...),
    patient_id: str | None = Form(default=None),
    patient_username: str | None = Form(default=None),
    patient_name: str | None = Form(default=None),
    patient_age: int | None = Form(default=None),
    patient_gender: str | None = Form(default=None),
    patient_phone: str | None = Form(default=None),
    caregiver_name: str | None = Form(default=None),
    caregiver_phone: str | None = Form(default=None),
    caregiver_email: str | None = Form(default=None),
    authenticated_user: Optional[Dict[str, Any]] = Depends(optional_supabase_user),
):
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
            resolved_patient_id = patient_id

            if authenticated_user:
                authenticated_profile = supabase_service.get_or_create_authenticated_profile(
                    authenticated_user["id"],
                    {
                        "legacy_patient_id": patient_id,
                        "username": patient_username
                        or authenticated_user.get("user_metadata", {}).get("username"),
                        "full_name": patient_name
                        or authenticated_user.get("user_metadata", {}).get("full_name")
                        or authenticated_user.get("email"),
                        "age": patient_age,
                        "gender": patient_gender,
                        "phone": patient_phone,
                        "caregiver_name": caregiver_name,
                        "caregiver_phone": caregiver_phone,
                        "caregiver_email": caregiver_email,
                    },
                )

                if authenticated_profile is None:
                    raise HTTPException(status_code=503, detail="Patient profile service is unavailable.")

                # Authenticated identity always wins over client-supplied context.
                resolved_patient_id = authenticated_profile["id"]
            elif patient_id:
                supabase_service.upsert_patient_profile(
                    {
                        "id": patient_id,
                        "username": patient_username,
                        "full_name": patient_name,
                        "age": patient_age,
                        "gender": patient_gender,
                        "phone": patient_phone,
                        "caregiver_name": caregiver_name,
                        "caregiver_phone": caregiver_phone,
                        "caregiver_email": caregiver_email,
                    }
                )

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
                    "patient_id": resolved_patient_id,
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
                "patient_id": resolved_patient_id,
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
