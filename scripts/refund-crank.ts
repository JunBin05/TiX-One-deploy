/**
 * TiX-One Refund Crank
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated batch refund script for expired waitlists.
 *
 * Run after a concert has started to refund all remaining waitlist deposits.
 * Processes in batches of 50 to stay within gas limits.
 *
 * Usage:
 *   npx tsx scripts/refund-crank.ts <waitlistObjectId>
 *
 * Required env vars (set in .env.local or export before running):
 *   ADMIN_SECRET_KEY  — Base64-encoded Ed25519 private key of the admin wallet
 *   SUI_RPC_URL       — (optional) Override RPC. Defaults to OneChain testnet.
 *
 * Example:
 *   ADMIN_SECRET_KEY="AAAA...==" npx tsx scripts/refund-crank.ts 0xabc123...
 */

import "dotenv/config";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// ── Constants ────────────────────────────────────────────────────────────────
const PACKAGE_ID =
  "0x9ee406ce3b3541cd795a05585460d70fbc86ec79108b7f08391c265756d6613b";
const ADMIN_CAP_ID =
  "0x530587df89444483823cb8ce41e7679c11a077c7db8371a831c22e18a878d0c3";
const CLOCK_OBJECT_ID = "0x6";
const ONECHAIN_RPC = "https://rpc-testnet.onelabs.cc:443";
const BATCH_SIZE = 50n;

// ── Setup ────────────────────────────────────────────────────────────────────
const secretKeyB64 = process.env.ADMIN_SECRET_KEY;
if (!secretKeyB64) {
  console.error("❌  ADMIN_SECRET_KEY env var is not set.");
  process.exit(1);
}

const waitlistObjectId = process.argv[2];
if (!waitlistObjectId || !waitlistObjectId.startsWith("0x")) {
  console.error("❌  Usage: npx tsx scripts/refund-crank.ts <waitlistObjectId>");
  process.exit(1);
}

const rpcUrl = process.env.SUI_RPC_URL ?? ONECHAIN_RPC;
const client = new SuiClient({ url: rpcUrl });
const keypair = Ed25519Keypair.fromSecretKey(
  Buffer.from(secretKeyB64, "base64")
);

console.log("🎫  TiX-One Refund Crank");
console.log("════════════════════════════════════════");
console.log(`📦  Package    : ${PACKAGE_ID}`);
console.log(`🔑  Admin      : ${keypair.toSuiAddress()}`);
console.log(`🌐  RPC        : ${rpcUrl}`);
console.log(`📋  Waitlist   : ${waitlistObjectId}`);
console.log("════════════════════════════════════════\n");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the on-chain Waitlist object and return the current queue length.
 * Returns -1 if the object cannot be read.
 */
async function getQueueLength(id: string): Promise<number> {
  try {
    const obj = await client.getObject({
      id,
      options: { showContent: true },
    });
    const fields = (obj.data?.content as any)?.fields;
    if (!fields) return -1;
    const queue = fields.queue;
    return Array.isArray(queue) ? queue.length : -1;
  } catch (e) {
    console.error("  ⚠  getObject failed:", e);
    return -1;
  }
}

/**
 * Build and execute one admin_batch_refund_waitlist PTB.
 */
async function runBatch(waitlistId: string): Promise<string | null> {
  const tx = new Transaction();
  tx.setGasBudget(200_000_000);

  tx.moveCall({
    target: `${PACKAGE_ID}::ticket::admin_batch_refund_waitlist`,
    arguments: [
      tx.object(ADMIN_CAP_ID),       // &AdminCap
      tx.object(waitlistId),          // &mut Waitlist
      tx.pure.u64(BATCH_SIZE),        // batch_size: u64
      tx.object(CLOCK_OBJECT_ID),     // &Clock
    ],
  });

  try {
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    const receipt = await client.waitForTransaction({
      digest: result.digest,
      options: { showEffects: true },
    });

    if (receipt.effects?.status?.status === "success") {
      return result.digest;
    }

    console.error(
      "  ⚠  Transaction failed:",
      receipt.effects?.status?.error ?? "unknown"
    );
    return null;
  } catch (e: any) {
    console.error("  ⚠  Execution error:", e?.message ?? e);
    return null;
  }
}

// ── Main Loop ────────────────────────────────────────────────────────────────

async function main() {
  let batchNum = 1;

  while (true) {
    const queueLen = await getQueueLength(waitlistObjectId);

    if (queueLen === -1) {
      console.error("❌  Could not read waitlist. Aborting.");
      process.exit(1);
    }

    if (queueLen === 0) {
      console.log("✅  Queue is empty — all refunds complete!\n");
      break;
    }

    console.log(
      `🔄  Batch #${batchNum}: ${queueLen} remaining — refunding up to ${BATCH_SIZE}…`
    );

    const digest = await runBatch(waitlistObjectId);

    if (!digest) {
      console.error("❌  Batch failed. Stopping to avoid double-refunds.");
      process.exit(1);
    }

    const refunded = Math.min(queueLen, Number(BATCH_SIZE));
    const remaining = queueLen - refunded;
    console.log(
      `  ✓  Batch #${batchNum} done | tx: ${digest} | ~${remaining} remaining\n`
    );

    batchNum++;

    // Small delay between batches to avoid rate-limiting
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("🎉  Refund crank finished successfully.");
}

main().catch((e) => {
  console.error("❌  Fatal error:", e);
  process.exit(1);
});
