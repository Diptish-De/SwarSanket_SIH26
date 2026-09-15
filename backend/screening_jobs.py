"""
SwarSanket asynchronous screening jobs
======================================
Turns a screening into a job instead of a request.

The free Render tier caps a request at roughly 100 seconds and gives the
container a tenth of a CPU. Whisper on a 60-second clip does not fit inside that
window, so the previous design answered HTTP 502 mid-transcription. Here the
HTTP handler only stores the audio and returns a ``recording_id``; a single
background worker then runs the pipeline and writes each stage into the
Supabase ``recordings`` row. The phone follows that row over Supabase Realtime,
or by polling ``GET /api/screenings/{recording_id}``.

Why one worker: on a tenth of a CPU two concurrent transcriptions each take
longer than the two run back-to-back, and memory is capped at 512 MB. Jobs
therefore queue, and the queue position is reported so the wait is honest.

Status vocabulary, written to ``recordings.processing_status`` and returned by
the status endpoint (the frontend switch statement depends on these exact
strings):

    queued -> uploading -> transcribing -> extracting -> scoring -> completed
                                                                  -> failed
"""

from __future__ import annotations

import logging
import os
import threading
import time
import uuid
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from supabase_service import supabase_service
from task_scoring import (
    TASKS,
    score_daily_recall,
    score_fluency,
    score_phonation,
    score_recall,
)

logger = logging.getLogger("swarsanket.jobs")

TERMINAL_STATES = ("completed", "failed")
MAX_REMEMBERED_JOBS = 200

# Message shown when the engine itself refuses the audio (no speech at all).
# Kept identical to the synchronous endpoint so both paths read the same.
NO_SPEECH_MESSAGE = (
    "Unable to analyze audio recording. Please ensure the recording is clear "
    "and contains audible speech."
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class _JobRefused(Exception):
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message)
        self.detail = detail


def warm_engine() -> None:
    """
    Loads the screening stack on a background thread, shortly after startup.

    Boot has to stay small so the health probe answers and the deploy goes
    live, which is why screening_engine is imported lazily. The cost does not
    disappear though: it lands on whoever submits the first screening, who then
    waits about ninety seconds watching a bar that looks stuck. Paying it here,
    off the request path, gives both properties at once.

    Daemon thread, and every failure is swallowed: a warm-up that cannot run is
    a slow first screening, never a broken service.
    """

    def _load() -> None:
        try:
            started = time.perf_counter()
            from screening_engine import get_whisper_model

            get_whisper_model()
            logger.info("[Jobs] engine warm after %.1fs", time.perf_counter() - started)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[Jobs] engine warm-up skipped: %s", exc)

    threading.Thread(target=_load, daemon=True, name="engine-warmup").start()


def _worker_count() -> int:
    """
    How many screenings may run at once.

    One is right for the deployment: a tenth of a CPU and 512 MB, where two
    concurrent transcriptions each finish later than the two run back to back.
    It is wrong for a laptop, where a session's picture task queues behind the
    battery's phonation, fluency and recall jobs and the person watches
    "waiting for 2 screenings ahead of you" for a minute.

    The deployment pins OMP_NUM_THREADS in its Dockerfile, so that is the
    signal for a constrained container. Anywhere else, allow two.
    """
    explicit = os.environ.get("SWARSANKET_JOB_WORKERS")
    if explicit:
        try:
            return max(1, int(explicit))
        except ValueError:
            pass

    return 1 if os.environ.get("OMP_NUM_THREADS") else 2


class ScreeningJobManager:
    """Owns the worker threads, the in-memory job table and the Supabase mirror."""

    def __init__(self, max_workers: Optional[int] = None):
        workers = max_workers if max_workers is not None else _worker_count()
        logger.info("[Jobs] screening workers: %d", workers)
        self._executor = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="screening")
        self._jobs: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
        self._lock = threading.Lock()

    # ── public API ──────────────────────────────────────────────────────────

    def submit(
        self,
        saved_path: Path,
        original_filename: str,
        content_type: str,
        size_bytes: int,
        task: str = "picture",
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Registers a job and returns its public view immediately. The Supabase row
        is inserted before returning so a client can subscribe to it straight
        away; audio upload and inference happen on the worker.
        """
        recording_id = uuid.uuid4().hex[:12]
        job: Dict[str, Any] = {
            "recording_id": recording_id,
            "status": "queued",
            "created_at": _utc_now(),
            "updated_at": _utc_now(),
            "original_filename": original_filename,
            "content_type": content_type or "audio/webm",
            "size_bytes": size_bytes,
            "saved_path": saved_path,
            "task": task if task in TASKS else "picture",
            "params": dict(params or {}),
            "result": None,
            "error": None,
            "supabase_row": False,
            "supabase_url": None,
        }
        with self._lock:
            self._jobs[recording_id] = job
            self._trim_locked()

        row = supabase_service.save_recording_record({
            "recording_id": recording_id,
            "original_filename": original_filename or saved_path.name,
            "stored_filename": saved_path.name,
            "storage_path": None,
            "audio_format": saved_path.suffix.lstrip(".") or "webm",
            "file_size_bytes": size_bytes,
            "processing_status": "queued",
            "prediction_status": "queued",
            "metadata": {"task": job["task"]},
        })
        job["supabase_row"] = bool(row.get("saved"))

        # Build the response before the worker starts so the caller always
        # sees the job as accepted-and-queued, never a half-advanced state.
        view = self.status(recording_id)
        assert view is not None  # the job was registered a few lines up
        self._executor.submit(self._run, recording_id)
        return view

    def status(self, recording_id: str) -> Optional[Dict[str, Any]]:
        """
        Public view of a job. Falls back to the Supabase row when this process
        does not remember the job (for example after a redeploy mid-screening).
        """
        with self._lock:
            job = self._jobs.get(recording_id)
            position = self._queue_position_locked(recording_id) if job else None

        if job is None:
            row = supabase_service.get_recording(recording_id)
            if row is None:
                return None
            return {
                "recording_id": recording_id,
                "task": (row.get("metadata") or {}).get("task", "picture"),
                "status": row.get("processing_status") or "queued",
                "queue_position": None,
                "result": row.get("prediction_result"),
                "error": row.get("error_message"),
                "updated_at": row.get("created_at"),
                "source": "supabase",
            }

        return {
            "recording_id": recording_id,
            "task": job["task"],
            "status": job["status"],
            "queue_position": position,
            "result": job["result"] if job["status"] == "completed" else None,
            "error": job["error"] if job["status"] == "failed" else None,
            "updated_at": job["updated_at"],
            "source": "worker",
        }

    def queue_length(self) -> int:
        with self._lock:
            return sum(1 for j in self._jobs.values() if j["status"] not in TERMINAL_STATES)

    # ── worker ──────────────────────────────────────────────────────────────

    def _run(self, recording_id: str) -> None:
        with self._lock:
            job = self._jobs.get(recording_id)
        if job is None:
            return

        saved_path: Path = job["saved_path"]
        started = time.perf_counter()
        try:
            # Archiving the audio runs alongside the pipeline, not in front of
            # it. The Supabase client has no timeout, so when DNS or the TLS
            # handshake hangs this call blocks for tens of seconds; doing it
            # first pinned the job at "uploading" for that whole time and the
            # person watched a progress bar that had genuinely stopped. Storage
            # is for durability and the screening does not depend on it, so it
            # is started here and collected after scoring.
            self._set(job, "uploading")
            archive = threading.Thread(
                target=self._archive_audio,
                args=(job, recording_id, saved_path),
                daemon=True,
                name=f"archive-{recording_id}",
            )
            archive.start()

            result = self._score(job, saved_path)

            # Scoring is done; give the upload a brief moment to finish so the
            # stored row carries its audio URL. It is never waited on for long,
            # because a stalled archive must not hold up a finished screening.
            archive.join(timeout=10.0)

            result["filename"] = saved_path.name
            result["recording_id"] = recording_id
            result["task"] = job["task"]
            result["supabase_url"] = job["supabase_url"]
            result["supabase_saved"] = False
            result["processing_seconds"] = round(time.perf_counter() - started, 2)

            audio_info = result.get("audio", {}) or {}
            if job["task"] == "picture":
                # Only the model-scored task is a "screening" row; the
                # standardized tasks live on their recordings row.
                db_res = supabase_service.save_screening_record({
                    **result,
                    "session_id": f"sess_{recording_id}",
                })
                result["supabase_saved"] = bool(db_res.get("saved"))

            job["result"] = result
            self._set(job, "completed", extra={
                "prediction_status": "completed",
                "prediction_result": result,
                "duration_seconds": audio_info.get("duration_seconds"),
                "sample_rate": audio_info.get("sample_rate"),
                "number_of_channels": audio_info.get("channels"),
                "error_message": None,
            })
            logger.info(
                "[Jobs] %s completed in %.1fs (tier=%s)",
                recording_id, time.perf_counter() - started,
                (result.get("screening") or {}).get("risk_tier"),
            )

        except _JobRefused as refused:
            logger.info("[Jobs] %s refused: %s", recording_id, refused.detail)
            job["error"] = str(refused)
            self._set(job, "failed", extra={
                "prediction_status": "rejected",
                "error_message": str(refused),
            })
        except Exception as exc:  # noqa: BLE001 - the worker must never die
            logger.error("[Jobs] %s crashed: %s", recording_id, exc, exc_info=True)
            job["error"] = (
                "An error occurred while processing the voice screening. Please try again."
            )
            self._set(job, "failed", extra={
                "prediction_status": "failed",
                "error_message": job["error"],
            })
        finally:
            try:
                saved_path.unlink(missing_ok=True)
            except Exception:
                pass

    def _score(self, job: Dict[str, Any], saved_path: Path) -> Dict[str, Any]:
        """Runs the right scorer for the job's task; raises _JobRefused on refusal."""
        task = job["task"]
        on_stage = lambda stage: self._set(job, stage)  # noqa: E731

        if task == "picture":
            # Announce the stage before the import, not after. screening_engine
            # pulls in torch, PennyLane, spaCy and faster-whisper, which on a
            # cold process is around ninety seconds. Leaving the job on
            # "uploading" through all of it showed a progress bar that had, as
            # far as anyone watching could tell, stopped. Transcription is what
            # this phase leads to, so that is what it reports.
            on_stage("transcribing")

            # Imported here rather than at module scope: at module scope the
            # same stack is ~490 MB resident before the app serves a request,
            # against a 512 MB container, and the health probe never answers.
            # warm_engine() below removes the cost from the first screening.
            from screening_engine import run_screening_pipeline

            result = run_screening_pipeline(str(saved_path), on_stage=on_stage)
            if not result.get("success"):
                # The engine returns success=False only when there is no speech
                # to transcribe. That is a refusal, not a crash.
                raise _JobRefused(NO_SPEECH_MESSAGE, detail=result.get("error"))
            return result

        if task == "phonation":
            on_stage("scoring")
            scored = score_phonation(str(saved_path))
            return {
                "success": True,
                "audio": {"duration_seconds": scored.get("details", {}).get("duration_seconds")},
                "battery": scored,
            }

        # fluency and recall both start from a transcript
        on_stage("transcribing")
        from screening_engine import transcribe_for_task

        tx = transcribe_for_task(str(saved_path))
        on_stage("scoring")
        language = (job["params"].get("language") or tx.get("detected_language") or "en")
        if task == "daily":
            scored = score_daily_recall(
                tx["transcript"], tx["words"], language,
                float(tx["audio"].get("duration_seconds") or 0.0),
            )
        elif task == "fluency":
            scored = score_fluency(
                tx["transcript"], tx["words"], language,
                float(tx["audio"].get("duration_seconds") or 0.0),
            )
        else:
            scored = score_recall(tx["transcript"], job["params"].get("target_words") or [], language)
        return {
            "success": True,
            "transcript": tx["transcript"],
            "word_count": tx["word_count"],
            "detected_language": tx["detected_language"],
            "audio": tx["audio"],
            "battery": scored,
        }

    def _archive_audio(self, job: Dict[str, Any], recording_id: str, saved_path: Path) -> None:
        """
        Copies the recording into Supabase Storage. Runs on its own thread so a
        slow or unreachable Supabase cannot stall the screening, and swallows
        everything: losing the archive copy is not a reason to fail a screening.
        """
        try:
            upload = supabase_service.upload_audio_file(
                saved_path, saved_path.name, content_type=job["content_type"]
            )
            if upload.get("success"):
                job["supabase_url"] = upload.get("public_url")
                supabase_service.update_recording_status(recording_id, {
                    "storage_path": upload.get("path"),
                    "supabase_storage_url": upload.get("public_url"),
                })
        except Exception as exc:  # noqa: BLE001
            logger.warning("[Jobs] %s archive failed: %s", recording_id, exc)

    # ── helpers ─────────────────────────────────────────────────────────────

    def _set(self, job: Dict[str, Any], status: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Advances a job and mirrors the change into Supabase (fail-soft)."""
        job["status"] = status
        job["updated_at"] = _utc_now()
        fields: Dict[str, Any] = {"processing_status": status}
        if status not in TERMINAL_STATES:
            fields["prediction_status"] = "queued" if status == "queued" else "in_progress"
        if extra:
            fields.update(extra)
        if job.get("supabase_row"):
            supabase_service.update_recording_status(job["recording_id"], fields)

    def _queue_position_locked(self, recording_id: str) -> Optional[int]:
        """0 = running now, 1 = next, ...; None once the job is terminal."""
        pending: List[str] = [
            rid for rid, j in self._jobs.items() if j["status"] not in TERMINAL_STATES
        ]
        if recording_id not in pending:
            return None
        return pending.index(recording_id)

    def _trim_locked(self) -> None:
        while len(self._jobs) > MAX_REMEMBERED_JOBS:
            rid, job = next(iter(self._jobs.items()))
            if job["status"] not in TERMINAL_STATES:
                break
            self._jobs.pop(rid)


job_manager = ScreeningJobManager()
