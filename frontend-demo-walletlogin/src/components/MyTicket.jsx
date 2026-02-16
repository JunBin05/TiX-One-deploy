import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient, useSignPersonalMessage, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { QRCodeSVG } from 'qrcode.react';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0xaab69602cc3fef8fdc9785c38a75508438eb074bf6775bb2e41a921956cf7a3f';
const TICKET_TYPE = `${PACKAGE_ID}::ticket::Ticket`;
const KIOSK_TYPE = '0x2::kiosk::Kiosk';
const KIOSK_OWNER_CAP_TYPE = '0x2::kiosk::KioskOwnerCap';

function MyTicket() {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [signature, setSignature] = useState(null);
    const [kiosk, setKiosk] = useState(null);
    const [kioskOwnerCap, setKioskOwnerCap] = useState(null);
    const [isCreatingKiosk, setIsCreatingKiosk] = useState(false);
    const [isListing, setIsListing] = useState(false);
    const [listPrice, setListPrice] = useState('');
    const [showListingModal, setShowListingModal] = useState(false);
    
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentAccount) {
            fetchTickets();
            fetchKiosk();
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

    const fetchKiosk = async () => {
        try {
            // Fetch KioskOwnerCap (owned by user)
            const capObjects = await suiClient.getOwnedObjects({
                owner: currentAccount.address,
                filter: { StructType: KIOSK_OWNER_CAP_TYPE },
                options: {
                    showContent: true,
                    showType: true,
                }
            });

            if (capObjects.data && capObjects.data.length > 0) {
                const cap = capObjects.data[0];
                setKioskOwnerCap(cap);
                
                // The KioskOwnerCap contains a reference to the Kiosk ID
                // Extract the Kiosk ID from the cap's 'for' field
                const kioskId = cap.data.content.fields.for;
                console.log('[MyTicket] Found Kiosk ID:', kioskId);
                
                // Fetch the actual Kiosk object
                const kioskObject = await suiClient.getObject({
                    id: kioskId,
                    options: {
                        showContent: true,
                        showType: true,
                    }
                });
                
                if (kioskObject.data) {
                    setKiosk(kioskObject);
                    console.log('[MyTicket] Kiosk loaded successfully');
                }
            } else {
                console.log('[MyTicket] No KioskOwnerCap found');
            }
        } catch (error) {
            console.error('[MyTicket] Error fetching kiosk:', error);
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

    const createKiosk = async () => {
        setIsCreatingKiosk(true);
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: '0x2::kiosk::default',
                arguments: [],
            });

            await new Promise((resolve, reject) => {
                signAndExecuteTransaction(
                    { transaction: tx },
                    {
                        onSuccess: async () => {
                            await new Promise(r => setTimeout(r, 1000));
                            await fetchKiosk();
                            resolve();
                        },
                        onError: (error) => {
                            console.error('[MyTicket] Kiosk creation error:', error);
                            reject(error);
                        }
                    }
                );
            });

            alert('✅ Kiosk created! Your shop is now open for business.');
        } catch (error) {
            console.error('[MyTicket] Error creating kiosk:', error);
            alert('Failed to create kiosk');
        } finally {
            setIsCreatingKiosk(false);
        }
    };

    const handleListOnMarketplace = async () => {
        // Validate price
        const priceInMist = Math.floor(parseFloat(listPrice) * 1_000_000_000);
        const originalPrice = parseInt(selectedTicket.original_price);

        if (priceInMist > originalPrice) {
            alert(`❌ Price too high! Maximum resale price is ${(originalPrice / 1_000_000_000).toFixed(2)} OCT`);
            return;
        }

        setIsListing(true);
        try {
            const tx = new Transaction();

            // Step 1: Emit the discovery event BEFORE locking the ticket in the Kiosk
            tx.moveCall({
                target: `${PACKAGE_ID}::ticket::emit_listing_event`,
                arguments: [
                    tx.object(selectedTicket.objectId),
                    tx.pure.u64(priceInMist)
                ],
            });

            // Step 2: Place ticket securely in the Kiosk
            tx.moveCall({
                target: '0x2::kiosk::place',
                typeArguments: [TICKET_TYPE],
                arguments: [
                    tx.object(kiosk.data.objectId),
                    tx.object(kioskOwnerCap.data.objectId),
                    tx.object(selectedTicket.objectId)
                ],
            });

            // Step 3: Set the public list price using the standard Kiosk standard
            tx.moveCall({
                target: '0x2::kiosk::list',
                typeArguments: [TICKET_TYPE],
                arguments: [
                    tx.object(kiosk.data.objectId),
                    tx.object(kioskOwnerCap.data.objectId),
                    tx.pure.id(selectedTicket.objectId),
                    tx.pure.u64(priceInMist)
                ],
            });

            await new Promise((resolve, reject) => {
                signAndExecuteTransaction(
                    { transaction: tx },
                    {
                        onSuccess: async () => {
                            setShowListingModal(false);
                            setListPrice('');
                            await new Promise(r => setTimeout(r, 1000));
                            await fetchTickets();
                            alert('✅ Ticket listed on global marketplace! It\'s now visible in the Secondary Market.');
                            resolve();
                        },
                        onError: (error) => {
                            console.error('[MyTicket] Listing error:', error);
                            alert('Transaction failed. Check the console for details.');
                            reject(error);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('[MyTicket] Error listing ticket:', error);
            alert('Failed to list ticket. Make sure you have enough OCT for gas fees.');
        } finally {
            setIsListing(false);
        }
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

                        {/* Inventory Status Badge */}
                        <div className={`inventory-status ${kiosk ? 'unlisted' : 'no-kiosk'}`}>
                            <span className="status-icon">📦</span>
                            <div className="status-text">
                                <strong>Inventory Status:</strong>
                                <span>{kiosk ? 'In Your Wallet (Unlisted)' : 'Ready to List'}</span>
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

                        {/* Notification for unlisted tickets */}
                        {kiosk && !selectedTicket.is_scanned && (
                            <div className="notification-banner unlisted">
                                <span className="notification-icon">💡</span>
                                <div className="notification-content">
                                    <strong>Want to sell this ticket?</strong>
                                    <p>List it on the marketplace for other fans to buy. Max price: {(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)} OCT</p>
                                </div>
                            </div>
                        )}

                        {!kiosk && (
                            <div className="action-section">
                                <h3>🛍️ Global Marketplace</h3>
                                <p>To resell this ticket on BlueMove/Tradeport, first open your shop</p>
                                <button 
                                    className="vip-button primary"
                                    onClick={createKiosk}
                                    disabled={isCreatingKiosk}
                                >
                                    {isCreatingKiosk ? 'Setting up Shop...' : '+ Set Up Shop'}
                                </button>
                            </div>
                        )}

                        {kiosk && !selectedTicket.is_scanned && (
                            <div className="action-section">
                                <h3>🌐 List on Global Market</h3>
                                <p>Make this ticket available for resale on BlueMove, Tradeport & other Sui marketplaces</p>
                                <button 
                                    className="vip-button success"
                                    onClick={() => setShowListingModal(true)}
                                    disabled={isListing}
                                >
                                    📤 List on Global Market
                                </button>
                            </div>
                        )}

                        <div className="qr-instructions">
                            <p>📱 Show this QR code at the venue entrance</p>
                            <p className="small-text">Do not share or screenshot this code</p>
                        </div>
                    </div>
                </div>
            )}

            {showListingModal && (
                <div className="modal-overlay" onClick={() => !isListing && setShowListingModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>💰 Set Resale Price</h2>
                        <p>Original purchase price: <strong>{(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)} OCT</strong></p>
                        <p className="small-text">⚠️ Maximum resale price is <strong>{(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)} OCT</strong></p>
                        
                        <div className="modal-input">
                            <label>Resale Price (OCT)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                max={(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)}
                                value={listPrice}
                                onChange={(e) => setListPrice(e.target.value)}
                                placeholder={`Max: ${(parseInt(selectedTicket.original_price) / 1_000_000_000).toFixed(2)}`}
                            />
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="modal-button cancel"
                                onClick={() => {
                                    setShowListingModal(false);
                                    setListPrice('');
                                }}
                                disabled={isListing}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-button confirm"
                                onClick={handleListOnMarketplace}
                                disabled={isListing || !listPrice}
                            >
                                {isListing ? 'Listing...' : 'Confirm Listing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyTicket;
