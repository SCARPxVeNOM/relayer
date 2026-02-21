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
2. Connect Shield Wallet (or Leo Wallet) and complete wallet sign-in
3. Register your username (creates an on-chain `envelop_identity_v2.aleo/register_username` tx)
4. Start using balances, swaps, payments, invoices, and yield

If `OTP_PROVIDER=mock`, backend returns `devCode` in the OTP send response for local testing.

## 6. Non-mock blind relay

Set in `.env`:

```env
ALEO_RELAY_SUBMIT_URL=https://api.explorer.provable.com/v1/testnet/transaction/broadcast
ALEO_RELAY_PAYLOAD_MODE=raw
ALEO_IDENTITY_PROGRAM_ID=envelop_identity_v2.aleo
ENFORCE_ONCHAIN_LEDGER=true
IDENTITY_REQUIRE_ONCHAIN_RECIPIENT=true
ALEO_SWAP_ALLOWED_FUNCTIONS=create_swap_request,settle_swap,settle_swap_onchain
ALEO_PAYMENTS_ALLOWED_FUNCTIONS=create_payment_intent,settle_payment,settle_payment_onchain
ALEO_INVOICE_CREATE_ALLOWED_FUNCTIONS=create_invoice
ALEO_INVOICE_PAY_ALLOWED_FUNCTIONS=pay_invoice,pay_invoice_onchain
ALEO_YIELD_ALLOWED_FUNCTIONS=stake,stake_onchain,unstake,unstake_onchain,claim,claim_onchain,rebalance,rebalance_onchain
```
