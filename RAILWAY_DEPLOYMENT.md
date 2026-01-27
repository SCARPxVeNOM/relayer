# Privacy Bridge - Railway Deployment Guide

## Quick Deploy

### 1. Install Railway CLI
```powershell
# Windows (PowerShell)
npm install -g @railway/cli

# Or with Scoop
scoop install railway
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
cd "c:\Users\aryan\Desktop\envelop - Copy"
railway init
```

### 4. Link to GitHub (Optional)
You can also connect directly from [railway.app](https://railway.app/) via GitHub.

### 5. Set Environment Variables
```bash
railway variables set ALEO_PRIVATE_KEY="APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3"
railway variables set ALEO_RPC="https://api.explorer.provable.com/v2/testnet"
railway variables set ALEO_RPC1="https://api.explorer.provable.com/v1"
railway variables set ALEO_USE_REAL_NETWORK="true"
railway variables set ALEO_VIEW_KEY="AViewKey1och9WjNiDCgecHqS55mhE6zSzotuXexkTZTDhNcPqDFf"
railway variables set DB_PATH="/tmp/transactions.db"
railway variables set MAX_BATCH_SIZE="5"
railway variables set MAX_BATCH_WAIT_TIME="10000"
railway variables set POLYGON_AMOY_RPC="https://rpc-amoy.polygon.technology"
railway variables set RELAYER_PK="8c6f10acb86aeab293bd60bcf7d0e69f70643f8d219b81b6665885844abc3a9c"
railway variables set RELAYER_PK_2="393b61ca1c14461651d62e4fd8b425f9300d2ce7ef1df36502b13da562710f33"
railway variables set SEPOLIA_RPC="https://sepolia.infura.io/v3/37a2e60534814bcfbb9255daf180d3a4"
railway variables set LEO_PATH="/root/.cargo/bin/leo"
```

### 6. Deploy
```bash
railway up
```

## Alternative: Deploy via Dashboard

1. Go to [railway.app](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `relayer` repository
4. Railway auto-detects Dockerfile
5. Add environment variables in **Variables** tab
6. Deploy!

## Resource Configuration

Railway auto-scales, but for ZK proofs you may want to configure:

1. Go to **Settings** → **Advanced**
2. Set **Memory**: 2GB+ recommended
3. Set **vCPUs**: 2+ recommended

## Pricing

| Plan | Features | Cost |
|------|----------|------|
| Hobby | $5 credit/month free | Free |
| Pro | Unlimited usage | $20/month + usage |

**For ZK proofs**: Pro plan recommended (~$20-30/month with usage)

## Useful Commands

```bash
# View logs
railway logs

# Check status
railway status

# Open deployed app
railway open

# SSH into container
railway shell

# View environment variables
railway variables
```

## Verify Deployment

```bash
curl https://your-app.up.railway.app/health
```
