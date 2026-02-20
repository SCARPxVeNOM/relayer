# Quickstart

## 1. Install dependencies

```bash
npm install
cd frontend && npm install
```

## 2. Configure environment

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

## 3. Run backend

```bash
npm start
```

Runs on `http://localhost:3001` by default.

## 4. Run frontend

```bash
cd frontend
npm run dev
```

Runs on `http://localhost:3000`.

## 5. Onboard

1. Open `/protocol`
2. Enter phone number
3. Send WhatsApp OTP
4. Verify OTP + set PIN
5. Connect Leo Wallet
6. Start using balances, swaps, payments, invoices (swap/invoice actions trigger on-chain signing)

If `OTP_PROVIDER=mock`, backend returns `devCode` in the OTP send response for local testing.

## 6. Non-mock blind relay

Set in `.env`:

```env
ALEO_RELAY_SUBMIT_URL=https://api.explorer.provable.com/v1/testnet/transaction/broadcast
ALEO_RELAY_PAYLOAD_MODE=raw
```
