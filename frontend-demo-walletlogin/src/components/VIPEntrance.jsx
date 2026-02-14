import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';

const PACKAGE_ID = '0xe5075370b215b27cb71de3dd381d80aa126e61c595ec852c6a40a20d60b5f059';
const TICKET_TYPE = `${PACKAGE_ID}::ticket::Ticket`;

function VIPEntrance() {
    const [hasAccess, setHasAccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [ticketData, setTicketData] = useState(null);
    const [error, setError] = useState('');
    
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const navigate = useNavigate();

    useEffect(() => {
        // Only check if wallet is connected
        if (!currentAccount) {
            setIsLoading(false);
            setHasAccess(false);
            return;
        }

        verifyTicket();
    }, [currentAccount]);

    const verifyTicket = async () => {
        setIsLoading(true);
        setError('');

        try {
            console.log('[VIP] Checking for tickets...');
            
            // Query all objects owned by the user
            const ownedObjects = await suiClient.getOwnedObjects({
                owner: currentAccount.address,
                filter: {
                    StructType: TICKET_TYPE
                },
                options: {
                    showContent: true,
                    showType: true,
                }
            });

            console.log('[VIP] Found objects:', ownedObjects);

            if (ownedObjects.data && ownedObjects.data.length > 0) {
                // User has at least one ticket
                const ticketObject = ownedObjects.data[0];
                const content = ticketObject.data?.content;

                if (content && content.fields) {
                    setTicketData({
                        eventName: content.fields.event_name || 'TiX-One Event',
                        seat: content.fields.seat || 'General Admission',
                        id: ticketObject.data.objectId,
                    });
                    setHasAccess(true);
                    console.log('[VIP] Access granted!', content.fields);
                } else {
                    setError('Ticket found but could not read details');
                }
            } else {
                // No ticket found
                console.log('[VIP] No ticket found');
                setHasAccess(false);
            }
        } catch (err) {
            console.error('[VIP] Error checking ticket:', err);
            setError(err.message || 'Failed to verify ticket');
            setHasAccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Loading State
    if (isLoading) {
        return (
            <div className="vip-container">
                <div className="vip-card loading">
                    <div className="spinner"></div>
                    <h2>🎫 Verifying Your Ticket...</h2>
                    <p>Please wait while we check your credentials</p>
                </div>
            </div>
        );
    }

    // Not Connected State
    if (!currentAccount) {
        return (
            <div className="vip-container">
                <div className="vip-card denied">
                    <div className="icon-large">🔒</div>
                    <h2>Wallet Not Connected</h2>
                    <p>Please connect your OneWallet to verify your ticket</p>
                    <button 
                        className="vip-button primary"
                        onClick={() => navigate('/')}
                    >
                        Go to Home & Connect
                    </button>
                </div>
            </div>
        );
    }

    // Access Denied State
    if (!hasAccess) {
        return (
            <div className="vip-container">
                <div className="vip-card denied">
                    <div className="access-denied-animation">
                        <div className="icon-large">🚫</div>
                        <div className="pulse-ring"></div>
                    </div>
                    <h2>Access Denied</h2>
                    <p className="denied-message">
                        No valid ticket found in your wallet
                    </p>
                    {error && <p className="error-text">{error}</p>}
                    <div className="button-group">
                        <button 
                            className="vip-button primary"
                            onClick={() => navigate('/')}
                        >
                            🎟️ Buy Ticket Now
                        </button>
                        <button 
                            className="vip-button secondary"
                            onClick={verifyTicket}
                        >
                            🔄 Check Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Access Granted State (with animation)
    return (
        <div className="vip-container">
            <div className="vip-card granted">
                <div className="welcome-animation">
                    <div className="icon-large animated">✨</div>
                    <div className="confetti"></div>
                </div>
                <h1 className="welcome-title">Welcome to the Show!</h1>
                
                {ticketData && (
                    <div className="ticket-details">
                        <div className="detail-card">
                            <label>Event</label>
                            <p className="event-name">{ticketData.eventName}</p>
                        </div>
                        <div className="detail-card">
                            <label>Seat Assignment</label>
                            <p className="seat-info">{ticketData.seat}</p>
                        </div>
                        <div className="detail-card">
                            <label>Ticket ID</label>
                            <p className="ticket-id">
                                {ticketData.id.slice(0, 8)}...{ticketData.id.slice(-6)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="access-badge">
                    <span className="badge-icon">🎫</span>
                    <span className="badge-text">VIP ACCESS VERIFIED</span>
                </div>

                <button 
                    className="vip-button secondary"
                    onClick={() => navigate('/')}
                >
                    ← Back to Home
                </button>
            </div>
        </div>
    );
}

export default VIPEntrance;
