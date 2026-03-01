import { ConcertCard } from "../components/ConcertCard";
import { Pagination } from "../components/Pagination";
import { AuthButtons } from "../components/AuthButtons";
import { PopBackground } from "../components/PopBackground";
import { useConcerts } from "../hooks/useConcerts";
import { Ticket, Filter, ChevronDown, User, ShieldCheck, Store } from "lucide-react";
import { Link } from "react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useAuth } from "../context/AuthContext";

const CONCERTS_PER_PAGE = 6;

export default function Home() {
  const currentAccount = useCurrentAccount();
  const { fanScores, storeFanScores } = useAuth();
  const { concerts, loading: concertsLoading } = useConcerts();

  // Read ?fan_scores=1:72,2:0,... injected by Spotify OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('fan_scores');
    if (raw) {
      storeFanScores(raw);
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openDropdown, setOpenDropdown] = useState<"account" | "admin" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDropdown = (name: "account" | "admin") =>
    setOpenDropdown((prev) => (prev === name ? null : name));

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedArtistOrigin, setSelectedArtistOrigin] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Parse the full concert datetime from separate date + time fields
  // e.g. "March 1, 2026" + "8:00 PM" → Date object at exactly that local time
  const concertDateTime = (c: { date: string; time?: string }) =>
    new Date(`${c.date}${c.time ? ` ${c.time}` : ""}`);

  // Start of today (local) — used for dropdown filter building
  const now = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const months = useMemo(() => {
    const uniqueMonths = new Set(
      concerts
        .filter((c) => new Date(c.date) >= now)
        .map((concert) => {
          const date = new Date(concert.date);
          return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        })
    );
    return Array.from(uniqueMonths).sort();
  }, [concerts, now]);

  const regions = useMemo(() => {
    const uniqueRegions = new Set(concerts.filter((c) => new Date(c.date) >= now).map((concert) => concert.region));
    return Array.from(uniqueRegions).sort();
  }, [concerts, now]);

  const artistOrigins = useMemo(() => {
    const uniqueOrigins = new Set(concerts.filter((c) => new Date(c.date) >= now).map((concert) => concert.artistOrigin));
    return Array.from(uniqueOrigins).sort();
  }, [concerts, now]);

  // Filter concerts — hide any concert whose date+time has already passed
  const filteredConcerts = useMemo(() => {
    const rightNow = new Date();
    return concerts.filter((concert: any) => {
      if (concertDateTime(concert) < rightNow) return false; // hide past concerts

      const concertMonth = new Date(concert.date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const monthMatch = selectedMonth === "all" || concertMonth === selectedMonth;
      const regionMatch = selectedRegion === "all" || concert.region === selectedRegion;
      const originMatch =
        selectedArtistOrigin === "all" || concert.artistOrigin === selectedArtistOrigin;

      return monthMatch && regionMatch && originMatch;
    });
  }, [concerts, selectedMonth, selectedRegion, selectedArtistOrigin]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredConcerts.length / CONCERTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CONCERTS_PER_PAGE;
  const endIndex = startIndex + CONCERTS_PER_PAGE;
  const currentConcerts = filteredConcerts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    if (filterType === "month") setSelectedMonth(value);
    if (filterType === "region") setSelectedRegion(value);
    if (filterType === "origin") setSelectedArtistOrigin(value);
  };

  const activeFiltersCount = [selectedMonth, selectedRegion, selectedArtistOrigin].filter(
    (f) => f !== "all"
  ).length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Pop Art Interactive Background */}
      <PopBackground />
      
      {/* Animated Concert Lights Background */}
      <div className="concert-lights" />
      
      {/* Dynamic gradient background with animation */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 animate-lights -z-10" />

      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md shadow-lg border-b border-pink-500/50 neon-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg shadow-lg neon-border">
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl text-white neon-text">Tix-One Ticketing</h1>
                <p className="text-xs sm:text-sm text-pink-300">Blockchain-Powered Ticketing</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2" ref={dropdownRef}>

              {/* My Account dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("account")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-900/50 border-2 border-pink-500/40 text-white hover:bg-purple-800/60 hover:border-pink-400 transition-all text-sm neon-border"
                >
                  <User size={14} />
                  My Account
                  <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: openDropdown === "account" ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {openDropdown === "account" && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "rgba(15,10,40,0.97)", border: "1.5px solid rgba(236,72,153,0.35)",
                    borderRadius: 10, minWidth: 160, zIndex: 100,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
                  }}>
                    <Link to="/my-ticket" onClick={() => setOpenDropdown(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
                        color: "#e2e8f0", fontSize: 14, textDecoration: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                      className="hover:bg-purple-800/40"
                    >
                      🎟️ My Tickets
                    </Link>
                    <Link to="/my-waitlists" onClick={() => setOpenDropdown(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
                        color: "#e2e8f0", fontSize: 14, textDecoration: "none" }}
                      className="hover:bg-purple-800/40"
                    >
                      ⏳ My Waitlists
                    </Link>
                  </div>
                )}
              </div>

              {/* Marketplace */}
              <Link
                to="/marketplace"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-900/50 border-2 border-pink-500/40 text-white hover:bg-purple-800/60 hover:border-pink-400 transition-all text-sm neon-border"
              >
                <Store size={14} />
                Marketplace
              </Link>

              {/* Admin dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("admin")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-900/50 border-2 border-pink-500/40 text-white hover:bg-purple-800/60 hover:border-pink-400 transition-all text-sm neon-border"
                >
                  <ShieldCheck size={14} />
                  Admin
                  <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: openDropdown === "admin" ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {openDropdown === "admin" && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "rgba(15,10,40,0.97)", border: "1.5px solid rgba(236,72,153,0.35)",
                    borderRadius: 10, minWidth: 170, zIndex: 100,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
                  }}>
                    <Link to="/create-concert" onClick={() => setOpenDropdown(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
                        color: "#e2e8f0", fontSize: 14, textDecoration: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                      className="hover:bg-purple-800/40"
                    >
                      🎵 Create Concert
                    </Link>
                    <Link to="/scanner" onClick={() => setOpenDropdown(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
                        color: "#e2e8f0", fontSize: 14, textDecoration: "none" }}
                      className="hover:bg-purple-800/40"
                    >
                      📷 Scanner
                    </Link>
                  </div>
                )}
              </div>

              <AuthButtons />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl text-white mb-4 neon-text">Upcoming Concerts</h2>
          <p className="text-base md:text-lg text-pink-200 max-w-2xl mx-auto">
            Secure your tickets on the blockchain. Each ticket is a unique NFT, ensuring
            authenticity and preventing fraud.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 backdrop-blur-sm border-2 border-pink-500 text-white rounded-lg hover:bg-purple-800/60 hover:border-pink-400 transition-all shadow-lg neon-border"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs rounded-full neon-border">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSelectedMonth("all");
                  setSelectedRegion("all");
                  setSelectedArtistOrigin("all");
                  setCurrentPage(1);
                }}
                className="text-sm text-pink-300 hover:text-pink-100 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="bg-purple-900/40 backdrop-blur-md rounded-xl p-6 shadow-2xl border-2 border-pink-500/50 neon-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Month Filter */}
                <div>
                  <label className="block text-sm text-pink-200 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleFilterChange("month", e.target.value)}
                    className="w-full px-4 py-2 bg-purple-950/50 border-2 border-pink-500/50 text-white rounded-lg focus:border-pink-400 focus:outline-none backdrop-blur-sm"
                  >
                    <option value="all">All Months</option>
                    {months.map((month) => (
                      <option key={month} value={month} className="bg-purple-950">
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="block text-sm text-pink-200 mb-2">Region</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => handleFilterChange("region", e.target.value)}
                    className="w-full px-4 py-2 bg-purple-950/50 border-2 border-pink-500/50 text-white rounded-lg focus:border-pink-400 focus:outline-none backdrop-blur-sm"
                  >
                    <option value="all">All Regions</option>
                    {regions.map((region) => (
                      <option key={region} value={region} className="bg-purple-950">
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Artist Origin Filter */}
                <div>
                  <label className="block text-sm text-pink-200 mb-2">Artist Origin</label>
                  <select
                    value={selectedArtistOrigin}
                    onChange={(e) => handleFilterChange("origin", e.target.value)}
                    className="w-full px-4 py-2 bg-purple-950/50 border-2 border-pink-500/50 text-white rounded-lg focus:border-pink-400 focus:outline-none backdrop-blur-sm"
                  >
                    <option value="all">All Origins</option>
                    {artistOrigins.map((origin) => (
                      <option key={origin} value={origin} className="bg-purple-950">
                        {origin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-pink-300">
            Showing {currentConcerts.length} of {filteredConcerts.length} concerts
          </p>
        </div>

        {/* Concert Grid */}
        {concertsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-pink-500/20 bg-purple-900/30 animate-pulse h-80" />
            ))}
          </div>
        ) : currentConcerts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {currentConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  fanScore={fanScores[concert.id]}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-purple-900/30 backdrop-blur-sm rounded-2xl border-2 border-pink-500/30 neon-border">
            <p className="text-lg text-pink-200 mb-4">No concerts found matching your filters.</p>
            <button
              onClick={() => {
                setSelectedMonth("all");
                setSelectedRegion("all");
                setSelectedArtistOrigin("all");
                setCurrentPage(1);
              }}
              className="text-pink-300 hover:text-pink-100 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black/60 backdrop-blur-md text-white mt-16 border-t-2 border-pink-500/50 neon-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-pink-300">
              © 2026 ChainTickets. Powered by OneChain blockchain technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}