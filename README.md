# Multi-Chain Privacy Barrier — MVP

🎯 **Complete MVP for private cross-chain transfers using Aleo**

## 🏗️ Architecture

```
Frontend (optional)
   ↓
Aleo Testnet (PRIVATE) ← Amount, chain_id, destination are private
   ↓
Relayer (Node.js) ← Reads proofs, executes public chain transactions
   ↓
ETH Sepolia / Polygon Amoy ← Public chains cannot trace the user
```

## 📁 Project Structure

```
privacy-box-mvp/
├── aleo/
│   └── privacy_box/
│       ├── program.json
│       └── main.leo          # Leo program with private transfers
├── relayer/
│   ├── index.js              # Main relayer logic
│   ├── eth.js                # Ethereum Sepolia handler
│   ├── polygon.js            # Polygon Amoy handler
│   └── config.js             # Chain configuration
├── contracts/
│   └── Receiver.sol          # Simple receiver contract
├── package.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Install Leo CLI**
   ```bash
   cargo install leo-lang
   ```

2. **Install Node.js** (v18+)
   ```bash
   node --version
   ```

3. **Get Testnet Tokens**
   - **Ethereum Sepolia**: [sepoliafaucet.com](https://sepoliafaucet.com)
   - **Polygon Amoy**: [faucet.polygon.technology](https://faucet.polygon.technology)

### Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   
   # Generate a new relayer private key (recommended)
   npm run generate:key
   
   # OR manually edit .env with your relayer private key and RPC URLs
   # See docs/RELAYER_KEY_GUIDE.md for details
   ```

3. **Deploy Aleo Program**
   ```bash
   cd aleo/privacy_box
   leo deploy
   ```

4. **Deploy Solidity Contracts** (optional, for testing)
   ```bash
   # Deploy Receiver.sol to Sepolia and Amoy
   # Use Remix, Hardhat, or Foundry
   ```

5. **Run Relayer**
   ```bash
   npm start
   # or
   node relayer/index.js
   ```

## 🔐 How It Works

### 1. Aleo Program (`main.leo`)

The Leo program provides:
- **Vault Record**: Stores user's private balance
- **request_transfer**: Private transition that hides:
  - Transfer amount
  - Destination chain (chain_id)
  - Destination address

**What's Private:**
- ✅ `amount` - Transfer amount
- ✅ `chain_id` - Target chain
- ✅ `dest` - Destination address

**What's Public:**
- ✅ Vault owner
- ✅ Vault balance (after update)

### 2. Relayer (`relayer/index.js`)

The relayer:
1. Listens for Aleo proofs/events (simulated in MVP)
2. Extracts private data (amount, chain_id, destination)
3. Executes transaction on appropriate public chain
4. Public chains only see relayer address, not the user

### 3. Public Chain Contracts

Simple receiver contracts on:
- **Ethereum Sepolia**: Receives ETH
- **Polygon Amoy**: Receives MATIC

## 🧪 Testing

### Test Aleo Program

```bash
cd aleo/privacy_box

# Initialize vault
leo run init aleo1xxx... 100u64

# Request transfer (private)
leo run request_transfer "{
  owner: aleo1xxx...,
  balance: 100u64
}" 10u64 1u8 aleo1yyy...
```

### Test Relayer

```bash
# Set simulation variables in .env
SIMULATED_CHAIN_ID=11155111  # ETH Sepolia
SIMULATED_RECIPIENT=0x...
SIMULATED_AMOUNT=0.01

# Run relayer
npm start
```

## 🔒 Privacy Guarantees

| Feature | Status |
|---------|--------|
| Aleo privacy | ✅ Amount, chain, destination hidden |
| Multi-chain | ✅ ETH Sepolia + Polygon Amoy |
| Relayer abstraction | ✅ User identity protected |
| Untraceability | ✅ Public chains can't trace user |
| Testnet ready | ✅ Full testnet support |

## 📝 Environment Variables

```bash
# Required
RELAYER_PK=your_private_key          # Primary relayer private key for signing public chain txs
SEPOLIA_RPC=https://...              # Ethereum Sepolia RPC endpoint
POLYGON_AMOY_RPC=https://...         # Polygon Amoy RPC endpoint

# Aleo Integration (Required for real Aleo monitoring)
ALEO_VIEW_KEY=your_view_key          # Aleo view key for decrypting private inputs
ALEO_PROGRAM_ID=privacy_box_mvp.aleo # Aleo program ID (default: privacy_box_mvp.aleo)
ALEO_RPC=https://api.explorer.provable.com/v1/testnet3  # Aleo RPC endpoint (optional)
ALEO_POLL_INTERVAL=10000             # Polling interval in ms (default: 10000)

# Multiple Wallets (Optional - for parallel execution)
RELAYER_PK_2=your_second_key         # Additional relayer key for ETH
RELAYER_PK_3=your_third_key          # Additional relayer key for ETH
POLYGON_RELAYER_PK=your_polygon_key  # Polygon-specific relayer key (falls back to RELAYER_PK)
POLYGON_RELAYER_PK_2=your_polygon_key_2  # Additional Polygon relayer key

# Batching Configuration (Optional)
MAX_BATCH_SIZE=5                     # Maximum batch size before execution (default: 5)
MAX_BATCH_WAIT_TIME=10000            # Maximum wait time in ms before execution (default: 10000)

# Optional (for simulation mode - deprecated, use real Aleo integration)
ENABLE_SIMULATION=false              # Set to true to use simulation mode
SIMULATED_CHAIN_ID=11155111          # Chain ID to simulate
SIMULATED_RECIPIENT=0x...            # Recipient address
SIMULATED_AMOUNT=0.01                # Amount to send
```

## ✨ New Features (Implemented)

1. **Real Aleo Integration** ✅
   - Polls Aleo testnet blocks for `request_transfer` executions
   - Decrypts private inputs using view key
   - Extracts transfer intent (amount, chain_id, destination)

2. **Batching System** ✅
   - In-memory queue grouped by chainId
   - Batches based on max size (default: 5) or max wait time (default: 10s)
   - Non-blocking batch execution

3. **Parallel Execution** ✅
   - Multiple relayer wallets per chain
   - Independent nonce management per wallet
   - Parallel batch execution with Promise.allSettled
   - Fault isolation (one wallet failure doesn't block others)

## 🛠️ Architecture

```
Aleo Testnet (privacy_box_mvp.aleo)
    ↓
aleo.listener.js (polls blocks, decrypts with view key)
    ↓
batch.queue.js (groups by chainId, batches by size/time)
    ↓
executor.eth.js / executor.polygon.js (parallel execution)
    ↓
Ethereum Sepolia / Polygon Amoy
```

## 🛠️ Next Steps (Post-MVP)

1. **Enhanced Aleo SDK Integration**
   - Full SDK-based decryption (@provablehq/sdk)
   - Improved view key handling

2. **Additional Features**
   - Frontend UI
   - Advanced wallet selection (balance-based)
   - Rate limiting for Aleo API

3. **Production Hardening**
   - Monitoring & alerts
   - Gas optimization
   - Security audits
   - Database persistence for processed transactions

## 📚 Resources

- **Leo Language**: [leo-lang.org](https://leo-lang.org)
- **Leo GitHub**: [github.com/ProvableHQ/leo](https://github.com/ProvableHQ/leo)
- **Aleo Explorer**: [explorer.aleo.org](https://explorer.aleo.org)
- **Ethereum Sepolia**: [sepolia.etherscan.io](https://sepolia.etherscan.io)
- **Polygon Amoy**: [amoy.polygonscan.com](https://amoy.polygonscan.com)

## ⚠️ Security Notes

- **Never commit `.env`** - Contains private keys
- **Use testnet only** - This is an MVP
- **Relayer key security** - Store securely, use hardware wallet for production
- **Aleo keys** - Keep private keys safe

## 📄 License

MIT

---

**🎉 MVP Complete!** This demonstrates private cross-chain transfers where public chains cannot trace the original user.

