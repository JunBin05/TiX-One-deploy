# 🛍️ TiX-One Kiosk Integration Guide

## Overview
TiX-One now supports **Global Marketplace Listing** via Sui's Kiosk Standard. This enables ticket resale on cross-platform marketplaces like **BlueMove** and **Tradeport** while enforcing on-chain price caps.

---

## 🎯 Features Implemented

### 1. Smart Contract Enforcement (`ticket.move`)
- ✅ **TransferPolicy with PriceCapRule**: Enforces maximum resale price = original purchase price
- ✅ **Kiosk Support**: Tickets have `store` ability, making them tradable in Kiosks
- ✅ **verify_resale()**: Unpacks TransferRequest and validates price on-chain

### 2. Frontend Integration (`MyTicket.jsx`)
- ✅ **Kiosk Management**: Auto-detects if user owns a Kiosk
- ✅ **"Set Up Shop" Button**: Creates Kiosk + KioskOwnerCap via `kiosk::default()`
- ✅ **"List on Global Market" Button**: Executes 2-step listing:
  1. `kiosk::place()` - Moves Ticket into Kiosk
  2. `kiosk::list()` - Sets sale price
- ✅ **Price Guard**: Frontend validates price ≤ original_price before transaction

---

## 📦 Deployment Information

**Latest Deployment:**
- **Package ID**: `0xb0fa1026df7b38835a92eb651b77cd18957726384bc26ca225489cd2c3ed7620`
- **AdminCap ID**: `0x5264998f673a5310788b7192c88464ff26d5d7cab79edc77f6dd10452991c196`
- **Clock Object**: `0x6` (shared Sui clock)

---

## 🚀 How to Use (User Flow)

### Step 1: Buy a Ticket
1. Connect wallet on Home page
2. Click "Buy Ticket" (0.1 OCT)
3. Transaction creates Ticket NFT with Display metadata

### Step 2: Set Up Your Shop (One-time)
1. Go to "My Tickets"
2. If no Kiosk exists, click **"+ Set Up Shop"**
3. Transaction creates:
   - Kiosk (shared object, your personal shop)
   - KioskOwnerCap (owned by you, proves ownership)

### Step 3: List Ticket on Global Market
1. Select a ticket
2. Click **"📤 List on Global Market"**
3. Enter resale price (max = original price, e.g., 0.1 OCT)
4. Frontend validates price ≤ 0.1 OCT
5. Transaction executes:
   ```move
   kiosk::place<Ticket>(kiosk, ticket_object_id)
   kiosk::list<Ticket>(kiosk, kiosk_cap, ticket_id, price_in_mist)
   ```

### Step 4: Automatic Cross-Platform Visibility
Once listed in your Kiosk:
- ✅ **BlueMove** indexes your listing
- ✅ **Tradeport** indexes your listing
- ✅ Any Sui marketplace can discover it via standard RPC queries

---

## 🔒 Security Guarantees

### On-Chain Enforcement
When a buyer purchases from **any marketplace**:

1. **Marketplace calls** the standard Kiosk purchase flow
2. **TransferPolicy** intercepts the transaction
3. **PriceCapRule** requires calling `verify_resale()`
4. **Smart contract validates**: `paid_amount <= ticket.original_price`
5. **If price exceeds cap**: Transaction fails with `EPriceTooHigh`

### Frontend Guards
- Input validation prevents users from attempting invalid prices
- Saves gas fees by blocking bad transactions before submission

---

## 🛠️ Admin Setup Required

### Create TransferPolicy (One-time Setup)
The admin must create a TransferPolicy to enable the PriceCapRule:

```bash
# Get Publisher object ID
one client objects | grep -B 5 "Publisher"

# Call create_transfer_policy
one client call \
  --package 0xb0fa1026df7b38835a92eb651b77cd18957726384bc26ca225489cd2c3ed7620 \
  --module ticket \
  --function create_transfer_policy \
  --args 0x[ADMIN_CAP_ID] 0x[PUBLISHER_ID] \
  --gas-budget 100000000
```

**Expected Output:**
- Creates a shared `TransferPolicy<Ticket>` object
- Adds `PriceCapRule` to the policy
- Transfers `TransferPolicyCap` to admin

---

## 📝 Code Structure

### Smart Contract (`ticket.move`)
```move
// Core resale enforcement
public fun verify_resale(
    _policy: &mut TransferPolicy<Ticket>,
    request: &mut transfer_policy::TransferRequest<Ticket>,
    ticket: &Ticket
) {
    let paid_amount = transfer_policy::paid(request);
    assert!(paid_amount <= ticket.original_price, EPriceTooHigh);
    transfer_policy::add_receipt(PriceCapRule {}, request);
}
```

### Frontend (`MyTicket.jsx`)
```javascript
// Step 1: Place ticket in kiosk
tx.moveCall({
  target: '0x2::kiosk::place',
  typeArguments: [TICKET_TYPE],
  arguments: [tx.object(kioskId), tx.object(ticketId)]
});

// Step 2: List with price
tx.moveCall({
  target: '0x2::kiosk::list',
  typeArguments: [TICKET_TYPE],
  arguments: [
    tx.object(kioskId),
    tx.object(kioskCapId),
    tx.pure.id(ticketId),
    tx.pure.u64(priceInMist)
  ]
});
```

---

## 🧪 Testing Checklist

- [ ] Buy ticket (0.1 OCT)
- [ ] Set up Kiosk (creates Kiosk + Cap)
- [ ] List ticket at 0.05 OCT (below cap, should succeed)
- [ ] Try listing at 0.15 OCT (above cap, should fail frontend validation)
- [ ] Verify listing appears in wallet's owned objects
- [ ] Check BlueMove/Tradeport for listing visibility
- [ ] Purchase ticket from marketplace (validates on-chain price cap)

---

## 🌐 Marketplace Integration

### For Third-Party Platforms
To discover TiX-One tickets on your marketplace:

1. **Query all Kiosks** via standard RPC
2. **Filter by type**: `0xb0fa1026df7b38835a92eb651b77cd18957726384bc26ca225489cd2c3ed7620::ticket::Ticket`
3. **Display metadata** from Sui Display Standard:
   - `name`: "TiX-One Ticket: {event_name}"
   - `image_url`: Dynamic DiceBear avatar
   - `description`: Event and artist info
   - `link`: Explorer link

No special integration needed - standard Sui indexing works!

---

## 📊 Transaction Flow Diagram

```
User buys ticket
     ↓
[Ticket NFT] (owned by user)
     ↓
User clicks "List on Global Market"
     ↓
kiosk::place() → [Ticket] moved into Kiosk
     ↓
kiosk::list() → Listed at resale price
     ↓
[Indexed by BlueMove/Tradeport]
     ↓
Buyer purchases on marketplace
     ↓
TransferPolicy::verify_resale() validates price
     ↓
✅ If price ≤ cap: Transfer succeeds
❌ If price > cap: Transaction reverts
```

---

## 🔧 Troubleshooting

### Issue: "Kiosk not found"
**Solution**: Click "Set Up Shop" to create your Kiosk

### Issue: "Price too high" error
**Solution**: Ensure resale price ≤ original purchase price (0.1 OCT)

### Issue: "Transaction failed"
**Solution**: Check if TransferPolicy has been created by admin

### Issue: Listing not visible on BlueMove
**Solution**: Wait 1-2 minutes for indexers to catch up

---

## 📚 References

- [Sui Kiosk Standard](https://docs.sui.io/standards/kiosk)
- [TransferPolicy Documentation](https://docs.sui.io/guides/developer/sui-101/transfer-policy)
- [Display Standard](https://docs.sui.io/standards/display)

---

**Built with ❤️ by TiX-One Team**
