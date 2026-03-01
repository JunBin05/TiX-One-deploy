import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { ArrowLeft } from "lucide-react";
import { useBuyTicket } from "../onechain/useBuyTicket";
import { useConcerts } from "../hooks/useConcerts";
import { fetchRefundRecords, insertRefundRecord } from "../lib/supabase";

interface MyWaitlistEntry {
  concertName: string;
  concertId: string;
  waitlistObjectId: string;
  position: number;
  depositAmountMist: string;
  concertDate?: string;
}

interface RefundRecord {
  concertName: string;
  depositAmountMist: string;
  digest: string;
  claimedAt: Date;
}

export default function MyWaitlistsPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  const { leaveWaitlist, claimWaitlistRefund } = useBuyTicket();
  const { concerts: allConcerts } = useConcerts();

  const formatMist = (mist: string): string => {
    const val = BigInt(mist);
    const whole = val / 1_000_000_000n;
    const frac = val % 1_000_000_000n;
    if (frac === 0n) return `${whole}`;
    // Remove trailing zeros, keep at least 2 decimal places
    const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  };

  const [myWaitlists, setMyWaitlists] = useState<MyWaitlistEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLeavingWaitlist, setIsLeavingWaitlist] = useState<string | null>(null);
  const autoClaimedRef = useRef<Set<string>>(new Set());

  // ── Refund records — loaded from Supabase, localStorage as fallback ──────────────
  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  const FALLBACK_KEY = (addr: string) => `tixone.refundRecords.v1:${addr}`;

  // Load from Supabase (or localStorage fallback) when wallet connects
  useEffect(() => {
    if (!currentAccount?.address) { setRefundRecords([]); return; }
    const addr = currentAccount.address;
    setRefundsLoading(true);
    fetchRefundRecords(addr).then((rows) => {
      if (rows.length > 0) {
        setRefundRecords(rows.map((r) => ({
          concertName: r.concert_name,
          depositAmountMist: r.deposit_amount_mist,
          digest: r.tx_digest,
          claimedAt: new Date(r.claimed_at),
        })));
      } else {
        // Fallback: migrate from localStorage if present
        try {
          const raw = localStorage.getItem(FALLBACK_KEY(addr));
          if (raw) {
            const local = (JSON.parse(raw) as any[]).map((r) => ({ ...r, claimedAt: new Date(r.claimedAt) }));
            setRefundRecords(local);
          }
        } catch { /* ignore */ }
      }
      setRefundsLoading(false);
    });
  }, [currentAccount?.address]);

  // ── Scan all concerts for this wallet's waitlist positions ────────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentAccount?.address || !allConcerts.length) {
        if (!cancelled) setMyWaitlists([]);
        return;
      }
      setIsScanning(true);
      const results: MyWaitlistEntry[] = [];
      const withWaitlist = allConcerts.filter((c) => c.waitlist_object_id);
      await Promise.all(
        withWaitlist.map(async (c) => {
          try {
            const obj = await suiClient.getObject({
              id: c.waitlist_object_id!,
              options: { showContent: true },
            });
            const fields = (obj.data?.content as any)?.fields;
            if (!Array.isArray(fields?.queue)) return;
            const queue = fields.queue as any[];
            const idx = queue.findIndex((entry: any) => {
              const buyer = entry?.fields?.buyer ?? entry?.buyer;
              return buyer === currentAccount.address;
            });
            if (idx >= 0) {
              const entry = queue[idx];
              const depositAmountMist = String(
                entry?.fields?.escrow_balance?.fields?.value ??
                  entry?.escrow_balance?.fields?.value ??
                  fields.face_value ??
                  "0"
              );
              results.push({
                concertName: c.title,
                concertId: c.id,
                waitlistObjectId: c.waitlist_object_id!,
                position: idx + 1,
                depositAmountMist,
                concertDate: c.date,
              });
            }
          } catch (e) {
            console.warn("[MyWaitlists] scan error", e);
          }
        })
      );
      if (!cancelled) {
        setMyWaitlists(results);
        setIsScanning(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentAccount?.address, suiClient, allConcerts]);

  // ── Leave waitlist early ──────────────────────────────────────────────────
  const leaveWaitlistHandler = async (waitlistObjectId: string) => {
    if (!currentAccount) return;
    setIsLeavingWaitlist(waitlistObjectId);
    const digest = await leaveWaitlist(waitlistObjectId);
    setIsLeavingWaitlist(null);
    if (digest) {
      setMyWaitlists((prev) => prev.filter((w) => w.waitlistObjectId !== waitlistObjectId));
    }
  };

  // ── Claim refund after expiry ─────────────────────────────────────────────
  const claimRefundHandler = async (waitlistObjectId: string) => {
    if (!currentAccount) return;
    setIsLeavingWaitlist(waitlistObjectId);
    const entry = myWaitlists.find((w) => w.waitlistObjectId === waitlistObjectId);
    const digest = await claimWaitlistRefund(waitlistObjectId);
    setIsLeavingWaitlist(null);
    if (digest && entry) {
      const claimedAt = new Date();
      setMyWaitlists((prev) => prev.filter((w) => w.waitlistObjectId !== waitlistObjectId));
      const newRecord: RefundRecord = {
        concertName: entry.concertName,
        depositAmountMist: entry.depositAmountMist,
        digest,
        claimedAt,
      };
      setRefundRecords((prev) => [newRecord, ...prev]);
      // Persist to Supabase (fire-and-forget)
      insertRefundRecord({
        wallet_address: currentAccount.address,
        concert_name: entry.concertName,
        deposit_amount_mist: entry.depositAmountMist,
        tx_digest: digest,
        claimed_at: claimedAt.toISOString(),
      });
    }
  };

  // ── Auto-trigger refund for expired entries on page load ──────────────────
  useEffect(() => {
    if (!currentAccount?.address || !myWaitlists.length) return;
    const now = new Date();
    const expired = myWaitlists.filter(
      (wl) =>
        wl.concertDate &&
        new Date(wl.concertDate) < now &&
        !autoClaimedRef.current.has(wl.waitlistObjectId)
    );
    if (!expired.length) return;
    expired.forEach((wl) => {
      autoClaimedRef.current.add(wl.waitlistObjectId);
      claimRefundHandler(wl.waitlistObjectId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWaitlists, currentAccount?.address]);

  const activeWaitlists = myWaitlists.filter(
    (wl) => !wl.concertDate || new Date(wl.concertDate) >= new Date()
  );
  const expiredWaitlists = myWaitlists.filter(
    (wl) => !!wl.concertDate && new Date(wl.concertDate) < new Date()
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 animate-lights -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-pink-500/50 bg-black/40 backdrop-blur-md neon-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-pink-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-white neon-text">My Waitlists</h1>
          <div />
        </div>
      </header>

      <div className="max-w-[760px] mx-auto px-4 py-8 sm:py-10 relative z-10">
        {!currentAccount ? (
          <div className="rounded-3xl border border-pink-500/50 bg-purple-900/40 neon-border backdrop-blur-md p-7 sm:p-8 shadow-[0_0_30px_rgba(236,72,153,0.15)] text-center">
            <h2 className="text-2xl font-bold text-white mb-2 neon-text">Connect your wallet</h2>
            <p className="text-pink-200 mb-6">Connect to see your waitlist positions.</p>
            <ConnectButton className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 border-none shadow-[0_0_15px_rgba(236,72,153,0.4)] text-white py-3 px-6 hover:from-pink-500 hover:to-purple-500 transition-colors font-bold" />
          </div>
        ) : isScanning ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4" />
            <p className="text-pink-200">Scanning waitlists…</p>
          </div>
        ) : (
          <>
            {/* ── ACTIVE WAITLISTS ── */}
            <section style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#a78bfa",
                    boxShadow: "0 0 8px #a78bfa",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                Active Waitlists
              </h2>

              {activeWaitlists.length === 0 ? (
                <div
                  style={{
                    background: "rgba(49,10,90,0.35)",
                    border: "1.5px dashed rgba(167,139,250,0.3)",
                    borderRadius: "16px",
                    padding: "28px",
                    textAlign: "center",
                    color: "#a78bfa",
                    fontSize: "0.9rem",
                  }}
                >
                  You're not in any active waitlists.{" "}
                  <Link to="/" style={{ color: "#f9a8d4", textDecoration: "underline" }}>
                    Browse concerts
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {activeWaitlists.map((wl) => {
                    const isBusy = isLeavingWaitlist === wl.waitlistObjectId;
                    return (
                      <div
                        key={wl.waitlistObjectId}
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(49,10,90,0.75), rgba(30,10,80,0.85))",
                          border: "2px solid rgba(167,139,250,0.5)",
                          borderRadius: "16px",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap" as const,
                          boxShadow: "0 0 16px rgba(139,92,246,0.2)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <p
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "1rem",
                              marginBottom: "6px",
                            }}
                          >
                            {wl.concertName}
                          </p>
                          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: "0.8rem", color: "#a78bfa" }}>
                              Position{" "}
                              <span style={{ color: "#fff", fontWeight: 700 }}>#{wl.position}</span>{" "}
                              in queue
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#a78bfa" }}>
                              Deposited{" "}
                              <span style={{ color: "#fcd34d", fontWeight: 700 }}>
                                {formatMist(wl.depositAmountMist)} OCT
                              </span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => leaveWaitlistHandler(wl.waitlistObjectId)}
                          disabled={isBusy}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(127,0,0,0.5), rgba(185,28,28,0.4))",
                            border: "1px solid rgba(239,68,68,0.5)",
                            borderRadius: "10px",
                            padding: "8px 18px",
                            color: "#fca5a5",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: isBusy ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap" as const,
                            opacity: isBusy ? 0.5 : 1,
                          }}
                        >
                          {isBusy ? "Leaving…" : "Leave Waitlist"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── EXPIRED — PENDING REFUND ── */}
            {expiredWaitlists.length > 0 && (
              <section style={{ marginBottom: "32px" }}>
                <h2
                  style={{
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#fbbf24",
                      boxShadow: "0 0 8px #fbbf24",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  Pending Refund
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {expiredWaitlists.map((wl) => {
                    const isBusy = isLeavingWaitlist === wl.waitlistObjectId;
                    return (
                      <div
                        key={wl.waitlistObjectId}
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(60,40,5,0.75), rgba(40,30,5,0.85))",
                          border: "2px solid rgba(251,191,36,0.4)",
                          borderRadius: "16px",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap" as const,
                          boxShadow: "0 0 16px rgba(251,191,36,0.1)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <p
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "1rem",
                              marginBottom: "6px",
                            }}
                          >
                            {wl.concertName}
                          </p>
                          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: "0.8rem", color: "#fcd34d" }}>
                              Concert ended — refund available
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#a78bfa" }}>
                              Deposited{" "}
                              <span style={{ color: "#fcd34d", fontWeight: 700 }}>
                                {formatMist(wl.depositAmountMist)} OCT
                              </span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => claimRefundHandler(wl.waitlistObjectId)}
                          disabled={isBusy}
                          style={{
                            background: isBusy
                              ? "rgba(5,150,105,0.2)"
                              : "linear-gradient(135deg, rgba(5,150,105,0.7), rgba(16,185,129,0.6))",
                            border: "1px solid rgba(52,211,153,0.6)",
                            borderRadius: "10px",
                            padding: "8px 18px",
                            color: "#6ee7b7",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: isBusy ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap" as const,
                            opacity: isBusy ? 0.6 : 1,
                            boxShadow: isBusy ? "none" : "0 0 12px rgba(52,211,153,0.35)",
                          }}
                        >
                          {isBusy ? "Claiming…" : "⚡ Claim Refund"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── REFUND HISTORY ── */}
            <section>
              <h2
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 8px #34d399",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                Refund History
              </h2>
              {refundsLoading ? (
                <div style={{ color: "#6ee7b7", fontSize: "0.88rem", padding: "12px 0" }}>Loading history…</div>
              ) : refundRecords.length === 0 ? (
                <div
                  style={{
                    background: "rgba(5,46,22,0.25)",
                    border: "1.5px dashed rgba(52,211,153,0.25)",
                    borderRadius: "16px",
                    padding: "24px",
                    textAlign: "center",
                    color: "#6ee7b7",
                    fontSize: "0.88rem",
                  }}
                >
                  No refunds yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {refundRecords.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(5,46,22,0.75), rgba(6,78,59,0.6))",
                        border: "2px solid rgba(52,211,153,0.4)",
                        borderRadius: "16px",
                        padding: "16px 20px",
                        boxShadow: "0 0 16px rgba(52,211,153,0.15)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap" as const,
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "1.3rem" }}>✅</span>
                          <div>
                            <p
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "1rem",
                                margin: 0,
                              }}
                            >
                              {r.concertName}
                            </p>
                            <p
                              style={{
                                color: "#6ee7b7",
                                fontSize: "0.78rem",
                                margin: "2px 0 0",
                              }}
                            >
                              Refunded at {r.claimedAt.toLocaleTimeString()} ·{" "}
                              {r.claimedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          style={{
                            color: "#fcd34d",
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          +{formatMist(r.depositAmountMist)} OCT
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                        }}
                      >
                        <span
                          style={{
                            color: "#6ee7b7",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          TX
                        </span>
                        <span
                          style={{
                            color: "#a7f3d0",
                            fontSize: "0.72rem",
                            fontFamily: "monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                            flex: 1,
                          }}
                        >
                          {r.digest}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(r.digest)}
                          title="Copy tx digest"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6ee7b7",
                            padding: "0 2px",
                            flexShrink: 0,
                            fontSize: "0.9rem",
                          }}
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
