import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { QRCodeSVG } from 'qrcode.react';

const PACKAGE_ID = '0xe5075370b215b27cb71de3dd381d80aa126e61c595ec852c6a40a20d60b5f059';
const TICKET_TYPE = `${PACKAGE_ID}::ticket::Ticket`;

function MyTicket() {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [signature, setSignature] = useState(null);
    
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentAccount) {
            fetchTickets();
        } else {
            setIsLoading(false);
        }
    }, [currentAccount]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const ownedObjects = await suiClient.getOwnedObjects({
                owner: currentAccount.address,
                filter: { StructType: TICKET_TYPE },
                options: {
                    showContent: true,
                    showType: true,
                }
            });

            if (ownedObjects.data && ownedObjects.data.length > 0) {
                const ticketList = ownedObjects.data.map(obj => ({
                    objectId: obj.data.objectId,
                    ...obj.data.content.fields
                }));
                setTickets(ticketList);
                setSelectedTicket(ticketList[0]);
            }
        } catch (error) {
            console.error('[MyTicket] Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateSignature = async (ticket) => {
        try {
            // Sign a message to prove ownership
            const message = `TiX-One-Auth:${ticket.objectId}`;
            const messageBytes = new TextEncoder().encode(message);
            
            const result = await signPersonalMessage({
                message: messageBytes
            });
            
            setSignature(result.signature);
            return result.signature;
        } catch (error) {
            console.error('[MyTicket] Signature error:', error);
            return null;
        }
    };

    useEffect(() => {
        if (selectedTicket && currentAccount) {
            generateSignature(selectedTicket);
        }
    }, [selectedTicket]);

    const formatExpiration = (timestamp) => {
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const generateQRData = (ticket) => {
        // Simplified QR data for easier scanning
        return JSON.stringify({
            id: ticket.objectId,
            owner: currentAccount.address,
        });
    };

    if (!currentAccount) {
        return (
            <div className="ticket-page">
                <div className="ticket-container">
                    <div className="ticket-card denied">
                        <h2>🔒 Not Connected</h2>
                        <p>Please connect your wallet to view your tickets</p>
                        <button className="vip-button primary" onClick={() => navigate('/')}>
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="ticket-page">
                <div className="ticket-container">
                    <div className="spinner"></div>
                    <p>Loading your tickets...</p>
                </div>
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="ticket-page">
                <div className="ticket-container">
                    <div className="ticket-card denied">
                        <h2>🎫 No Tickets Found</h2>
                        <p>You don't have any tickets yet</p>
                        <button className="vip-button primary" onClick={() => navigate('/')}>
                            Buy a Ticket
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ticket-page">
            <div className="ticket-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h1>🎫 My Tickets</h1>
            </div>

            {tickets.length > 1 && (
                <div className="ticket-selector">
                    <label>Select Ticket:</label>
                    <select 
                        value={selectedTicket?.objectId} 
                        onChange={(e) => {
                            const ticket = tickets.find(t => t.objectId === e.target.value);
                            setSelectedTicket(ticket);
                        }}
                    >
                        {tickets.map((ticket, index) => (
                            <option key={ticket.objectId} value={ticket.objectId}>
                                Ticket #{index + 1} - {ticket.event_name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedTicket && (
                <div className="ticket-display">
                    <div className="ticket-card granted">
                        <div className="ticket-info-header">
                            <h2>{selectedTicket.event_name}</h2>
                            <p className="artist-name">{selectedTicket.artist}</p>
                        </div>

                        {/* QR Code */}
                        <div className="qr-code-container">
                            <QRCodeSVG
                                value={generateQRData(selectedTicket)}
                                size={320}
                                level="M"
                                includeMargin={true}
                            />
                        </div>

                        {/* Ticket Details */}
                        <div className="ticket-details-grid">
                            <div className="detail-item">
                                <label>Seat</label>
                                <p>{selectedTicket.seat}</p>
                            </div>
                            <div className="detail-item">
                                <label>Status</label>
                                <p className={selectedTicket.is_scanned ? "scanned" : "valid"}>
                                    {selectedTicket.is_scanned ? "✓ Scanned" : "✓ Valid"}
                                </p>
                            </div>
                            <div className="detail-item">
                                <label>Expires</label>
                                <p>{formatExpiration(selectedTicket.expires_at)}</p>
                            </div>
                            <div className="detail-item">
                                <label>Price Paid</label>
                                <p>{(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)} OCT</p>
                            </div>
                        </div>

                        <div className="ticket-id">
                            <label>Ticket ID</label>
                            <code>{selectedTicket.objectId.slice(0, 12)}...{selectedTicket.objectId.slice(-8)}</code>
                        </div>

                        {selectedTicket.is_scanned && (
                            <div className="warning-banner">
                                ⚠️ This ticket has already been scanned and cannot be reused
                            </div>
                        )}

                        <div className="qr-instructions">
                            <p>📱 Show this QR code at the venue entrance</p>
                            <p className="small-text">Do not share or screenshot this code</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyTicket;
