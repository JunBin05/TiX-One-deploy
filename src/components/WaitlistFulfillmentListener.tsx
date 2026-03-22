import { useEffect, useRef, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Gift } from "lucide-react";
import { WAITLIST_FULFILLED_EVENT } from "../onechain/config";

type WaitlistFulfillment = {
  buyer: string;
  seller: string;
  ticket_id: string;
  concert_id: string;
  amount: string;
};

export function WaitlistFulfillmentListener() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const mountTime = useRef(Date.now());

  const [fulfillment, setFulfillment] = useState<WaitlistFulfillment | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [seenEvents, setSeenEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    mountTime.current = Date.now();
    setSeenEvents(new Set());
    setFulfillment(null);
    setTicketData(null);
  }, [currentAccount?.address]);

  // Poll for WaitlistFulfilled events every 3 seconds.
  // Ignore events that happened before this component mounted.
  useEffect(() => {
    if (!currentAccount?.address) return;

    const pollInterval = setInterval(async () => {
      try {
        const events = await suiClient.queryEvents({
          query: { MoveEventType: WAITLIST_FULFILLED_EVENT },
          limit: 50,
          order: "descending",
        });

        for (const event of events.data || []) {
          const eventData: any = (event as any).parsedJson;
          const eventTimestamp = Number((event as any).timestampMs || 0);

          // Skip historical events from before/at page load to prevent ghost popups after refresh.
          if (!Number.isFinite(eventTimestamp) || eventTimestamp <= mountTime.current) {
            continue;
          }

          const eventId = `${(event as any).id?.txDigest || ""}:${(event as any).id?.eventSeq || ""}`;
          if (!eventId || eventId === ":") continue;

          // Check if this event is for current user and we haven't seen it
          if (
            eventData?.buyer === currentAccount.address &&
            !seenEvents.has(eventId) &&
            !fulfillment
          ) {
            setFulfillment(eventData);
            setSeenEvents((prev) => new Set(prev).add(eventId));
            break;
          }
        }
      } catch (e) {
        console.error("[WaitlistListener] poll error", e);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentAccount?.address, suiClient, fulfillment, seenEvents]);

  // Fetch ticket details from chain
  useEffect(() => {
    if (!fulfillment?.ticket_id) {
      setTicketData(null);
      return;
    }

    setIsLoadingTicket(true);
    (async () => {
      try {
        const ticketObj = await suiClient.getObject({
          id: fulfillment.ticket_id,
          options: { showContent: true },
        });
        const fields = (ticketObj.data as any)?.content?.fields;
        setTicketData(fields);
      } catch (e) {
        console.error("[WaitlistListener] fetch error", e);
      } finally {
        setIsLoadingTicket(false);
      }
    })();
  }, [fulfillment?.ticket_id, suiClient]);

  if (!fulfillment) return null;

  const formatPrice = (mist: string) => (Number(mist) / 1_000_000_000).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          border: "2px solid rgba(34,211,153,0.6)",
          background: "linear-gradient(135deg, rgba(5,46,22,0.9), rgba(6,78,59,0.85))",
          boxShadow: "0 0 60px rgba(52,211,153,0.4), 0 25px 50px rgba(0,0,0,0.8)",
          padding: "32px 28px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div
            style={{
              padding: "14px",
              borderRadius: "50%",
              background: "rgba(34,211,153,0.15)",
              border: "2px solid rgba(34,211,153,0.5)",
              display: "inline-flex",
              animation: "pulse 2s infinite",
            }}
          >
            <Gift style={{ width: "36px", height: "36px", color: "#10b981" }} />
          </div>
        </div>

        <p
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#6ee7b7",
            marginBottom: "8px",
          }}
        >
          Waitlist Fulfilled
        </p>

        {isLoadingTicket ? (
          <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #10b981",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : ticketData ? (
          <>
            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ecfdf5", marginBottom: "8px", lineHeight: 1.2 }}>
              🎉 Your Ticket Arrived!
            </h2>
            <p style={{ fontSize: "15px", color: "#10b981", fontWeight: 700, marginBottom: "6px" }}>
              {ticketData.event_name}
            </p>
            <p style={{ fontSize: "13px", color: "#a7f3d0", marginBottom: "20px" }}>
              {ticketData.artist} • Seat {ticketData.seat}
            </p>
          </>
        ) : (
          <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ecfdf5", marginBottom: "20px" }}>
            🎉 Your Ticket Arrived!
          </h2>
        )}

        <div
          style={{
            background: "rgba(34,211,153,0.08)",
            borderLeft: "3px solid #10b981",
            padding: "12px 14px",
            borderRadius: "8px",
            marginBottom: "24px",
            textAlign: "left",
          }}
        >
          <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: 1.6, margin: 0 }}>
            A ticket you were waitlisted for has been transferred to your wallet.
            <br />
            <span style={{ color: "#10b981", fontWeight: 700 }}>Price: {formatPrice(fulfillment.amount)} OCT</span>
          </p>
        </div>

        <button
          onClick={() => {
            setFulfillment(null);
            window.location.assign("/my-ticket");
          }}
          style={{
            width: "100%",
            borderRadius: "12px",
            background: "linear-gradient(to right, #10b981, #059669)",
            color: "#fff",
            padding: "14px 20px",
            fontWeight: 700,
            fontSize: "15px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(16,185,129,0.5)",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.background = "linear-gradient(to right, #059669, #047857)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(16,185,129,0.7)";
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.background = "linear-gradient(to right, #10b981, #059669)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(16,185,129,0.5)";
          }}
        >
          ✅ Check My Tickets
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
