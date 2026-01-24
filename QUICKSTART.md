# 🚀 Quick Start Guide

Get your Multi-Chain Privacy Barrier MVP running in 5 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Rust & Cargo installed (for Leo)
- [ ] Testnet tokens ready (Sepolia ETH, Amoy MATIC)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Generate a new relayer private key (easiest method)
npm run generate:key

# This will:
# - Generate a new random private key
# - Show you the relayer address
# - Automatically update .env file
# - Tell you where to get testnet tokens

# OR manually edit .env with:
# - RELAYER_PK: Your wallet private key (for signing transactions)
# - SEPOLIA_RPC: Ethereum Sepolia RPC URL
# - POLYGON_AMOY_RPC: Polygon Amoy RPC URL
```

### 3. Get Testnet Tokens

**Ethereum Sepolia:**
- Visit: https://sepoliafaucet.com
- Request ETH for your relayer address

**Polygon Amoy:**
- Visit: https://faucet.polygon.technology
- Request MATIC for your relayer address

### 4. Test Configuration

```bash
# Test relayer configuration
npm run test:relayer

# Check Leo installation (optional)
npm run check:leo
```

### 5. Deploy Aleo Program (Optional for MVP)

```bash
cd aleo/privacy_box
leo build
leo deploy
```

**Note:** For MVP testing, you can skip this and use the simulation mode.

### 6. Run the Relayer

```bash
# Start the relayer
npm start
```

The relayer will:
1. Simulate receiving a proof from Aleo
2. Execute a cross-chain transaction
3. Show transaction details

## Testing the MVP

### Test 1: Simulated Transfer to Sepolia

1. Set in `.env`:
   ```bash
   SIMULATED_CHAIN_ID=11155111
   SIMULATED_RECIPIENT=0xYourReceiverAddress
   SIMULATED_AMOUNT=0.01
   ```

2. Run:
   ```bash
   npm start
   ```

3. Check transaction on [Sepolia Explorer](https://sepolia.etherscan.io)

### Test 2: Simulated Transfer to Polygon

1. Set in `.env`:
   ```bash
   SIMULATED_CHAIN_ID=80002
   SIMULATED_RECIPIENT=0xYourReceiverAddress
   SIMULATED_AMOUNT=0.01
   ```

2. Run:
   ```bash
   npm start
   ```

3. Check transaction on [Amoy Explorer](https://amoy.polygonscan.com)

## What's Happening?

```
User Request (Private)
    ↓
Aleo Testnet (Hides: amount, chain, destination)
    ↓
Relayer (Reads proof, executes transaction)
    ↓
Public Chain (Only sees relayer, not user)
```

## Troubleshooting

### "RELAYER_PK not set"
- Make sure `.env` exists and contains your private key
- Never commit `.env` to git!

### "Insufficient funds"
- Get testnet tokens from faucets
- Check your relayer address balance

### "Invalid RPC URL"
- Verify RPC URLs in `.env`
- Try public RPCs: `https://rpc.sepolia.org`

### Leo not found
- Install: `cargo install leo-lang`
- Or skip Leo deployment for MVP testing

## Next Steps

1. **Replace simulation** with real Aleo event listener
2. **Add frontend** for user interaction
3. **Deploy contracts** to testnets
4. **Add monitoring** and error handling

## Resources

- 📖 Full README: [README.md](./README.md)
- 🛠️ Detailed Setup: [SETUP.md](./SETUP.md)
- 🦁 Leo Docs: https://leo-lang.org
- 🔗 Aleo Explorer: https://explorer.aleo.org

---

**🎉 You're ready to go!** Start with `npm start` to test the relayer.

