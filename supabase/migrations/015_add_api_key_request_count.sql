-- Migration 015: Add request_count to api_keys
-- Tracks cumulative API requests per key for usage display in the admin dashboard.

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS request_count bigint NOT NULL DEFAULT 0;
