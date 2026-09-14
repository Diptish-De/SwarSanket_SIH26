"""Verified Supabase Auth identity helpers for protected API routes."""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Header, HTTPException

load_dotenv(Path(__file__).resolve().parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()


def _bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer authentication is required.")

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Bearer authentication is required.")

    return token


def verify_supabase_user(authorization: Optional[str]) -> Dict[str, Any]:
    """Validate a bearer token with Supabase Auth and return its user payload."""
    token = _bearer_token(authorization)

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured.")

    request = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            user = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session.")

    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="Invalid Supabase user session.")

    return user


def require_supabase_user(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    return verify_supabase_user(authorization)


def optional_supabase_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[Dict[str, Any]]:
    """Allow the existing demo request only when no Authorization header exists."""
    if authorization is None:
        return None

    return verify_supabase_user(authorization)
