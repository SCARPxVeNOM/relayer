# Quick Setup Guide

## Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Leo CLI (if not already installed)
cargo install leo-lang
```

## Step 2: Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add:
   - Your relayer private key (for signing transactions on public chains)
   - RPC URLs for Sepolia and Polygon Amoy
   - Simulation variables for testing

## Step 3: Get Testnet Tokens

### Ethereum Sepolia
- Visit: https://sepoliafaucet.com
- Request test ETH for your relayer address

### Polygon Amoy
- Visit: https://faucet.polygon.technology
- Request test MATIC for your relayer address

## Step 4: Deploy Aleo Program

```bash
cd aleo/privacy_box

# Build the program
leo build

# Deploy to Aleo testnet
leo deploy
```

**Note:** You'll need Aleo credits for deployment. Get them from:
- Aleo Testnet Faucet (if available)
- Or use existing Aleo account

## Step 5: Deploy Solidity Contracts (Optional)

Deploy `contracts/Receiver.sol` to:
- Ethereum Sepolia
- Polygon Amoy

You can use:
- **Remix IDE**: https://remix.ethereum.org
- **Hardhat**: Create a Hardhat project
- **Foundry**: Use `forge create`

## Step 6: Run the Relayer

```bash
# From project root
npm start

# Or directly
node relayer/index.js
```

## Testing the MVP

### Test 1: Simulate Aleo Proof

1. Set in `.env`:
   ```bash
   SIMULATED_CHAIN_ID=11155111  # ETH Sepolia
   SIMULATED_RECIPIENT=0xYourReceiverAddress
   SIMULATED_AMOUNT=0.01
   ```

2. Run relayer:
   ```bash
   npm start
   ```

3. Check Sepolia explorer for the transaction

### Test 2: Use Real Aleo Program

1. Initialize a vault:
   ```bash
   cd aleo/privacy_box
   leo run init aleo1your_address... 100u64
   ```

2. Request a transfer:
   ```bash
   leo run request_transfer "{
     owner: aleo1your_address...,
     balance: 100u64
   }" 10u64 1u8 aleo1destination...
   ```

3. Update relayer to parse real Aleo events (future step)

## Troubleshooting

### "RELAYER_PK not set"
- Make sure `.env` file exists and contains `RELAYER_PK`

### "Insufficient funds"
- Get testnet tokens from faucets
- Check your relayer address has enough ETH/MATIC

### "Invalid RPC URL"
- Verify RPC URLs in `.env` are correct
- Try public RPC endpoints if Infura key is missing

### Leo build errors
- Make sure Leo CLI is installed: `leo --version`
- Check Leo syntax matches latest version

## Next Steps

1. **Replace simulation with real Aleo integration**
   - Connect to Aleo testnet RPC
   - Parse transaction events
   - Extract proof data

2. **Add error handling**
   - Retry logic for failed transactions
   - Gas estimation
   - Transaction monitoring

3. **Add frontend** (optional)
   - React/Next.js interface
   - Connect to Aleo wallet
   - Submit transfer requests

4. **Production hardening**
   - Security audit
   - Gas optimization
   - Monitoring & alerts

