import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0xaab69602cc3fef8fdc9785c38a75508438eb074bf6775bb2e41a921956cf7a3f';
const TICKET_TYPE = `${PACKAGE_ID}::ticket::Ticket`;
const TRANSFER_POLICY_ID = '0x8997dc1f0088d885da8cbd644c72b301eb27a68fb12da3f5d0c52659a8ce4209';

function Checkout() {
    const [searchParams] = useSearchParams();
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const navigate = useNavigate();

    const [ticketData, setTicketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState('');

    const kioskId = searchParams.get('kiosk');
    const ticketId = searchParams.get('ticket');
    const priceParam = searchParams.get('price');
    const priceMist = priceParam ? Number(priceParam) : NaN;

    useEffect(() => {
        const fetchTicket = async () => {
            if (!ticketId) {
                setError('Missing ticket id in the link.');
                setIsLoading(false);
                return;
            }

            try {
                const ticketObj = await suiClient.getObject({
                    id: ticketId,
                    options: { showContent: true }
                });

                if (!ticketObj.data?.content?.fields) {
                    setError('Ticket not found or no longer available.');
                    setIsLoading(false);
                    return;
                }

                setTicketData(ticketObj.data.content.fields);
            } catch (err) {
                console.error('[Checkout] Ticket fetch error:', err);
                setError('Failed to load ticket details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTicket();
    }, [ticketId, suiClient]);

    const formatPrice = (mist) => {
        return (mist / 1_000_000_000).toFixed(2);
    };

    const handlePurchase = async () => {
        if (!currentAccount) {
            return;
        }

        if (!kioskId || !ticketId || !Number.isFinite(priceMist)) {
            alert('Invalid private sale link.');
            return;
        }

        setIsPurchasing(true);

        try {
            const tx = new Transaction();

            // 1. Split exact coin amount for payment
            const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)]);

            // 2. Purchase from Kiosk (Returns the Ticket AND the TransferRequest)
            const [purchasedTicket, transferRequest] = tx.moveCall({
                target: '0x2::kiosk::purchase',
                typeArguments: [TICKET_TYPE],
                arguments: [
                    tx.object(kioskId),
                    tx.pure.id(ticketId),
                    coin
                ],
            });

            // 3. Show the receipt to our custom rule to verify the price cap wasn't broken
            tx.moveCall({
                target: `${PACKAGE_ID}::ticket::verify_resale`,
                arguments: [
                    tx.object(TRANSFER_POLICY_ID),
                    transferRequest,
                    purchasedTicket
                ],
            });

            // 4. Confirm the transfer request is officially approved by the policy
            tx.moveCall({
                target: '0x2::transfer_policy::confirm_request',
                typeArguments: [TICKET_TYPE],
                arguments: [
                    tx.object(TRANSFER_POLICY_ID),
                    transferRequest
                ],
            });

            // 5. Finally, send the ticket directly to the buyer's wallet
            tx.transferObjects([purchasedTicket], tx.pure.address(currentAccount.address));

            await new Promise((resolve, reject) => {
                signAndExecuteTransaction(
                    { transaction: tx },
                    {
                        onSuccess: async (result) => {
                            console.log('[Checkout] Purchase success:', result);
                            try {
                                const receipt = await suiClient.waitForTransaction({
                                    digest: result.digest,
                                    options: { showEffects: true }
                                });

                                if (receipt.effects?.status?.status === 'success') {
                                    alert('✅ Ticket purchased successfully! Check "My Tickets" to view it.');
                                    navigate('/my-ticket');
                                    resolve();
                                } else {
                                    alert('❌ Purchase failed. Please try again.');
                                    reject(new Error('Transaction failed'));
                                }
                            } catch (err) {
                                console.log('[Checkout] Transaction confirming...', err);
                                alert('✅ Purchase submitted! Check "My Tickets" shortly.');
                                navigate('/my-ticket');
                                resolve();
                            }
                        },
                        onError: (err) => {
                            console.error('[Checkout] Purchase error:', err);
                            alert(`❌ Purchase failed: ${err.message || 'Unknown error'}`);
                            reject(err);
                        }
                    }
                );
            });
        } catch (err) {
            console.error('[Checkout] Error during purchase:', err);
            alert('Purchase failed. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="ticket-page">
                <div className="ticket-header">
                    <button className="back-button" onClick={() => navigate('/')}>
                        ← Back
                    </button>
                    <h1>🔒 Private Checkout</h1>
                </div>
                <div className="ticket-container">
                    <div className="spinner"></div>
                    <p>Loading ticket details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ticket-page">
                <div className="ticket-header">
                    <button className="back-button" onClick={() => navigate('/')}>
                        ← Back
                    </button>
                    <h1>🔒 Private Checkout</h1>
                </div>
                <div className="ticket-container">
                    <div className="ticket-card denied">
                        <h2>⚠️ Unable to load ticket</h2>
                        <p>{error}</p>
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
                <h1>🔒 Private Checkout</h1>
                <p className="subtitle-text">Secure private sale • Price cap enforced on-chain</p>
            </div>

            <div className="ticket-container">
                <div className="ticket-card">
                    <h2>{ticketData.event_name}</h2>
                    <p className="artist-name">{ticketData.artist}</p>

                    <div className="ticket-details">
                        <div className="detail-item">
                            <label>Seat</label>
                            <span>{ticketData.seat}</span>
                        </div>
                        <div className="detail-item">
                            <label>Original Price</label>
                            <span>{formatPrice(parseInt(ticketData.original_price))} OCT</span>
                        </div>
                        <div className="detail-item">
                            <label>Private Sale Price</label>
                            <span>{Number.isFinite(priceMist) ? `${formatPrice(priceMist)} OCT` : 'N/A'}</span>
                        </div>
                    </div>

                    {!currentAccount && (
                        <div className="connect-section">
                            <p>Please connect your wallet to complete purchase.</p>
                            <ConnectButton />
                        </div>
                    )}

                    <button
                        className="vip-button success"
                        onClick={handlePurchase}
                        disabled={!currentAccount || isPurchasing || !Number.isFinite(priceMist)}
                    >
                        {isPurchasing ? 'Purchasing...' : '🛒 Buy Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Checkout;
