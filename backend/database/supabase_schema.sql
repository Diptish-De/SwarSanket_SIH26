-- =====================================================================
-- SwarSanket Supabase PostgreSQL Database Schema
-- =====================================================================
-- Run this SQL in your Supabase Dashboard:
-- https://supabase.com/dashboard/project/<project-ref>/sql
-- =====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Recordings Table (Audio files and physical metrics)
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id VARCHAR(64) UNIQUE NOT NULL,
    patient_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512),
    supabase_storage_url TEXT,
    audio_format VARCHAR(32) NOT NULL,
    duration_seconds DOUBLE PRECISION,
    sample_rate INTEGER,
    number_of_channels INTEGER,
    file_size_bytes BIGINT NOT NULL,
    processing_status VARCHAR(32) DEFAULT 'uploaded' NOT NULL,
    prediction_status VARCHAR(64) DEFAULT 'not_started' NOT NULL,
    prediction_result JSONB,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Screenings Table (Quantum-Hybrid & Acoustic Screening Sessions)
-- Clinical decision-support screening aid, NOT a standalone medical diagnosis.
CREATE TABLE IF NOT EXISTS public.screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id VARCHAR(64) REFERENCES public.recordings(recording_id) ON DELETE SET NULL,
    patient_id UUID,
    session_id VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    model_name VARCHAR(128) DEFAULT 'SwarSanket Quantum-Classical Hybrid (PyTorch + 8-Qubit VQC)' NOT NULL,
    predicted_class INTEGER,
    probability DOUBLE PRECISION,
    probability_percent DOUBLE PRECISION,
    technical_confidence_percent DOUBLE PRECISION,
    uncertainty_std DOUBLE PRECISION,
    predictive_entropy DOUBLE PRECISION,
    risk_tier VARCHAR(64),
    status VARCHAR(64) DEFAULT 'completed' NOT NULL,
    transcription TEXT,
    audio_url TEXT,
    production_features JSONB,
    live_features JSONB,
    explanation JSONB,
    quantum_specs JSONB,
    raw_payload JSONB,
    notes TEXT
);

-- Safe migration for databases created before patient linkage was introduced.
ALTER TABLE public.recordings
    ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.screenings
    ADD COLUMN IF NOT EXISTS patient_id UUID;

-- 4. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_recordings_recording_id ON public.recordings(recording_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_recording_id ON public.screenings(recording_id);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_risk_tier ON public.screenings(risk_tier);
CREATE INDEX IF NOT EXISTS idx_recordings_patient_id ON public.recordings(patient_id);
CREATE INDEX IF NOT EXISTS idx_screenings_patient_id ON public.screenings(patient_id);

-- 4. Patient identity foundation
-- auth_user_id remains nullable while the current demo login is migrated to
-- Supabase Auth. Existing and demo profiles use the generated profile id.
CREATE TABLE IF NOT EXISTS public.patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    username VARCHAR(128),
    full_name VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age IS NULL OR (age > 0 AND age <= 120)),
    gender VARCHAR(64),
    phone VARCHAR(64),
    abha_id VARCHAR(128),
    caregiver_name VARCHAR(255),
    caregiver_phone VARCHAR(64),
    caregiver_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_auth_user_id
    ON public.patient_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_username
    ON public.patient_profiles(username);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'recordings_patient_id_fkey'
          AND conrelid = 'public.recordings'::regclass
    ) THEN
        ALTER TABLE public.recordings
            ADD CONSTRAINT recordings_patient_id_fkey
            FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'screenings_patient_id_fkey'
          AND conrelid = 'public.screenings'::regclass
    ) THEN
        ALTER TABLE public.screenings
            ADD CONSTRAINT screenings_patient_id_fkey
            FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patient_profiles_set_updated_at ON public.patient_profiles;
CREATE TRIGGER patient_profiles_set_updated_at
    BEFORE UPDATE ON public.patient_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Service role has full unrestricted access
DROP POLICY IF EXISTS "Service role full access on recordings" ON public.recordings;
CREATE POLICY "Service role full access on recordings"
    ON public.recordings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on screenings" ON public.screenings;
CREATE POLICY "Service role full access on screenings"
    ON public.screenings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on patient profiles" ON public.patient_profiles;
CREATE POLICY "Service role full access on patient profiles"
    ON public.patient_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Public Read Policies for Anon/Frontend access
DROP POLICY IF EXISTS "Allow anon read screenings" ON public.screenings;
DROP POLICY IF EXISTS "Allow anon read recordings" ON public.recordings;
DROP POLICY IF EXISTS "Patient reads own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patient inserts own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patient updates own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patient reads own screenings" ON public.screenings;
DROP POLICY IF EXISTS "Patient inserts own screenings" ON public.screenings;
DROP POLICY IF EXISTS "Patient reads own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Patient inserts own recordings" ON public.recordings;

CREATE POLICY "Patient reads own profile"
    ON public.patient_profiles
    FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "Patient inserts own profile"
    ON public.patient_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Patient updates own profile"
    ON public.patient_profiles
    FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Patient reads own screenings"
    ON public.screenings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.patient_profiles profile
            WHERE profile.id = screenings.patient_id
              AND profile.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Patient inserts own screenings"
    ON public.screenings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.patient_profiles profile
            WHERE profile.id = screenings.patient_id
              AND profile.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Patient reads own recordings"
    ON public.recordings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.patient_profiles profile
            WHERE profile.id = recordings.patient_id
              AND profile.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Patient inserts own recordings"
    ON public.recordings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.patient_profiles profile
            WHERE profile.id = recordings.patient_id
              AND profile.auth_user_id = auth.uid()
        )
    );

-- 8. Storage bucket confirmation (swarsanket-recordings)
INSERT INTO storage.buckets (id, name, public)
VALUES ('swarsanket-recordings', 'swarsanket-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policy allowing public download and service role upload (idempotent)
DROP POLICY IF EXISTS "Public Access SwarSanket Recordings" ON storage.objects;
CREATE POLICY "Public Access SwarSanket Recordings"
ON storage.objects FOR SELECT
USING ( bucket_id = 'swarsanket-recordings' );

DROP POLICY IF EXISTS "Service Role Upload SwarSanket Recordings" ON storage.objects;
CREATE POLICY "Service Role Upload SwarSanket Recordings"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'swarsanket-recordings' );

-- 9. Realtime Publication for mobile / web push subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;

