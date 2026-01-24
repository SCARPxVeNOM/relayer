# 🔑 Relayer Private Key Guide

## What is a Relayer Private Key?

The **relayer private key** is used to sign transactions on public chains (Ethereum Sepolia and Polygon Amoy). The relayer wallet holds testnet tokens and executes cross-chain transfers on behalf of users.

**Important:** The relayer key is different from user keys. Users interact privately on Aleo, while the relayer executes public transactions.

## 🎯 How to Get a Relayer Private Key

### Method 1: Generate New Key (Recommended for Testnet)

Use the provided script to generate a new random key:

```bash
node scripts/generate-relayer-key.js
```

This will:
- Generate a new random Ethereum-compatible private key
- Display the private key and address
- Automatically update your `.env` file
- Show you where to get testnet tokens

### Method 2: Use Existing Wallet

If you already have a MetaMask or other wallet:

1. **Export Private Key from MetaMask:**
   - Open MetaMask
   - Click account menu (top right)
   - Account Details → Show Private Key
   - Copy the private key

2. **Or use an existing private key:**
   - Any Ethereum-compatible private key works
   - Format: `0x...` (64 hex characters)

### Method 3: Generate with Node.js

```bash
node -e "const { ethers } = require('ethers'); console.log(ethers.Wallet.createRandom().privateKey)"
```

### Method 4: Use Hardhat/Foundry

```bash
# With Hardhat
npx hardhat node
# Check console for generated accounts

# With Foundry
cast wallet new
```

## 📝 Setting Up the Key

1. **Copy the private key** (starts with `0x`)

2. **Add to `.env` file:**
   ```bash
   RELAYER_PK=0xYourPrivateKeyHere
   ```

3. **Get the relayer address:**
   ```bash
   node -e "const { ethers } = require('ethers'); const w = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log(w.address)"
   ```

4. **Fund the relayer address:**
   - **Ethereum Sepolia:** https://sepoliafaucet.com
   - **Polygon Amoy:** https://faucet.polygon.technology

## 🔒 Security Best Practices

### ✅ For Testnet (MVP)

- Use a dedicated testnet wallet
- Never use your mainnet private key
- It's okay to use the same key for both Sepolia and Amoy (testnet only)
- Store in `.env` file (never commit to git)

### ⚠️ For Production (Future)

- Use a hardware wallet or secure key management
- Rotate keys regularly
- Use different keys for different chains
- Implement key encryption at rest
- Use a key management service (AWS KMS, HashiCorp Vault, etc.)

## 🧪 Testing Your Setup

1. **Verify key is set:**
   ```bash
   npm run test:relayer
   ```

2. **Check address has funds:**
   - Visit Sepolia Explorer: https://sepolia.etherscan.io
   - Visit Amoy Explorer: https://amoy.polygonscan.com
   - Search for your relayer address

3. **Test transaction:**
   ```bash
   npm start
   ```

## 📋 Quick Reference

| Item | Description |
|------|-------------|
| **Format** | `0x` followed by 64 hex characters |
| **Length** | 66 characters total |
| **Example** | `0x1234567890abcdef...` |
| **Storage** | `.env` file (never commit!) |
| **Usage** | Signs transactions on public chains |

## ❓ FAQ

### Q: Can I use the same key for Sepolia and Amoy?
**A:** Yes, for testnet. The same Ethereum-compatible private key works on both chains.

### Q: Do I need separate keys for different chains?
**A:** No, one key works for all EVM-compatible chains (Ethereum, Polygon, etc.)

### Q: How much testnet tokens do I need?
**A:** 
- Sepolia ETH: ~0.1 ETH (for gas)
- Amoy MATIC: ~1 MATIC (for gas)

### Q: What if I lose my private key?
**A:** Generate a new one and update `.env`. You'll need to fund the new address again.

### Q: Can I use a mnemonic phrase?
**A:** The relayer currently uses a private key. You can derive a private key from a mnemonic:
```bash
node -e "const { ethers } = require('ethers'); const w = ethers.Wallet.fromPhrase('your mnemonic phrase'); console.log(w.privateKey)"
```

## 🚨 Common Issues

### "Invalid private key"
- Make sure it starts with `0x`
- Check it's exactly 66 characters
- No extra spaces or newlines

### "Insufficient funds"
- Get testnet tokens from faucets
- Check address on block explorers
- Wait for faucet transactions to confirm

### "Transaction failed"
- Verify RPC URLs are correct
- Check network connectivity
- Ensure relayer has enough gas tokens

## 🎯 Example Workflow

```bash
# 1. Generate new key
node scripts/generate-relayer-key.js

# 2. Copy the address shown
# 3. Get testnet tokens for that address
# 4. Verify .env has RELAYER_PK set
# 5. Test
npm run test:relayer
npm start
```

---

**Remember:** This is for **TESTNET only**. Never use testnet keys for mainnet!

