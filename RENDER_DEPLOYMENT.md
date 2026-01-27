# Privacy Bridge - Render Deployment with Leo CLI

## Overview

This project uses a Docker deployment on Render to support Leo CLI for real Aleo testnet transactions.

## Deployment Steps

### 1. Push to GitHub
```bash
git add -A
git commit -m "Add Docker deployment for Leo CLI"
git push origin main
```

### 2. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `privacy-bridge-relayer`
   - **Runtime**: **Docker** (NOT Node)
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Starter ($7/mo) or Standard ($25/mo) recommended

### 3. Set Environment Variables

In Render Dashboard → Environment:

| Variable | Value |
|----------|-------|
| `ALEO_PRIVATE_KEY` | `APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3` |
| `RELAYER_PK` | Your Sepolia/Polygon private key |
| `SEPOLIA_RPC` | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_AMOY_RPC` | `https://rpc-amoy.polygon.technology` |
| `ALEO_USE_REAL_NETWORK` | `true` |
| `LEO_PATH` | `/root/.cargo/bin/leo` |

### 4. Deploy

Click **Create Web Service** and wait for build (~10-15 minutes first time due to Rust/Leo compilation).

## Build Time

⚠️ **First build takes 10-15 minutes** because:
- Rust toolchain installation (~2 min)
- Leo CLI compilation from source (~8-10 min)
- Node.js dependencies (~1 min)

Subsequent builds use Docker layer caching and are faster.

## Plan Recommendations

| Plan | RAM | CPU | Recommendation |
|------|-----|-----|----------------|
| Free | 512MB | Shared | ❌ Too slow for ZK proofs |
| Starter | 512MB | 0.5 | ⚠️ Might timeout on proofs |
| Standard | 2GB | 1 | ✅ Recommended |
| Pro | 4GB | 2 | ✅ Best performance |

ZK proof generation requires significant CPU. **Standard plan or higher recommended**.

## Verification

After deployment, test:
```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{"status":"healthy","uptime":123.45}
```

## Costs

- **Render Standard Plan**: ~$25/month
- **Aleo Transactions**: ~0.001 credits/tx (~12,000 tx with 12 credits)

## Alternative: Simulation Mode

If you want to avoid Leo CLI build time, use simulation mode:

Set `ALEO_USE_REAL_NETWORK=false` in environment variables.

This simulates Aleo transactions (returns fake `at1...` IDs) but the EVM release still works on real Sepolia/Polygon.
