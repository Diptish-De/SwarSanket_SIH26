import json
import logging
import os
from pathlib import Path
import shutil
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import optional_supabase_user, require_supabase_user
from screening_jobs import job_manager, warm_engine
from supabase_service import supabase_service
from task_scoring import TASKS

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


class RegisterPayload(BaseModel):
    full_name: str
    phone: str
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None


class LookupPayload(BaseModel):
    identifier: str

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


@app.api_route("/", methods=["GET", "HEAD"])
def root_check():
    """Root ping endpoint to satisfy cloud provider liveness probes and uptime monitors."""
    return {
        "status": "ok",
        "service": "SwarSanket Voice Biomarker Backend",
        "health": "/api/health",
        "docs": "/docs",
    }


@app.on_event("startup")
def _warm_screening_engine() -> None:
    """
    Starts loading the model stack as soon as the server is listening.

    Boot itself stays light so the health probe answers immediately and a
    deployment can go live; this runs on a background thread behind it, so the
    first person to submit a screening does not wait ninety seconds for torch,
    PennyLane, spaCy and Whisper to load. Set SWARSANKET_WARMUP=0 to skip it.
    """
    if os.environ.get("SWARSANKET_WARMUP", "1").lower() in ("0", "false", "no"):
        logger.info("Engine warm-up disabled by SWARSANKET_WARMUP.")
        return

    logger.info("Warming the screening engine in the background.")
    warm_engine()


@app.api_route("/api/health", methods=["GET", "HEAD"])
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


@app.post("/api/auth/register")
def register_patient_user(payload: RegisterPayload):
    """Registers a patient user directly in Supabase Auth with auto-confirmed status and metadata."""
    digits = "".join(ch for ch in payload.phone if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=400, detail="A valid phone number is required.")

    phone_key = digits[-10:] if len(digits) >= 10 else digits
    phone_with_code = f"91{phone_key}" if len(digits) == 10 else digits
    virtual_email = f"{phone_key}@swarsanket.app"

    if not supabase_service.is_configured():
        raise HTTPException(status_code=503, detail="Supabase service is unavailable.")

    try:
        user_res = supabase_service.client.auth.admin.create_user({
            "phone": phone_with_code,
            "phone_confirm": True,
            "email": virtual_email,
            "email_confirm": True,
            "password": payload.password,
            "user_metadata": {
                "full_name": payload.full_name,
                "username": payload.full_name,
                "phone": payload.phone,
                "clean_phone": phone_key,
                "age": payload.age,
                "gender": payload.gender,
                "caregiver_name": payload.caregiver_name,
                "caregiver_phone": payload.caregiver_phone,
            },
        })
        created_user = getattr(user_res, "user", None) or user_res
        user_id = str(getattr(created_user, "id", "") or created_user.get("id"))

        # Also mirror profile data in Supabase
        supabase_service.get_or_create_authenticated_profile(
            user_id,
            {
                "full_name": payload.full_name,
                "phone": payload.phone,
                "age": payload.age,
                "gender": payload.gender,
                "caregiver_name": payload.caregiver_name,
                "caregiver_phone": payload.caregiver_phone,
            },
        )

        return {
            "status": "success",
            "email": virtual_email,
            "user_id": user_id,
            "message": "User registered in Supabase.",
        }
    except Exception as e:
        err_str = str(e)
        if "already registered" in err_str.lower() or "already exists" in err_str.lower():
            # Update password and metadata for existing user so they can sign in
            try:
                users_list = supabase_service.client.auth.admin.list_users()
                target = next((u for u in users_list if getattr(u, "email", "") == virtual_email or getattr(u, "phone", "") == phone_with_code), None)
                if target:
                    supabase_service.client.auth.admin.update_user_by_id(
                        target.id,
                        {
                            "phone": phone_with_code,
                            "phone_confirm": True,
                            "password": payload.password,
                            "user_metadata": {
                                "full_name": payload.full_name,
                                "phone": payload.phone,
                                "clean_phone": phone_key,
                                "age": payload.age,
                                "gender": payload.gender,
                            },
                        },
                    )
                    return {
                        "status": "updated",
                        "email": virtual_email,
                        "user_id": target.id,
                        "message": "Credentials updated in Supabase.",
                    }
            except Exception as upd_err:
                logger.warning(f"Could not update user: {upd_err}")
            raise HTTPException(status_code=409, detail="This WhatsApp number is already registered. Please sign in.")
        logger.error(f"Supabase user creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {err_str}")


@app.post("/api/auth/lookup")
def lookup_patient_user(payload: LookupPayload):
    """Resolves an identifier (name or WhatsApp phone number) to a login email."""
    raw = payload.identifier.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Identifier is required.")

    if "@" in raw:
        return {"found": True, "email": raw.lower()}

    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) >= 10:
        phone_key = digits[-10:]
        return {"found": True, "email": f"{phone_key}@swarsanket.app", "phone": digits}

    # Search by full_name in Supabase users
    if supabase_service.is_configured():
        try:
            users_res = supabase_service.client.auth.admin.list_users()
            for u in users_res:
                meta = getattr(u, "user_metadata", {}) or {}
                fn = str(meta.get("full_name", "")).strip().lower()
                ph = str(meta.get("phone", "")).strip().lower()
                clean_p = str(meta.get("clean_phone", "")).strip().lower()
                target_raw = raw.lower()
                if target_raw == fn or target_raw == ph or target_raw == clean_p or (len(target_raw) >= 3 and target_raw in fn):
                    return {
                        "found": True,
                        "email": getattr(u, "email", None),
                        "full_name": meta.get("full_name"),
                        "phone": meta.get("phone"),
                    }
        except Exception as e:
            logger.warning(f"Lookup failed: {e}")

    if digits:
        return {"found": True, "email": f"{digits}@swarsanket.app"}

    return {"found": False, "detail": "User not found."}


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
async def submit_screening(
    audio: UploadFile = File(...),
    task: str = Form("picture"),
    params: Optional[str] = Form(None),
):
    """
    Asynchronous screening: stores the recording, queues it, and returns at once.
    Follow progress over Supabase Realtime on the returned row, or poll
    GET /api/screenings/{recording_id}. Heavy work never runs inside a request,
    so the hosting proxy's request timeout cannot cut a screening short.

    `task` selects the scorer: "picture" (the 22-feature quantum-hybrid model,
    default), or one of the standardized tasks "fluency", "recall", "phonation"
    (see task_scoring.py). `params` is an optional JSON object; recall needs
    {"target_words": [...]} and both transcript tasks accept {"language": "hi"}.
    """
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="No valid audio file provided.")
    task = (task or "picture").strip().lower()
    if task not in TASKS:
        raise HTTPException(status_code=400, detail=f"Unknown task '{task}'. Expected one of {list(TASKS)}.")
    parsed_params: dict = {}
    if params:
        if len(params) > 4096:
            raise HTTPException(status_code=400, detail="params too large.")
        try:
            parsed_params = json.loads(params)
            if not isinstance(parsed_params, dict):
                raise ValueError("params must be a JSON object")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid params: {e}")
    if task == "recall" and not parsed_params.get("target_words"):
        raise HTTPException(status_code=400, detail="recall requires params.target_words.")
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
        task=task,
        params=parsed_params,
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
    # Reload watches only the modules that serve requests. A screening runs on
    # a background worker inside this process, so every reload kills whatever
    # is mid-flight and empties the job table: the phone's next poll 404s and
    # the person is told the server gave up. Saving a test or re-running the
    # benchmark should not do that.
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_excludes=[
            "test_*.py",
            "benchmark_*.py",
            "*.json",
            "*.csv",
            "*.pkl",
            "*.pt",
            "uploads/*",
            "models/*",
            "test_audio/*",
        ],
    )
