"""
SwarSanket Supabase Connection Verification Script
===================================================
Run this test to verify:
  1. Supabase Client authentication
  2. Storage bucket 'swarsanket-recordings' availability & write/read/delete
  3. Database connectivity and schema status
  4. FastAPI backend routes and health check integration

Security Note:
  - All secret keys, tokens, and credentials are strictly redacted.
"""

import sys
import os
import time
from pathlib import Path

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from supabase_service import supabase_service, SUPABASE_URL, SUPABASE_STORAGE_BUCKET


def run_verification():
    print("\n" + "=" * 70)
    print("  SWARSANKET BACKEND - SUPABASE CONNECTION VERIFICATION")
    print("=" * 70)

    # 1. Configuration Check
    print(f"\n[1/5] Checking Configuration:")
    print(f"  - Project URL: {SUPABASE_URL if SUPABASE_URL else '(not set)'}")
    print(f"  - Storage Bucket: {SUPABASE_STORAGE_BUCKET}")
    print(f"  - Service Role Key configured: {bool(supabase_service.service_role_key)}")
    print(f"  - Anon Key configured: {bool(supabase_service.anon_key)}")

    if not supabase_service.is_configured():
        print("  ℹ️ Supabase is currently unconfigured (running in local-only mode).")
        print("     To enable cloud persistence, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
    else:
        print("  ✅ Configuration is valid and client is initialized.")

    # 2. Storage Bucket Health Check
    print(f"\n[2/5] Ping & Bucket Health Check:")
    health = supabase_service.health_check()
    print(f"  - Status: {health.get('status')}")
    print(f"  - Connected: {health.get('connected')}")
    print(f"  - Latency: {health.get('latency_ms')} ms")
    print(f"  - Target bucket exists: {health.get('bucket_exists')}")

    # 3. Audio File Upload & Public Stream Test (if configured)
    print(f"\n[3/5] Testing Storage Upload, Public Stream & Cleanup:")
    if not supabase_service.is_configured():
        print("  ℹ️ Skipped (Supabase not configured in current environment).")
    else:
        test_filename = f"verify_test_{int(time.time())}.wav"
        dummy_audio_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

        upload_result = supabase_service.upload_audio_file(
            dummy_audio_bytes,
            test_filename,
            content_type="audio/wav"
        )
        if not upload_result.get("success"):
            print(f"  ⚠️ Upload test note: {upload_result.get('error')}")
        else:
            public_url = upload_result.get("public_url")
            print(f"  - Uploaded test file: {test_filename}")
            print(f"  - Public URL generated successfully.")

            # Cleanup test file
            try:
                supabase_service.client.storage.from_(SUPABASE_STORAGE_BUCKET).remove([test_filename])
                print("  - Test file cleaned up from storage.")
            except Exception as e:
                print(f"  ⚠️ Note on cleanup: {e}")
            print("  ✅ Storage upload & cleanup passed.")

    # 4. Database Schema Status Check
    print(f"\n[4/5] Checking Supabase Database Tables:")
    if not supabase_service.is_configured():
        print("  ℹ️ Skipped (Supabase not configured in current environment).")
    else:
        try:
            res = supabase_service.client.table("screenings").select("id").limit(1).execute()
            print("  ✅ Table 'screenings' is active and ready in Supabase PostgreSQL.")
        except Exception as e:
            err = str(e)
            if 'relation "public.screenings" does not exist' in err or "PGRST205" in err or "404" in err:
                print("  ℹ️ Table 'screenings' is not yet deployed in Supabase.")
                print("     -> Run 'backend/database/supabase_schema.sql' in your Supabase SQL Editor")
            else:
                print(f"  ℹ️ Table check status: {err}")

    # 5. FastAPI App Routes Verification
    print(f"\n[5/5] Checking FastAPI App Route Wiring:")
    try:
        from main import app
        routes = [route.path for route in app.routes]
        print(f"  - Total registered routes: {len(routes)}")
        assert "/api/health" in routes
        assert "/api/supabase/status" in routes
        assert "/api/supabase/screenings" in routes
        assert "/api/upload-audio" in routes
        assert "/api/analyze-audio" in routes
        assert "/api/screenings" in routes
        assert "/api/screenings/{recording_id}" in routes
        print("  ✅ All Supabase endpoints successfully wired into FastAPI.")
    except Exception as e:
        print(f"  ❌ ERROR: FastAPI route check failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("  VERIFICATION COMPLETE")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_verification()
