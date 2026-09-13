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

-- 4. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_recordings_recording_id ON public.recordings(recording_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_recording_id ON public.screenings(recording_id);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_risk_tier ON public.screenings(risk_tier);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;

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

-- 7. Public Read Policies for Anon/Frontend access
DROP POLICY IF EXISTS "Allow anon read screenings" ON public.screenings;
CREATE POLICY "Allow anon read screenings"
    ON public.screenings
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon read recordings" ON public.recordings;
CREATE POLICY "Allow anon read recordings"
    ON public.recordings
    FOR SELECT
    TO anon, authenticated
    USING (true);

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

