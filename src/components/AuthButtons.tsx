import { Wallet, Music, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export function AuthButtons() {
  const { 
    isOneChainConnected, 
    isSpotifyConnected, 
    connectOneChain, 
    connectSpotify,
    disconnectOneChain,
    disconnectSpotify 
  } = useAuth();
  
  const [showOneChainModal, setShowOneChainModal] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);

  const handleOneChainClick = () => {
    if (isOneChainConnected) {
      disconnectOneChain();
    } else {
      setShowOneChainModal(true);
    }
  };

  const handleSpotifyClick = () => {
    if (isSpotifyConnected) {
      disconnectSpotify();
    } else {
      setShowSpotifyModal(true);
    }
  };

  const handleOneChainConnect = () => {
    connectOneChain();
    setShowOneChainModal(false);
  };

  const handleSpotifyConnect = () => {
    connectSpotify();
    setShowSpotifyModal(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleOneChainClick}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg ${
            isOneChainConnected
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 neon-border"
              : "bg-purple-900/50 backdrop-blur-sm border-2 border-purple-500 text-white hover:bg-purple-800/60 hover:border-purple-400"
          }`}
        >
          {isOneChainConnected ? (
            <>
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Connect OneWallet</span>
            </>
          )}
        </button>

        <button
          onClick={handleSpotifyClick}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg ${
            isSpotifyConnected
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              : "bg-green-900/50 backdrop-blur-sm border-2 border-green-500 text-white hover:bg-green-800/60 hover:border-green-400"
          }`}
        >
          {isSpotifyConnected ? (
            <>
              <LogOut className="w-4 h-4" />
              <span>Disconnect Spotify</span>
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              <span>Connect Spotify</span>
            </>
          )}
        </button>
      </div>

      {/* OneChain Modal */}
      {showOneChainModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-950 to-indigo-950 border-2 border-pink-500/50 neon-border rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-600/30 border-2 border-pink-500 neon-border rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-pink-300" />
              </div>
              <h3 className="text-2xl text-white mb-2 neon-text">
                Connect OneWallet
              </h3>
              <p className="text-base text-pink-300">
                Sign up or connect your OneChain OneWallet to access ticketing features
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleOneChainConnect}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 text-base shadow-lg neon-border"
              >
                Connect OneWallet
              </button>
              
              <button
                onClick={() => setShowOneChainModal(false)}
                className="w-full bg-purple-900/50 border-2 border-pink-500/50 text-white py-3 px-6 rounded-xl hover:bg-purple-800/60 hover:border-pink-400 transition-all duration-200 text-base neon-border"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-pink-400 text-center mt-4 bg-purple-950/30 rounded-lg p-2 border border-pink-500/30">
              Authentication will be handled by the backend
            </p>
          </div>
        </div>
      )}

      {/* Spotify Modal */}
      {showSpotifyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-950 to-indigo-950 border-2 border-green-500/50 rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600/30 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-green-300" />
              </div>
              <h3 className="text-2xl text-white mb-2 neon-text">
                Connect with Spotify
              </h3>
              <p className="text-base text-pink-300">
                Verify your fan status by connecting your Spotify account
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSpotifyConnect}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-base shadow-lg"
              >
                Connect Spotify
              </button>
              
              <button
                onClick={() => setShowSpotifyModal(false)}
                className="w-full bg-purple-900/50 border-2 border-pink-500/50 text-white py-3 px-6 rounded-xl hover:bg-purple-800/60 hover:border-pink-400 transition-all duration-200 text-base neon-border"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-pink-400 text-center mt-4 bg-purple-950/30 rounded-lg p-2 border border-pink-500/30">
              Authentication will be handled by the backend
            </p>
          </div>
        </div>
      )}
    </>
  );
}