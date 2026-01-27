# Privacy Bridge - Fly.io Deployment Guide

## Prerequisites

1. **Install Fly CLI**:
   ```powershell
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Or with Scoop
   scoop install flyctl
   ```

2. **Login to Fly.io**:
   ```bash
   fly auth login
   ```

## Deployment Steps

### 1. Create the App (First Time Only)

```bash
cd "c:\Users\aryan\Desktop\envelop - Copy"
fly launch --no-deploy
```

When prompted:
- **App name**: `privacy-bridge-relayer` (or your preferred name)
- **Region**: Pick closest to you (sjc = San Jose)
- **Would you like to set up a Postgresql database?**: **No**
- **Would you like to set up an Upstash Redis database?**: **No**
- **Would you like to deploy now?**: **No**

### 2. Set Secrets (Environment Variables)

```bash
# Set sensitive environment variables as secrets
fly secrets set ALEO_PRIVATE_KEY="APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3"
fly secrets set RELAYER_PK="your-evm-private-key-here"
fly secrets set SEPOLIA_RPC="https://sepolia.infura.io/v3/YOUR_KEY"
fly secrets set POLYGON_AMOY_RPC="https://rpc-amoy.polygon.technology"
```

### 3. Deploy

```bash
fly deploy
```

⚠️ **First deployment takes 15-20 minutes** (compiling Rust + Leo CLI)

### 4. Check Status

```bash
# View logs
fly logs

# Check app status
fly status

# Open health endpoint
fly open /health
```

## Configuration Details

| Setting | Value | Why |
|---------|-------|-----|
| Memory | 2GB | Required for ZK proof generation |
| CPUs | 2 | Faster proof computation |
| auto_stop | false | Keep running for blockchain listener |
| Region | sjc | Low latency to Aleo nodes |

## Pricing

| Resource | Fly.io Cost |
|----------|-------------|
| 2GB RAM + 2 vCPU | ~$15-20/month |
| Bandwidth | First 100GB free |
| Build minutes | Free tier available |

## Useful Commands

```bash
# View logs in real-time
fly logs -f

# SSH into container
fly ssh console

# Scale resources
fly scale memory 4096  # Increase to 4GB if needed
fly scale count 1      # Number of instances

# Restart app
fly apps restart

# Check secrets
fly secrets list
```

## Troubleshooting

### Build Timeout
If build times out, increase build timeout:
```bash
fly deploy --build-timeout 1800  # 30 minutes
```

### Out of Memory
If ZK proofs fail, increase memory:
```bash
fly scale memory 4096
```

### Check Leo Installation
```bash
fly ssh console
leo --version
```

## Verify Deployment

After deployment, test the API:
```bash
curl https://privacy-bridge-relayer.fly.dev/health
```

Expected response:
```json
{"status":"healthy","uptime":123.45}
```
