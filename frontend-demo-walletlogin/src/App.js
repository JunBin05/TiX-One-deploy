import React, { useState, useEffect } from 'react';
import './App.css';
import {
    generateEphemeralKeyPair,
    buildGoogleOAuthUrl,
    parseJWTFromCallback,
    completeZkLogin,
    SessionStorage,
    generateNonceFromEphemeral,
} from './utils/zkLoginHelper';

function App() {
    const [authState, setAuthState] = useState('logged_out'); // logged_out | authenticating | logged_in
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);

    // Check for existing session on mount
    useEffect(() => {
        const savedUser = SessionStorage.load();
        if (savedUser) {
            setUserData(savedUser);
            setAuthState('logged_in');
        }
    }, []);

    // Handle OAuth callback
    useEffect(() => {
        const handleCallback = async () => {
            if (window.location.hash.includes('id_token')) {
                setAuthState('authenticating');

                try {
                    const jwt = parseJWTFromCallback();
                    const userData = await completeZkLogin(jwt);

                    SessionStorage.save(userData);
                    setUserData(userData);
                    setAuthState('logged_in');

                    // Clean up URL
                    window.history.replaceState({}, document.title, '/');
                } catch (err) {
                    setError(err.message);
                    setAuthState('logged_out');
                }
            }
        };

        handleCallback();
    }, []);

    // Initiate Google login
    const handleLogin = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;

        if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            alert('Please configure your Google OAuth Client ID in .env file');
            return;
        }

        // Generate ephemeral key
        const ephemeralData = generateEphemeralKeyPair();
        SessionStorage.saveEphemeralKey(ephemeralData);

        // Generate nonce
        const nonce = generateNonceFromEphemeral(ephemeralData);

        // Redirect to Google
        const oauthUrl = buildGoogleOAuthUrl(nonce, clientId, redirectUri);
        window.location.href = oauthUrl;
    };

    // Logout
    const handleLogout = () => {
        SessionStorage.clear();
        setUserData(null);
        setAuthState('logged_out');
    };

    // Render based on auth state
    return (
        <div className="App">
            {authState === 'logged_out' && (
                <div className="landing-page">
                    <div className="hero">
                        <h1>🎫 TiX-One</h1>
                        <p className="tagline">Smart Tickets for Humans</p>
                        <p className="subtitle">
                            Buy, sell, and trade tickets with blockchain-enforced fair pricing.
                            No scalpers, no middlemen.
                        </p>

                        <button onClick={handleLogin} className="login-button">
                            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                            Login with Google
                        </button>

                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            )}

            {authState === 'authenticating' && (
                <div className="authenticating">
                    <div className="loading-spinner"></div>
                    <h2>Creating your secure ticket vault...</h2>
                    <p>Deriving your Sui wallet from your Google account</p>
                </div>
            )}

            {authState === 'logged_in' && userData && (
                <div className="dashboard">
                    <div className="wallet-card">
                        <h2>Welcome, {userData.email}! 🎉</h2>

                        <div className="wallet-info">
                            <label>Your Sui Wallet Address:</label>
                            <div className="address-display">
                                <code>{userData.suiAddress}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(userData.suiAddress)}
                                    className="copy-btn"
                                    title="Copy address"
                                >
                                    📋
                                </button>
                            </div>
                        </div>

                        <div className="info-box">
                            <p>✅ Your wallet is ready to buy tickets!</p>
                            <p>🔒 Secured by zkLogin - no password needed</p>
                            <p>🎫 Start browsing events to purchase your first ticket</p>
                        </div>

                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
