# 🚀 Quick Start Guide - Kiosk Integration

## Ready to Test? Follow These Steps:

### 1️⃣ Create TransferPolicy (Admin Only - One Time)
```bash
cd /home/xworld/TiX-One
./scripts/setup-admin.sh
```

This script will:
- Find your Publisher object
- Create TransferPolicy with PriceCapRule
- Enable price cap enforcement

---

### 2️⃣ Start the Frontend
```bash
cd /home/xworld/TiX-One/frontend-demo-walletlogin
npm run dev
```

---

### 3️⃣ Test the Complete Flow

#### A. Buy a Ticket
1. Open http://localhost:5173
2. Connect your OneWallet
3. Click "Buy Ticket" (0.1 OCT)
4. Approve transaction

#### B. Set Up Your Shop
1. Navigate to "My Tickets"
2. Click **"+ Set Up Shop"**
3. Approve the Kiosk creation transaction
4. Wait for confirmation

#### C. List on Global Market
1. On the ticket card, click **"📤 List on Global Market"**
2. Enter resale price (e.g., `0.05` OCT)
3. Notice the validation: max = 0.1 OCT
4. Click "Confirm Listing"
5. Approve transaction

#### D. Verify Cross-Platform Visibility
1. Wait 1-2 minutes for blockchain indexers
2. Check your wallet's owned objects
3. Visit BlueMove or Tradeport (when they support OneChain)
4. Your ticket should appear in their marketplace listings

#### E. Test Price Cap Enforcement
1. Buy another ticket
2. Try listing at `0.15` OCT (above 0.1 cap)
3. **Expected**: Frontend shows error message
4. Confirm frontend blocks the transaction

---

## 🎯 What You Should See

### Before Kiosk Setup
```
┌─────────────────────────┐
│  My Tickets             │
├─────────────────────────┤
│  🎫 Ticket Details      │
│  📱 QR Code             │
│                         │
│  🛍️ Global Marketplace  │
│  "To resell this..."    │
│  [+ Set Up Shop]        │
└─────────────────────────┘
```

### After Kiosk Setup
```
┌─────────────────────────┐
│  My Tickets             │
├─────────────────────────┤
│  🎫 Ticket Details      │
│  📱 QR Code             │
│                         │
│  🌐 List on Global Mkt  │
│  "Make this ticket..."  │
│  [📤 List on Global Mkt]│
└─────────────────────────┘
```

### Listing Modal
```
┌─────────────────────────┐
│  💰 Set Resale Price    │
├─────────────────────────┤
│  Original: 0.10 OCT     │
│  ⚠️ Max: 0.10 OCT       │
│                         │
│  Resale Price (OCT)     │
│  [___0.05___________]   │
│                         │
│  [Cancel] [Confirm]     │
└─────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: "Setup script not executable"
```bash
chmod +x /home/xworld/TiX-One/scripts/setup-admin.sh
```

### Issue: "Publisher not found"
The script will automatically extract it. If it fails:
```bash
one client objects | grep -B 5 "Publisher"
```
Then manually copy the ObjectID.

### Issue: Frontend shows "Price too high"
Good! This means validation is working. Enter a price ≤ 0.1 OCT.

### Issue: Kiosk creation fails
Check your OCT balance. You need ~0.02 OCT for gas.

### Issue: Listing not visible on BlueMove
1. Confirm transaction succeeded
2. Wait 2-3 minutes for indexing
3. Use block explorer to verify ticket is in Kiosk

---

## 📦 Configuration Summary

| Constant | Value |
|----------|-------|
| PACKAGE_ID | `0xb0fa1026df7b38835a92eb651b77cd18957726384bc26ca225489cd2c3ed7620` |
| ADMIN_CAP_ID | `0x5264998f673a5310788b7192c88464ff26d5d7cab79edc77f6dd10452991c196` |
| TICKET_PRICE | 0.1 OCT (100_000_000 MIST) |
| MAX_RESALE | Same as purchase price |

---

## ✅ Success Checklist

- [ ] Admin setup script executed
- [ ] TransferPolicy created
- [ ] Bought test ticket
- [ ] Created Kiosk
- [ ] Listed ticket (valid price)
- [ ] Tested invalid price (validation blocks it)
- [ ] Verified ticket in wallet
- [ ] (Optional) Checked BlueMove/Tradeport

---

## 📚 Full Documentation

For complete technical details, see:
- **User Guide**: `KIOSK_INTEGRATION.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Contract**: `blockchain/tix_one/sources/ticket.move`
- **Frontend**: `frontend-demo-walletlogin/src/components/MyTicket.jsx`

---

**Ready? Let's ship it! 🚀**
