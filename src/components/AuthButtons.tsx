import { Music, LogOut, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

export function AuthButtons() {
  const { isSpotifyConnected, spotifyLoading, connectSpotify, disconnectSpotify } = useAuth();
  const currentAccount = useCurrentAccount();

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ConnectButton
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg ${
            currentAccount
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 neon-border"
              : "bg-purple-900/50 backdrop-blur-sm border-2 border-purple-500 text-white hover:bg-purple-800/60 hover:border-purple-400"
          }`}
        />

        {/* Main Spotify button: connect / re-check */}
        <button
          onClick={connectSpotify}
          disabled={spotifyLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg ${
            isSpotifyConnected
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              : "bg-green-900/50 backdrop-blur-sm border-2 border-green-500 text-white hover:bg-green-800/60 hover:border-green-400"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {spotifyLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Connecting…</span></>
          ) : isSpotifyConnected ? (
            <><RefreshCw className="w-4 h-4" /><span>Re-check Fan Status</span></>
          ) : (
            <><Music className="w-4 h-4" /><span>Connect Spotify</span></>
          )}
        </button>

        {/* Disconnect (only shown when connected) */}
        {isSpotifyConnected && (
          <button
            onClick={disconnectSpotify}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 hover:bg-red-900/50 text-xs transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        )}
      </div>
    </>
  );
}