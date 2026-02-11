import React, { useState, useEffect } from 'react';
import './App.css';
import { ConnectButton, useCurrentAccount, useWallets } from '@mysten/dapp-kit';

function App() {
    const [isOneWalletInstalled, setIsOneWalletInstalled] = useState(false);
    const currentAccount = useCurrentAccount();
    const wallets = useWallets();

    useEffect(() => {
        console.log('Available wallets:', wallets.map(w => w.name));
        
        // Check if OneWallet is in the available wallets list
        const hasOneWallet = wallets.some(wallet => 
            wallet.name === 'OneWallet' || 
            wallet.name.toLowerCase().includes('onewallet')
        );
        
        console.log('OneWallet detected via dapp-kit:', hasOneWallet);
        setIsOneWalletInstalled(hasOneWallet);
        
        // Also try legacy window check
        const hasWindowOneWallet = !!window.onewallet;
        console.log('window.onewallet:', hasWindowOneWallet);
        
        if (hasWindowOneWallet && !hasOneWallet) {
            setIsOneWalletInstalled(true);
        }
    }, [wallets]);

    return (
        <div className="App">
            {!currentAccount ? (
                <div className="landing-page">
                    <div className="hero">
                        <h1>🎫 TiX-One</h1>
                        <p className="tagline">Smart Tickets for Humans</p>
                        <p className="subtitle">
                            Buy, sell, and trade tickets with blockchain-enforced fair pricing.
                            No scalpers, no middlemen.
                        </p>

                        {/* 2. Smart Button Toggle */}
                        {isOneWalletInstalled ? (
                            <div className="ready-to-connect">
                                <p style={{ color: '#4ade80', marginBottom: '1rem' }}>✅ OneWallet Detected!</p>
                                <ConnectButton className="login-button" />
                            </div>
                        ) : (
                            <div className="install-required">
                                <p className="error-text" style={{ color: '#fbbf24', marginBottom: '1rem' }}>
                                    ⚠️ OneWallet Extension Required
                                </p>
                                <a 
                                    href="https://chromewebstore.google.com/detail/onewallet/gclmcgmpkgblaglfokkaclneihpnbkli" 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="login-button"
                                    style={{ display: 'inline-block', textDecoration: 'none' }}
                                >
                                    📥 Click Here to Install OneWallet
                                </a>
                                <p className="hint" style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
                                    Refresh this page after installing!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="dashboard">
                    <div className="wallet-card">
                        <h2>Welcome! 🎉</h2>
                        <div className="wallet-info">
                            <label>Your Sui Wallet Address:</label>
                            <div className="address-display">
                                <code>{currentAccount.address}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(currentAccount.address)}
                                    className="copy-btn"
                                    title="Copy address"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                        <div className="info-box">
                            <p>✅ Connected via {currentAccount.label || 'OneWallet'}</p>
                            <p>🎫 Ready to purchase tickets</p>
                        </div>
                        <ConnectButton className="logout-button" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;