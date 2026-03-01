import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Concert } from "../data/concerts";
import { Calendar, Clock, MapPin, Ticket, ShieldCheck } from "lucide-react";

interface ConcertCardProps {
  concert: Concert;
  fanScore?: number;
}

export function ConcertCard({ concert, fanScore }: ConcertCardProps) {
  const navigate = useNavigate();
  const isVerifiedFan = fanScore !== undefined && fanScore >= 60;

  // ── Live clock (ticks every second) ───────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Sale window logic ─────────────────────────────────────────────────
  // Use DB-specified times if set, otherwise fall back to 14-day hardcode
  const publicSaleTime = (() => {
    if ((concert as any).public_sale_time) return new Date((concert as any).public_sale_time).getTime();
    const d = new Date(concert.date);
    d.setUTCHours(10, 0, 0, 0);
    return d.getTime() - 14 * 24 * 60 * 60 * 1000;
  })();
  const fanSaleTime = (() => {
    if ((concert as any).fan_sale_time) return new Date((concert as any).fan_sale_time).getTime();
    return publicSaleTime - 5 * 60 * 1000;
  })();
  const fanSaleOpen    = currentTime >= fanSaleTime;
  const publicSaleOpen = currentTime >= publicSaleTime;

  const formatCountdown = (targetMs: number): string => {
    const diff = targetMs - currentTime;
    if (diff <= 0) return "";
    const days  = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins  = Math.floor((diff % 3_600_000) / 60_000);
    const secs  = Math.floor((diff % 60_000) / 1_000);
    if (days > 0)  return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Two separate countdown badges shown simultaneously
  const fanBadge = (() => {
    if (fanSaleOpen) return { label: "⚡ Fan Presale Open!", bg: "rgba(67,56,202,0.92)", border: "rgba(129,140,248,0.7)", color: "#e0e7ff", shadow: "0 0 14px rgba(99,102,241,0.6)" };
    const cd = formatCountdown(fanSaleTime);
    return cd ? { label: `⚡ Fan Presale: ${cd}`, bg: "rgba(49,40,180,0.88)", border: "rgba(129,140,248,0.5)", color: "#c7d2fe", shadow: "0 0 10px rgba(99,102,241,0.4)" } : null;
  })();

  const publicBadge = (() => {
    if (publicSaleOpen) return { label: "🎟 Public Sale Open!", bg: "rgba(157,23,77,0.92)", border: "rgba(236,72,153,0.7)", color: "#fce7f3", shadow: "0 0 14px rgba(236,72,153,0.6)" };
    const cd = formatCountdown(publicSaleTime);
    return cd ? { label: `🎟 Public Sale: ${cd}`, bg: "rgba(131,18,65,0.88)", border: "rgba(236,72,153,0.5)", color: "#fbcfe8", shadow: "0 0 10px rgba(236,72,153,0.4)" } : null;
  })();

  // If both open, collapse to single green badge
  const onSaleNow = fanSaleOpen && publicSaleOpen;

  const soldOut = concert.availableTickets === 0;
  const [btnHovered, setBtnHovered] = useState(false);

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/concert/${concert.id}#buy`);
    // Defer scroll so the page has time to render
    setTimeout(() => {
      document.getElementById("buy")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  return (
    <Link
      to={`/concert/${concert.id}`}
      className="group block bg-gradient-to-br from-purple-950/80 to-indigo-950/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:-translate-y-2 border-2 border-pink-500/50 neon-border hover:border-pink-400"
    >
      {/* ── Poster image ── */}
      <div className="relative h-64 md:h-72 overflow-hidden">
        <img
          src={concert.posterUrl}
          alt={`${concert.artist} - ${concert.title}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-transparent to-transparent opacity-60" />

        {/* Price pill */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm shadow-lg neon-border">
          {concert.price}
        </div>

        {/* Verified Fan badge */}
        {isVerifiedFan && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-green-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-green-400/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Fan
          </div>
        )}

        {/* Countdown badges — bottom of image */}
        {onSaleNow ? (
          <div style={{ position: "absolute", bottom: "12px", left: "12px", right: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(20,83,45,0.92)", border: "1px solid rgba(74,222,128,0.6)", color: "#dcfce7", boxShadow: "0 0 14px rgba(74,222,128,0.4)" }}>
            <Clock style={{ width: "13px", height: "13px", flexShrink: 0 }} />
            🟢 On Sale Now!
          </div>
        ) : (
          <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
            {fanBadge && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", backdropFilter: "blur(8px)", padding: "5px 10px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, background: fanBadge.bg, border: `1px solid ${fanBadge.border}`, color: fanBadge.color, boxShadow: fanBadge.shadow }}>
                <Clock style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                {fanBadge.label}
              </div>
            )}
            {publicBadge && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", backdropFilter: "blur(8px)", padding: "5px 10px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, background: publicBadge.bg, border: `1px solid ${publicBadge.border}`, color: publicBadge.color, boxShadow: publicBadge.shadow }}>
                <Clock style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                {publicBadge.label}
              </div>
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-pink-600/0 group-hover:bg-pink-600/10 transition-all duration-300" />
      </div>

      {/* ── Card body ── */}
      <div className="p-5 bg-gradient-to-br from-purple-900/60 to-indigo-900/60 border-t-2 border-pink-500/30">
        <div className="mb-2">
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md neon-border">
            {concert.genre}
          </span>
        </div>

        <h3 className="text-xl mb-1 text-white group-hover:text-pink-300 transition-colors">
          {concert.artist}
        </h3>
        <p className="text-base text-pink-200 mb-3">{concert.title}</p>

        <div className="space-y-2 text-sm text-purple-300 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-400" />
            <span>{concert.date} • {concert.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-400" />
            <span>{concert.venue}, {concert.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-pink-400" />
            <span>
              {soldOut ? (
                <span className="text-red-400 font-semibold">Sold Out</span>
              ) : (
                `${concert.availableTickets.toLocaleString()} tickets available`
              )}
            </span>
          </div>
        </div>

        {/* ── Quick Buy / Join Waitlist button ── */}
        <button
          onClick={handleQuickBuy}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            marginTop: "16px",
            width: "100%",
            background: soldOut
              ? btnHovered
                ? "linear-gradient(to right, #b91c1c, #dc2626)"
                : "linear-gradient(to right, #7f1d1d, #991b1b)"
              : btnHovered
                ? "linear-gradient(to right, #ec4899, #a855f7)"
                : "linear-gradient(to right, #db2777, #9333ea)",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            boxShadow: soldOut
              ? btnHovered
                ? "0 0 22px rgba(239,68,68,0.65), 0 0 40px rgba(239,68,68,0.25)"
                : "0 0 14px rgba(239,68,68,0.35)"
              : btnHovered
                ? "0 0 22px rgba(219,39,119,0.65), 0 0 40px rgba(168,85,247,0.25)"
                : "0 0 14px rgba(219,39,119,0.35)",
            transform: btnHovered ? "translateY(-2px)" : "translateY(0)",
            transition: "all 0.2s ease",
          }}
        >
          {soldOut ? "Sold Out — Join Waitlist" : "Buy Tickets"}
        </button>
      </div>
    </Link>
  );
}