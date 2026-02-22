import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isOneChainConnected: boolean;
  isSpotifyConnected: boolean;
  connectOneChain: () => void;
  connectSpotify: () => void;
  disconnectOneChain: () => void;
  disconnectSpotify: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isOneChainConnected, setIsOneChainConnected] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  const connectOneChain = () => {
    // Backend logic will be handled by teammates
    setIsOneChainConnected(true);
  };

  const connectSpotify = () => {
    // Backend logic will be handled by teammates
    setIsSpotifyConnected(true);
  };

  const disconnectOneChain = () => {
    setIsOneChainConnected(false);
  };

  const disconnectSpotify = () => {
    setIsSpotifyConnected(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isOneChainConnected,
        isSpotifyConnected,
        connectOneChain,
        connectSpotify,
        disconnectOneChain,
        disconnectSpotify,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
