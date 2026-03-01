import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { PopBackground } from "../components/PopBackground";
import { AuthButtons } from "../components/AuthButtons";
import {
  useAdminConcert,
  type ConcertFormData,
} from "../onechain/useAdminConcert";
import {
  Music,
  MapPin,
  Image,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Ticket,
  ListOrdered,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  idle: "",
  tx_concert: "Creating concert on blockchain…",
  tx_waitlist: "Creating waitlist on blockchain…",
  saving: "Saving to database…",
  done: "All done!",
  error: "Something went wrong.",
};

const STEP_ORDER = ["tx_concert", "tx_waitlist", "saving", "done"];

function stepIndex(step: string) {
  return STEP_ORDER.indexOf(step);
}

// ─── Field component ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
function Field({ label, hint, required, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#e879f9",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: "#f472b6", marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: "#a78bfa", lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ─── Timezone badge (shown inside date/time sections) ───────────────────────

function TzBadge({ tzLabel }: { tzLabel: string }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(14,165,233,0.1)",
        border: "1px solid rgba(14,165,233,0.3)",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        color: "#7dd3fc",
      }}
    >
      <span style={{ fontSize: 15 }}>🕐</span>
      <span>
        All times you enter here are in your <strong style={{ color: "#bae6fd" }}>local timezone: {tzLabel}</strong>.
        They are automatically converted to UTC before saving.
      </span>
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(88,28,135,0.25)",
        border: "1px solid rgba(236,72,153,0.2)",
        borderRadius: 16,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "#e879f9" }}>{icon}</span>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            textShadow: "0 0 10px rgba(236,72,153,0.5)",
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1.5px solid rgba(168,85,247,0.35)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 100,
  fontFamily: "inherit",
};

// ─── Clipboard helper ─────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? "#34d399" : "#a78bfa",
        padding: "2px 4px",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ─── Deploy overlay ───────────────────────────────────────────────────────────

function DeployOverlay({
  step,
  error,
  result,
  onReset,
  onGoHome,
}: {
  step: string;
  error: string;
  result: { concertObjectId: string; waitlistObjectId: string } | null;
  onReset: () => void;
  onGoHome: () => void;
}) {
  const isDone = step === "done";
  const isError = step === "error";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 24,
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(88,28,135,0.9) 0%, rgba(30,27,75,0.95) 100%)",
          border: "1.5px solid rgba(236,72,153,0.35)",
          borderRadius: 20,
          padding: "40px 36px",
          maxWidth: 500,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          boxShadow: "0 0 60px rgba(236,72,153,0.2)",
        }}
      >
        {/* Status icon */}
        {isDone ? (
          <CheckCircle size={56} color="#34d399" />
        ) : isError ? (
          <AlertCircle size={56} color="#f87171" />
        ) : (
          <Loader2
            size={56}
            color="#e879f9"
            style={{ animation: "spin 1s linear infinite" }}
          />
        )}

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 8px",
            }}
          >
            {isDone
              ? "Concert Created! 🎉"
              : isError
              ? "Error Occurred"
              : "Deploying…"}
          </h2>
          {!isDone && (
            <p style={{ fontSize: 14, color: "#c4b5fd", margin: 0 }}>
              {STEP_LABELS[step] || "Please wait…"}
            </p>
          )}
        </div>

        {/* Progress steps */}
        {!isError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: "100%",
            }}
          >
            {[
              {
                key: "tx_concert",
                label: "Create concert on-chain",
                icon: <Ticket size={14} />,
              },
              {
                key: "tx_waitlist",
                label: "Create waitlist on-chain",
                icon: <ListOrdered size={14} />,
              },
              {
                key: "saving",
                label: "Save to database",
                icon: <Sparkles size={14} />,
              },
            ].map(({ key, label, icon }) => {
              const current = step === key;
              const done = stepIndex(step) > stepIndex(key);
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: current
                      ? "rgba(236,72,153,0.15)"
                      : done
                      ? "rgba(52,211,153,0.08)"
                      : "rgba(255,255,255,0.04)",
                    border: current
                      ? "1px solid rgba(236,72,153,0.4)"
                      : done
                      ? "1px solid rgba(52,211,153,0.25)"
                      : "1px solid rgba(255,255,255,0.05)",
                    transition: "all 0.3s",
                  }}
                >
                  <span
                    style={{
                      color: done
                        ? "#34d399"
                        : current
                        ? "#e879f9"
                        : "#6b7280",
                    }}
                  >
                    {done ? <CheckCircle size={14} /> : current ? (
                      <Loader2
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : icon}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: done ? "#34d399" : current ? "#fff" : "#6b7280",
                      fontWeight: current ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Error message */}
        {isError && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#fca5a5",
              fontSize: 13,
              width: "100%",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Done: show IDs */}
        {isDone && result && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { label: "Concert Object ID", value: result.concertObjectId },
              { label: "Waitlist Object ID", value: result.waitlistObjectId },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  border: "1px solid rgba(168,85,247,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#a78bfa",
                    marginBottom: 4,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <code
                    style={{
                      fontSize: 11,
                      color: "#e879f9",
                      wordBreak: "break-all",
                      flex: 1,
                    }}
                  >
                    {value}
                  </code>
                  <CopyButton text={value} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {(isDone || isError) && (
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            {isError && (
              <button
                onClick={onReset}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: "rgba(168,85,247,0.2)",
                  border: "1.5px solid rgba(168,85,247,0.4)",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Try Again
              </button>
            )}
            <button
              onClick={onGoHome}
              style={{
                flex: 1,
                padding: "12px 0",
                background:
                  "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {isDone ? "View Homepage" : "Back to Form"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreateConcert() {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const { step, error, result, createConcertAndWaitlist, reset } =
    useAdminConcert();

  // ── Form state ─────────────────────────────────────────────────────────────
  // Detect browser timezone for display in hints
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Asia/Kuala_Lumpur"
  const tzOffset = -new Date().getTimezoneOffset(); // e.g. 480 for MYT
  const tzLabel = `${tzName} (UTC${tzOffset >= 0 ? "+" : ""}${tzOffset / 60})`;

  // Default concert date = 30 days from now using LOCAL date (not UTC .toISOString)
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();
  const defaultTime = "20:00";

  // Default waitlist expiry = same as concert date/time
  const makeDefaultExpiry = (date: string, time: string) =>
    `${date}T${time}`;

  const [form, setForm] = useState<ConcertFormData>({
    artist: "",
    title: "",
    genre: "",
    date: defaultDate,
    time: defaultTime,
    maxTickets: "100",
    priceOct: "0.05",
    venue: "",
    location: "",
    region: "",
    artistOrigin: "",
    posterUrl: "",
    description: "",
    waitlistPriceOct: "0.05",
    waitlistExpiresAt: makeDefaultExpiry(defaultDate, defaultTime),
    publicSaleTime: "",
    fanSaleTime: "",
  });

  const [formError, setFormError] = useState("");

  const set = (key: keyof ConcertFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Auto-sync waitlist expiry when date/time changes
        if (key === "date" || key === "time") {
          next.waitlistExpiresAt = makeDefaultExpiry(
            key === "date" ? value : prev.date,
            key === "time" ? value : prev.time
          );
        }
        // Auto-sync waitlist price when ticket price changes
        if (key === "priceOct") {
          next.waitlistPriceOct = value;
        }
        return next;
      });
    };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const required: Array<[keyof ConcertFormData, string]> = [
      ["artist", "Artist name"],
      ["title", "Concert title"],
      ["genre", "Genre"],
      ["date", "Date"],
      ["time", "Time"],
      ["maxTickets", "Max tickets"],
      ["priceOct", "Ticket price"],
      ["venue", "Venue"],
      ["location", "Location"],
      ["region", "Region"],
      ["artistOrigin", "Artist origin"],
      ["description", "Description"],
      ["waitlistExpiresAt", "Waitlist expiry"],
    ];
    for (const [key, label] of required) {
      if (!form[key]?.toString().trim()) {
        setFormError(`${label} is required.`);
        return false;
      }
    }
    if (isNaN(parseFloat(form.priceOct)) || parseFloat(form.priceOct) <= 0) {
      setFormError("Ticket price must be a positive number.");
      return false;
    }
    if (isNaN(parseInt(form.maxTickets)) || parseInt(form.maxTickets) < 1) {
      setFormError("Max tickets must be at least 1.");
      return false;
    }
    const expiryMs = new Date(form.waitlistExpiresAt).getTime();
    if (isNaN(expiryMs) || expiryMs <= Date.now()) {
      setFormError("Waitlist expiry must be in the future.");
      return false;
    }
    setFormError("");
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createConcertAndWaitlist(form);
  };

  const showOverlay = step !== "idle";

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!currentAccount) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <PopBackground />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 20,
            padding: 24,
            textAlign: "center",
          }}
        >
          <Ticket size={48} color="#e879f9" />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>
            Connect your wallet
          </h1>
          <p style={{ color: "#a78bfa", fontSize: 15, margin: 0 }}>
            Connect your OneWallet to create a concert.
          </p>
          <AuthButtons />
          <Link to="/" style={{ color: "#e879f9", fontSize: 13 }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <PopBackground />

      {/* Deploy overlay */}
      {showOverlay && (
        <DeployOverlay
          step={step}
          error={error}
          result={result}
          onReset={reset}
          onGoHome={() => (step === "done" ? navigate("/") : reset())}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 800,
          margin: "0 auto",
          padding: "24px 16px 80px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/" style={{ color: "#a78bfa", display: "flex" }}>
              <ChevronLeft size={22} />
            </Link>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  margin: 0,
                  textShadow: "0 0 20px rgba(236,72,153,0.6)",
                }}
              >
                Create Concert
              </h1>
              <p style={{ fontSize: 12, color: "#a78bfa", margin: 0 }}>
                Organiser Dashboard
              </p>
            </div>
          </div>
          <AuthButtons />
        </div>

        {/* Info banner */}
        <div
          style={{
            background: "rgba(168,85,247,0.1)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Sparkles size={16} color="#a78bfa" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#c4b5fd", margin: 0, lineHeight: 1.5 }}>
            Filling in this form will deploy your concert and waitlist directly
            to the blockchain — no code needed. You will need to approve{" "}
            <strong style={{ color: "#fff" }}>2 wallet transactions</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Concert Info ────────────────────────────────────────────── */}
            <Section icon={<Music size={18} />} title="Concert Info">
              <Field label="Artist Name" required>
                <input
                  style={inputStyle}
                  placeholder="e.g. Taylor Swift"
                  value={form.artist}
                  onChange={set("artist")}
                />
              </Field>

              <Field label="Concert Title" required>
                <input
                  style={inputStyle}
                  placeholder="e.g. The Eras Tour 2026"
                  value={form.title}
                  onChange={set("title")}
                />
              </Field>

              <Field label="Genre" required>
                <input
                  style={inputStyle}
                  placeholder="e.g. Pop / EDM / Jazz"
                  value={form.genre}
                  onChange={set("genre")}
                />
              </Field>

              <Field label="Concert Date" required>
                <input
                  style={inputStyle}
                  type="date"
                  value={form.date}
                  onChange={set("date")}
                />
              </Field>

              <Field label="Start Time (Local)" required hint="Enter the local start time at the venue.">
                <input
                  style={inputStyle}
                  type="time"
                  value={form.time}
                  onChange={set("time")}
                />
              </Field>

              <Field
                label="Max Ticket Supply"
                required
                hint="Total tickets available for purchase."
              >
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={form.maxTickets}
                  onChange={set("maxTickets")}
                />
              </Field>

              <Field
                label="Ticket Price (OCT)"
                required
                hint="e.g. 0.05 = 5 cents. This also sets the waitlist deposit."
              >
                <input
                  style={inputStyle}
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.05"
                  value={form.priceOct}
                  onChange={set("priceOct")}
                />
              </Field>
            </Section>

            {/* ── Venue ───────────────────────────────────────────────────── */}
            <Section icon={<MapPin size={18} />} title="Venue & Location">
              <Field label="Venue Name" required>
                <input
                  style={inputStyle}
                  placeholder="e.g. Madison Square Garden"
                  value={form.venue}
                  onChange={set("venue")}
                />
              </Field>

              <Field
                label="City & Country"
                required
                hint='e.g. "New York, NY" or "Kuala Lumpur, Malaysia"'
              >
                <input
                  style={inputStyle}
                  placeholder="Kuala Lumpur, Malaysia"
                  value={form.location}
                  onChange={set("location")}
                />
              </Field>

              <Field
                label="Region"
                required
                hint='Used for filtering. e.g. "Southeast Asia" or "United States"'
              >
                <input
                  style={inputStyle}
                  placeholder="Southeast Asia"
                  value={form.region}
                  onChange={set("region")}
                />
              </Field>

              <Field label="Artist Origin" required hint="Country the artist is from.">
                <input
                  style={inputStyle}
                  placeholder="Malaysia"
                  value={form.artistOrigin}
                  onChange={set("artistOrigin")}
                />
              </Field>
            </Section>

            {/* ── Media ───────────────────────────────────────────────────── */}
            <Section icon={<Image size={18} />} title="Media & Description">
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Poster Image URL"
                  hint="Paste a direct image link (JPEG/PNG). Leave blank to use a default."
                >
                  <input
                    style={inputStyle}
                    type="url"
                    placeholder="https://images.unsplash.com/…"
                    value={form.posterUrl}
                    onChange={set("posterUrl")}
                  />
                </Field>
              </div>

              {/* Preview */}
              {form.posterUrl && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <img
                    src={form.posterUrl}
                    alt="Poster preview"
                    style={{
                      width: "100%",
                      maxHeight: 240,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid rgba(168,85,247,0.3)",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description" required>
                  <textarea
                    style={textareaStyle}
                    placeholder="Describe the concert experience — what attendees can expect, special features, etc."
                    value={form.description}
                    onChange={set("description")}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Sale Schedule ──────────────────────────────────────────────────── */}
            <Section icon={<Clock size={18} />} title="Sale Schedule">
              <TzBadge tzLabel={tzLabel} />
              <Field
                label="Fan Presale Opens"
                hint="Optional. Leave blank to default to 14 days 5 min before concert."
              >
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.fanSaleTime}
                  onChange={set("fanSaleTime")}
                />
              </Field>
              <Field
                label="Public Sale Opens"
                hint="Optional. Leave blank to default to 14 days before concert."
              >
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.publicSaleTime}
                  onChange={set("publicSaleTime")}
                />
              </Field>
            </Section>

            {/* ── Waitlist ─────────────────────────────────────────────────── */}
            <Section icon={<Clock size={18} />} title="Waitlist Settings">              <TzBadge tzLabel={tzLabel} />              <Field
                label="Waitlist Deposit (OCT)"
                required
                hint="Amount fans must deposit to join the waitlist. Usually the same as the ticket price."
              >
                <input
                  style={inputStyle}
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={form.waitlistPriceOct}
                  onChange={set("waitlistPriceOct")}
                />
              </Field>

              <Field
                label="Waitlist Expiry"
                required
                hint="Usually the concert start time. Fans can claim refunds once this passes."
              >
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.waitlistExpiresAt}
                  onChange={set("waitlistExpiresAt")}
                />
              </Field>
            </Section>

            {/* ── Error ────────────────────────────────────────────────────── */}
            {formError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#fca5a5",
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "16px 0",
                background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                border: "none",
                borderRadius: 14,
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 4px 24px rgba(219,39,119,0.35)",
                letterSpacing: "0.02em",
                transition: "opacity 0.2s",
              }}
            >
              🚀 Deploy Concert to Blockchain
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "#6b7280",
                marginTop: -12,
              }}
            >
              You will be prompted to sign 2 transactions in your wallet.
            </p>
          </div>
        </form>
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
