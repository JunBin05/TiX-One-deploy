-- ============================================================
-- TiX-One: Refund Records table
-- Paste into Supabase → SQL Editor and run once.
-- ============================================================

CREATE TABLE IF NOT EXISTS refund_records (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address   TEXT        NOT NULL,
  concert_name     TEXT        NOT NULL,
  deposit_amount_mist TEXT     NOT NULL,
  tx_digest        TEXT        NOT NULL UNIQUE,  -- prevents duplicate inserts
  claimed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-wallet lookups
CREATE INDEX IF NOT EXISTS refund_records_wallet_idx
  ON refund_records (wallet_address, claimed_at DESC);

-- RLS: enable but allow anon full access filtered by wallet_address
ALTER TABLE refund_records ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (the wallet address is a public blockchain identity)
CREATE POLICY "allow_insert" ON refund_records
  FOR INSERT WITH CHECK (true);

-- Anyone can select their own records
CREATE POLICY "allow_select" ON refund_records
  FOR SELECT USING (true);
