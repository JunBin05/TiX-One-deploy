-- ============================================================
-- TiX-One: Supabase Schema Setup
-- Run this ONCE in Supabase → SQL Editor BEFORE seeding.
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Your existing schema already has:
--   id TEXT, artist, title, date, time, venue, location, region,
--   "artistOrigin", price (TEXT e.g. "0.05 OCT"), "posterUrl",
--   description, "availableTickets" INTEGER, genre, lat, lon,
--   "airportCode", concert_object_id TEXT  ← already added ✅
-- ============================================================

-- concert_object_id is already added — skip it.

-- Add price in MIST so the frontend can pass it directly to the
-- smart contract without string parsing.
-- (1 OCT = 1_000_000_000 MIST)
ALTER TABLE concerts
  ADD COLUMN IF NOT EXISTS price_mist BIGINT DEFAULT 50000000;

-- Optional: index for faster lookups by artist
CREATE INDEX IF NOT EXISTS idx_concerts_artist ON concerts(artist);

-- Verify the final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'concerts'
ORDER BY ordinal_position;
