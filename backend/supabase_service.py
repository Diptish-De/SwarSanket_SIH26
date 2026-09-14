"""
SwarSanket Supabase Integration Service
=======================================
Handles all cloud database and cloud storage operations via Supabase:
  - Audio file uploads & streaming via Supabase Storage ('swarsanket-recordings')
  - Screening inference session persistence ('screenings' table)
  - Recording physical metadata persistence ('recordings' table)
  - Connectivity health checks & diagnostic telemetry

Medical/Screening Safety Notice:
  - SwarSanket is an automated clinical decision-support screening aid, NOT a diagnostic system.
  - Terminology is restricted to screening results (e.g., elevated screening signal / lower screening signal).

Resilience Design:
  - Operates non-blockingly: failures in cloud storage or database persistence
    will never crash or cause HTTP 500 in the core voice screening pipeline.
  - Gracefully handles missing tables or unconfigured credentials.
"""

import os
import io
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timezone
from uuid import UUID, uuid4

from dotenv import load_dotenv

# Load environment variables from local .env if present (non-blocking)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("swarsanket.supabase")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "swarsanket-recordings").strip()
USE_SUPABASE_STORAGE = os.environ.get("USE_SUPABASE_STORAGE", "true").lower() in ("1", "true", "yes")
USE_SUPABASE_DB = os.environ.get("USE_SUPABASE_DB", "true").lower() in ("1", "true", "yes")


class SupabaseService:
    """Manages cloud persistence to Supabase Storage and PostgreSQL with graceful degradation."""

    def __init__(self):
        self.url = SUPABASE_URL
        self.service_role_key = SUPABASE_SERVICE_ROLE_KEY
        self.anon_key = SUPABASE_ANON_KEY
        self.bucket_name = SUPABASE_STORAGE_BUCKET
        self.client = None
        self._init_error: Optional[str] = None
        self._initialize_client()

    def _initialize_client(self) -> bool:
        """Initializes the Supabase Python Client safely."""
        if not self.url or not self.service_role_key:
            self._init_error = "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured."
            logger.info("[Supabase] Service not configured (running in local-only mode).")
            return False

        try:
            from supabase import create_client, Client
            self.client: Client = create_client(self.url, self.service_role_key)
            logger.info("[Supabase] Client initialized successfully.")
            self._init_error = None
            return True
        except Exception as e:
            self._init_error = str(e)
            logger.warning(f"[Supabase] Failed to initialize client: {e}")
            return False

    def is_configured(self) -> bool:
        """Returns True if the Supabase client is initialized and ready."""
        return self.client is not None

    def health_check(self) -> Dict[str, Any]:
        """Performs a live health ping test to Supabase and returns status and latency."""
        if not self.is_configured():
            return {
                "connected": False,
                "configured": False,
                "bucket": self.bucket_name,
                "latency_ms": None,
                "status": "unconfigured",
            }

        start = time.perf_counter()
        try:
            buckets = self.client.storage.list_buckets()
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            bucket_found = any(b.name == self.bucket_name for b in buckets)
            return {
                "connected": True,
                "configured": True,
                "bucket": self.bucket_name,
                "bucket_exists": bucket_found,
                "total_buckets": len(buckets),
                "latency_ms": latency_ms,
                "storage_enabled": USE_SUPABASE_STORAGE,
                "database_enabled": USE_SUPABASE_DB,
                "status": "connected",
            }
        except Exception as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.warning(f"[Supabase] Health ping error: {e}")
            return {
                "connected": False,
                "configured": True,
                "bucket": self.bucket_name,
                "latency_ms": latency_ms,
                "status": "error",
            }

    def upload_audio_file(
        self,
        file_source: Union[str, Path, bytes, io.BytesIO],
        destination_filename: str,
        content_type: str = "audio/wav"
    ) -> Dict[str, Any]:
        """
        Uploads an audio file directly to the Supabase storage bucket.
        Returns public URL and path on success, or non-blocking error dict.
        """
        if not self.is_configured() or not USE_SUPABASE_STORAGE:
            return {
                "success": False,
                "error": "Supabase storage is disabled or unconfigured.",
                "public_url": None,
            }

        try:
            if isinstance(file_source, (str, Path)):
                with open(file_source, "rb") as f:
                    file_bytes = f.read()
            elif isinstance(file_source, io.BytesIO):
                file_bytes = file_source.getvalue()
            elif isinstance(file_source, bytes):
                file_bytes = file_source
            else:
                raise ValueError("Unsupported file source type.")

            clean_filename = destination_filename.strip().lstrip("/")
            file_options = {
                "content-type": content_type,
                "upsert": "true"
            }

            self.client.storage.from_(self.bucket_name).upload(
                path=clean_filename,
                file=file_bytes,
                file_options=file_options,
            )

            public_url = self.client.storage.from_(self.bucket_name).get_public_url(clean_filename)
            logger.info(f"[Supabase] Audio uploaded: {clean_filename}")
            return {
                "success": True,
                "bucket": self.bucket_name,
                "path": clean_filename,
                "public_url": public_url,
                "size_bytes": len(file_bytes),
                "content_type": content_type,
            }
        except Exception as e:
            logger.warning(f"[Supabase] Storage upload failed for '{destination_filename}': {e}")
            return {
                "success": False,
                "error": str(e),
                "public_url": None,
            }

    def save_screening_record(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists a completed screening session into the Supabase 'screenings' table.
        Gracefully handles scenarios where the database table has not yet been deployed.
        """
        if not self.is_configured() or not USE_SUPABASE_DB:
            return {"saved": False, "reason": "Supabase database disabled or unconfigured."}

        try:
            screening_data = data.get("screening", {})
            audio_metrics = data.get("audio") or data.get("audio_metrics") or {}
            transcription = data.get("transcription", {})
            transcript_text = data.get("transcript") or (
                transcription.get("text", "")
                if isinstance(transcription, dict)
                else str(transcription or "")
            )

            row = {
                "session_id": data.get("session_id") or data.get("recording_id") or f"session_{int(time.time())}",
                "recording_id": data.get("recording_id"),
                "model_name": screening_data.get("model_name", "SwarSanket Quantum-Classical Hybrid"),
                "predicted_class": screening_data.get("predicted_class"),
                "probability": screening_data.get("probability"),
                "probability_percent": screening_data.get("probability_percent"),
                "technical_confidence_percent": screening_data.get("technical_confidence_percent"),
                "uncertainty_std": screening_data.get("uncertainty_std"),
                "predictive_entropy": screening_data.get("predictive_entropy"),
                "risk_tier": screening_data.get("risk_tier"),
                "status": screening_data.get("status", "completed"),
                "transcription": transcript_text,
                "audio_url": data.get("supabase_url") or data.get("audio_url"),
                "production_features": data.get("production_features"),
                "live_features": data.get("live_features"),
                "explanation": data.get("explanation"),
                "quantum_specs": screening_data.get("quantum_specs"),
                "notes": f"Screening audio duration: {audio_metrics.get('duration_seconds', 0)}s",
            }
            if data.get("patient_id"):
                row["patient_id"] = data.get("patient_id")

            try:
                res = self.client.table("screenings").insert(row).execute()
            except Exception as insert_err:
                err_str = str(insert_err)
                if ("23503" in err_str or "foreign key" in err_str.lower()) and row.get("recording_id"):
                    logger.info("[Supabase] recording_id not found in recordings table; saving screening standalone.")
                    row["recording_id"] = None
                    try:
                        res = self.client.table("screenings").insert(row).execute()
                    except Exception as err2:
                        if ("23503" in str(err2) or "patient_id" in str(err2).lower()) and "patient_id" in row:
                            row.pop("patient_id", None)
                            res = self.client.table("screenings").insert(row).execute()
                        else:
                            raise err2
                elif ("23503" in err_str or "patient_id" in err_str.lower() or "PGRST204" in err_str) and "patient_id" in row:
                    logger.info("[Supabase] patient_id constraint/column error; retrying insert without patient_id.")
                    row.pop("patient_id", None)
                    res = self.client.table("screenings").insert(row).execute()
                else:
                    raise insert_err

            logger.info(f"[Supabase] Screening session persisted: {row['session_id']}")
            return {"saved": True, "data": res.data}
        except Exception as e:
            err_str = str(e)
            if 'relation "public.screenings" does not exist' in err_str or "PGRST205" in err_str or "404" in err_str:
                logger.info(
                    "[Supabase] Table 'screenings' not deployed in Supabase yet. "
                    "Run backend/database/supabase_schema.sql to enable cloud table persistence."
                )
                return {"saved": False, "reason": "Table not created yet."}
            logger.warning(f"[Supabase] Failed to persist screening record: {e}")
            return {"saved": False, "error": err_str}

    def save_recording_record(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists audio recording metadata into the Supabase 'recordings' table.
        Gracefully handles scenarios where the database table has not yet been deployed.
        """
        if not self.is_configured() or not USE_SUPABASE_DB:
            return {"saved": False, "reason": "Supabase database disabled or unconfigured."}

        try:
            row = {
                "recording_id": data.get("recording_id"),
                "original_filename": data.get("original_filename", "unnamed.wav"),
                "stored_filename": data.get("stored_filename", data.get("filename", "")),
                "storage_path": data.get("storage_path"),
                "supabase_storage_url": data.get("supabase_storage_url") or data.get("supabase_url"),
                "audio_format": data.get("audio_format", "wav"),
                "duration_seconds": data.get("duration_seconds") or data.get("duration"),
                "sample_rate": data.get("sample_rate"),
                "number_of_channels": data.get("channels") or data.get("number_of_channels"),
                "file_size_bytes": data.get("file_size_bytes", 0),
                "processing_status": data.get("processing_status", "uploaded"),
                "prediction_status": data.get("prediction_status", "not_started"),
                "metadata": data.get("metadata") or {},
            }
            if data.get("patient_id"):
                row["patient_id"] = data.get("patient_id")

            res = self.client.table("recordings").insert(row).execute()
            return {"saved": True, "data": res.data}
        except Exception as e:
            err_str = str(e)
            if 'relation "public.recordings" does not exist' in err_str or "PGRST205" in err_str or "404" in err_str:
                return {"saved": False, "reason": "Table not created yet."}
            logger.warning(f"[Supabase] Failed to persist recording record: {e}")
            return {"saved": False, "error": err_str}

    def update_recording_status(self, recording_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Updates processing stage and metadata on the recordings row."""
        if not self.is_configured() or not USE_SUPABASE_DB:
            return {"updated": False, "reason": "Supabase database disabled or unconfigured."}

        try:
            update_data = {k: v for k, v in fields.items() if v is not None}
            res = (
                self.client.table("recordings")
                .update(update_data)
                .eq("recording_id", recording_id)
                .execute()
            )
            return {"updated": True, "data": res.data}
        except Exception as e:
            logger.warning(f"[Supabase] Failed to update recording {recording_id}: {e}")
            return {"updated": False, "error": str(e)}

    def get_recording(self, recording_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a recording row by recording_id."""
        if not self.is_configured() or not USE_SUPABASE_DB:
            return None

        try:
            res = (
                self.client.table("recordings")
                .select("*")
                .eq("recording_id", recording_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.warning(f"[Supabase] Failed to fetch recording {recording_id}: {e}")
            return None

    def upsert_patient_profile(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates the stable profile used by the current demo identity."""
        if not self.is_configured() or not USE_SUPABASE_DB:
            return {"saved": False, "reason": "Supabase database disabled or unconfigured."}

        patient_id = data.get("id")
        if not patient_id:
            return {"saved": False, "reason": "patient_id is required."}

        try:
            UUID(str(patient_id))
        except ValueError:
            return {"saved": False, "reason": "patient_id must be a UUID."}

        row = {
            "id": str(patient_id),
            "username": data.get("username"),
            "full_name": data.get("full_name") or "Participant",
            "age": data.get("age"),
            "gender": data.get("gender"),
            "phone": data.get("phone"),
            "abha_id": data.get("abha_id"),
            "caregiver_name": data.get("caregiver_name"),
            "caregiver_phone": data.get("caregiver_phone"),
            "caregiver_email": data.get("caregiver_email"),
        }

        try:
            result = self.client.table("patient_profiles").upsert(row).execute()
            return {"saved": True, "data": result.data}
        except Exception as e:
            logger.warning(f"[Supabase] Failed to persist patient profile: {e}")
            return {"saved": False, "error": str(e)}

    def get_patient_profile_by_auth_user_id(self, auth_user_id: str) -> Optional[Dict[str, Any]]:
        if not self.is_configured() or not USE_SUPABASE_DB:
            return None

        try:
            UUID(str(auth_user_id))
        except ValueError:
            return None

        try:
            result = (
                self.client.table("patient_profiles")
                .select("*")
                .eq("auth_user_id", str(auth_user_id))
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.info(f"[Supabase] Table patient_profiles lookup skipped: {e}")

        # Cloud fallback: retrieve profile from Supabase Auth user metadata
        try:
            user_res = self.client.auth.admin.get_user_by_id(str(auth_user_id))
            user_obj = getattr(user_res, "user", None) or user_res
            meta = getattr(user_obj, "user_metadata", {}) or {}
            if meta:
                return {
                    "id": str(auth_user_id),
                    "auth_user_id": str(auth_user_id),
                    "username": meta.get("username", meta.get("full_name")),
                    "full_name": meta.get("full_name") or "Participant",
                    "age": meta.get("age"),
                    "gender": meta.get("gender"),
                    "phone": meta.get("phone"),
                    "caregiver_name": meta.get("caregiver_name"),
                    "caregiver_phone": meta.get("caregiver_phone"),
                    "caregiver_email": meta.get("caregiver_email"),
                }
        except Exception as auth_err:
            logger.debug(f"Auth user profile lookup fallback: {auth_err}")

        return None

    def get_or_create_authenticated_profile(
        self,
        auth_user_id: str,
        data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        # Always update Supabase Auth user metadata so user profile is permanently preserved
        if self.client:
            try:
                meta_update = {
                    key: value
                    for key, value in {
                        "full_name": data.get("full_name"),
                        "username": data.get("username"),
                        "age": data.get("age"),
                        "gender": data.get("gender"),
                        "phone": data.get("phone"),
                        "caregiver_name": data.get("caregiver_name"),
                        "caregiver_phone": data.get("caregiver_phone"),
                        "caregiver_email": data.get("caregiver_email"),
                    }.items()
                    if value is not None
                }
                if meta_update:
                    self.client.auth.admin.update_user_by_id(
                        str(auth_user_id),
                        {"user_metadata": meta_update},
                    )
            except Exception as meta_err:
                logger.info(f"[Supabase] User metadata update skipped: {meta_err}")

        existing = self.get_patient_profile_by_auth_user_id(auth_user_id)

        if existing is None and data.get("legacy_patient_id"):
            try:
                UUID(str(data["legacy_patient_id"]))
                candidate_result = (
                    self.client.table("patient_profiles")
                    .select("*")
                    .eq("id", str(data["legacy_patient_id"]))
                    .limit(1)
                    .execute()
                )
                candidate = candidate_result.data[0] if candidate_result.data else None
                identity_matches = candidate and not candidate.get("auth_user_id") and (
                    (
                        data.get("username")
                        and candidate.get("username") == data.get("username")
                    )
                    or (
                        data.get("phone")
                        and candidate.get("phone") == data.get("phone")
                    )
                )
                if identity_matches:
                    existing = candidate
            except Exception as e:
                logger.info(f"[Supabase] Legacy profile lookup skipped: {e}")

        if existing:
            update = {
                key: value
                for key, value in {
                    "username": data.get("username"),
                    "full_name": data.get("full_name"),
                    "age": data.get("age"),
                    "gender": data.get("gender"),
                    "phone": data.get("phone"),
                    "caregiver_name": data.get("caregiver_name"),
                    "caregiver_phone": data.get("caregiver_phone"),
                    "caregiver_email": data.get("caregiver_email"),
                    "auth_user_id": str(auth_user_id),
                }.items()
                if value is not None
            }

            try:
                result = (
                    self.client.table("patient_profiles")
                    .update(update)
                    .eq("id", existing["id"])
                    .execute()
                )
                return result.data[0] if result.data else existing
            except Exception as e:
                logger.info(f"[Supabase] Table update skipped: {e}")
                existing.update(update)
                return existing

        row = {
            "id": str(uuid4()),
            "auth_user_id": str(auth_user_id),
            "username": data.get("username"),
            "full_name": data.get("full_name") or "Participant",
            "age": data.get("age"),
            "gender": data.get("gender"),
            "phone": data.get("phone"),
            "caregiver_name": data.get("caregiver_name"),
            "caregiver_phone": data.get("caregiver_phone"),
            "caregiver_email": data.get("caregiver_email"),
        }

        try:
            result = self.client.table("patient_profiles").insert(row).execute()
            return result.data[0] if result.data else row
        except Exception as e:
            logger.info(f"[Supabase] Table insert skipped (persisted in Auth metadata): {e}")
            return row

    def get_patient_screening_history(self, patient_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches only screenings linked to one validated patient profile."""
        if not self.is_configured() or not USE_SUPABASE_DB:
            return []

        try:
            UUID(str(patient_id))
        except ValueError:
            return []

        try:
            result = (
                self.client.table("screenings")
                .select("*")
                .eq("patient_id", str(patient_id))
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.info(f"[Supabase] Unable to fetch patient screening history: {e}")
            return []

    def get_screening_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches past screening sessions ordered by created_at descending."""
        if not self.is_configured() or not USE_SUPABASE_DB:
            return []

        try:
            res = (
                self.client.table("screenings")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.info(f"[Supabase] Unable to fetch screening history (table may be undeployed): {e}")
            return []


# Singleton service instance
supabase_service = SupabaseService()
