# 🚀 Enabling Real Aleo Testnet Mode

## Quick Start

Your privacy bridge now supports **real Aleo testnet transactions**!

### Switch to Real Network Mode

**1. Update `.env` file:**
```bash
# Change from false to true
ALEO_USE_REAL_NETWORK=true
```

**2. Restart the relayer:**
```bash
npm start
```

**3. Create an intent:**
The transaction will now be broadcast to the real Aleo testnet!

---

## How It Works

### Simulation Mode (Default)
- `ALEO_USE_REAL_NETWORK=false`
- Generates transaction hashes locally
- Stores in memory for testing
- **No network broadcast**
- Perfect for development

### Real Network Mode
- `ALEO_USE_REAL_NETWORK=true`
- Creates real Aleo transactions
- Broadcasts to testnet
- Returns real transaction IDs
- **Requires Aleo testnet credits**

---

## Verification

### Check Logs

**Simulation Mode**:
```
[AleoTransactionService] Using SIMULATION mode
[AleoTransactionService] Request transfer transaction created
```

**Real Network Mode**:
```
[AleoTransactionService] Using REAL Aleo network mode
[AleoSDKService] Creating real Aleo transaction
[AleoSDKService] Real Aleo transaction broadcast { txHash: 'at1...' }
```

### Check Aleo Explorer

Visit: https://explorer.aleo.org/transaction/{txHash}

Replace `{txHash}` with your transaction ID to see it on the blockchain!

---

## Requirements for Real Network

### 1. Aleo Private Key
Must have credits on testnet:
```bash
# Check balance
curl https://api.explorer.provable.com/v2/testnet/address/{your_aleo_address}
```

### 2. Program Deployed
Verify `privacy_box_mvp.aleo` is on testnet:
```bash
curl https://api.explorer.provable.com/v2/testnet/program/privacy_box_mvp.aleo
```

✅ **Already deployed!** You're good to go.

### 3. Get Testnet Credits

**Option A**: Aleo Faucet
- Visit: https://faucet.aleo.org/
- Enter your Aleo address
- Request credits

**Option B**: Discord
- Join Aleo Discord
- Request credits in #faucet channel

---

## Testing Real Network

### Test 1: Check Configuration
```bash
# Verify environment variable is set
echo $ALEO_USE_REAL_NETWORK
# Should output: true
```

### Test 2: Create Intent
```bash
curl -X POST http://localhost:3001/api/intent \
  -H "Content-Type: application/json" \
  -d '{"chainId":11155111,"amount":"0.001","recipient":"0x604e6609a39861162FFAeA37E5fadDd6E91630Bb"}'
```

**Expected Response**:
```json
{
  "requestId": "at1abc...",
  "status": "pending"
}
```

### Test 3: Verify on Explorer
1. Copy the `requestId` (transaction hash)
2. Visit: `https://explorer.aleo.org/transaction/at1abc...`
3. Confirm transaction is on testnet!

---

## Render Deployment

### Update Render Environment

1. Go to Render Dashboard
2. Select **envelope-relayer** service
3. Navigate to **Environment**
4. Add/Update:
   ```
   ALEO_USE_REAL_NETWORK = true
   ```
5. Save - Render will auto-redeploy

###⚠️ Important

Real network mode will:
- Consume Aleo credits (transaction fees)
- Take ~30-60s for confirmations
- Require sufficient balance

**Start with simulation mode** for testing, then switch to real when ready!

---

## Troubleshooting

### Issue: "Insufficient credits"
**Solution**: Fund your Aleo address via faucet

### Issue: "Program not found"
**Solution**: Verify program ID in `.env` matches deployed program

### Issue: "Transaction broadcast failed"
**Solution**: Check Aleo RPC endpoint is responding:
```bash
curl https://api.explorer.provable.com/v2/testnet/latest/height
```

---

## Current Status

✅ **SDK Service Created**: `relayer/services/aleo.sdk.service.js`  
✅ **Feature Flag Added**: `ALEO_USE_REAL_NETWORK`  
✅ **Program Deployed**: `privacy_box_mvp.aleo` on testnet  
✅ **Ready to Enable**: Just flip the flag!  

**Next**: Set `ALEO_USE_REAL_NETWORK=true` when you're ready! 🚀
