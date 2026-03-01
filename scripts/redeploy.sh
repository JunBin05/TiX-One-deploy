#!/bin/bash
# =============================================================
# TiX-One Full Redeploy
# Run this whenever ticket.move is changed.
#
# What it does (in order):
#   1. Deploy the smart contract  → saves new IDs + patches config.ts
#   2. Create 15 Concert objects on-chain
#   3. Initialise the BackendVerifier with the Spotify public key
#   4. Create 15 Waitlist objects on-chain (with expires_at per concert)
#   5. Push all new on-chain IDs to Supabase automatically
#
# Usage:
#   bash scripts/redeploy.sh
# =============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          TiX-One Full Redeploy Pipeline              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Deploy contract ────────────────────────────────────────────────
echo "━━━  STEP 1/5 — Deploy contract  ━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/1-deploy.sh"

# ── Step 2: Seed Concert objects ───────────────────────────────────────────
echo "━━━  STEP 2/5 — Seed Concert objects  ━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/2-seed-concerts.sh"

# ── Step 3: Initialise BackendVerifier ────────────────────────────────────
echo "━━━  STEP 3/5 — Init BackendVerifier  ━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/3-init-verifier.sh"

# ── Step 4: Create Waitlist objects (with expires_at) ─────────────────────
echo "━━━  STEP 4/5 — Create Waitlist objects  ━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/4-init-waitlists.sh"

# ── Step 5: Push IDs to Supabase ──────────────────────────────────────────
echo "━━━  STEP 5/5 — Sync to Supabase  ━━━━━━━━━━━━━━━━━━━━━"
node "$SCRIPT_DIR/apply-supabase.mjs"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Full redeploy complete!                         ║"
echo "║                                                      ║"
echo "║  Next steps:                                         ║"
echo "║  • npm run dev   — start the frontend                ║"
echo "║  • cd backend/discord-squad && node server.js        ║"
echo "║    (only if you need the Squad Room feature)         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
