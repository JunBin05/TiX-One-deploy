export const PACKAGE_ID =
  "0x5289f74a6bfcbf0fe0693a6f2e535216571c57de7e501f804094815a665d0ecf" as const;

// Coins / system objects
export const OCT_TYPE = "0x2::oct::OCT" as const;
export const CLOCK_OBJECT_ID = "0x6" as const;

// Primary sale (mint)
export const TICKET_PRICE_MIST = 100_000_000n as const; // 0.1 OCT

// Types
export const TICKET_TYPE = `${PACKAGE_ID}::ticket::Ticket` as const;
export const KIOSK_TYPE = "0x2::kiosk::Kiosk" as const;
export const KIOSK_OWNER_CAP_TYPE = "0x2::kiosk::KioskOwnerCap" as const;

// Marketplace / policy
export const TRANSFER_POLICY_ID =
  "0x86bf15a86b41e7ebd146f452dc6f431078191eb748ff3b2f2521b56c723b6107" as const;
export const LISTING_REGISTRY_ID =
  "0xda9f712bcb1c07912c4641971e2372b6e78a16631b3b208293fc6ab3af41acc4" as const;
export const TICKET_LISTED_EVENT =
  `${PACKAGE_ID}::ticket::TicketListedEvent` as const;

// Scanner / admin
export const ADMIN_CAP_ID =
  "0x7ac146040a1c1070cc02c24dd56e4cff31bfe40e16b50149c07fbc5ea42e05d9" as const;

// Concert shared-object type (for getObject / queryEvents filters)
export const CONCERT_TYPE = `${PACKAGE_ID}::ticket::Concert` as const;

// Waitlist object type (for on-chain queue queries)
export const WAITLIST_TYPE = `${PACKAGE_ID}::ticket::Waitlist` as const;

// Backend verifier — set automatically by scripts/3-init-verifier.sh
// Run: bash scripts/1-deploy.sh && bash scripts/3-init-verifier.sh
export const BACKEND_VERIFIER_ID =
  "0x6ed94b51959bfc6f209b56bb7ceb6e77977ba124a2e8f9912c7a7a1ce30a90a5" as const; // ← populated by 3-init-verifier.sh
