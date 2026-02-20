# Envelop: Aleo Private Asset Manager + Swap + Payments + Invoices

Envelop is an Aleo-native private fintech app with:

- Mobile onboarding using WhatsApp OTP
- Backend shielded wallet binding (encrypted key storage)
- Private asset management for `ALEO` + ARC-21 style assets
- Private swap flow with explicit quotes/rates
- Private payments and invoice lifecycle
- Blind relayer API for serialized Aleo transaction submission

## Deployed Aleo Programs (Testnet)

- `envelop_swap.aleo`
  - Deployment tx: `at13c8f75f26f5qqglvj2x5p4q9rchjezc7a3p8sdhwhyzzlsmk9yrqc3hl4g`
  - Frontend transition: `create_swap_request`
- `envelop_invoice.aleo`
  - Deployment tx: `at1k6dtpcrn4rzfa4zhs7w7k3qvplm0z79zt2n9wgg5lllzdrwrwufq4xm76r`
  - Frontend transitions: `create_invoice`, `pay_invoice`
- `envelop_payments.aleo`
  - Deployment tx: `at16z2907anpu3jaa887nuhd6drnhasdffyjmg989sk9s5mlycavygqzsyn35`
  - Frontend transition: `create_payment_intent`

## What changed

This project was refactored from cross-chain bridge intent logging into a single Aleo-focused product:

- Removed dependency on tunnel/bridge UX language
- Replaced bridge runtime with Aleo fintech backend APIs
- Added phone-to-wallet onboarding and encrypted key binding
- Added swap, payments, invoices, and portfolio modules
- Added two Leo programs for swap/invoice record flows

## Repo layout

```text
aleo/
  envelop_swap/        # private swap request + settlement receipt records
  envelop_invoice/     # private invoice + payment receipt records

relayer/
  api/health.js        # HTTP server + route map
  api/routes/          # auth, assets, swap, payments, invoices, relay
  services/            # otp, wallet binding, swap logic
  storage/app.db.js    # SQLite persistence

frontend/
  app/page.tsx         # landing
  app/protocol/page.tsx# onboarding + app dashboard
  app/mission/page.tsx # live status + product definition
```

## Backend API summary

Public:

- `GET /health`
- `GET /status`
- `GET /api/telemetry`
- `GET /api/version`

Auth / onboarding:

- `POST /api/auth/otp/send`
- `POST /api/auth/otp/verify`

Authenticated (`Authorization: Bearer <token>`):

- `GET /api/me`
- `GET /api/assets/tokens`
- `GET /api/assets/balances`
- `GET /api/assets/activity`
- `POST /api/swap/quote`
- `POST /api/swap/execute`
- `GET /api/swaps`
- `POST /api/payments/send`
- `GET /api/payments`
- `POST /api/invoices`
- `GET /api/invoices`
- `POST /api/invoices/:id/pay`
- `POST /api/relay/submit`
- `GET /api/relay/submissions`
- `GET /api/relay/status/:txId`

## Local setup

### 1. Install

```bash
npm install
cd frontend && npm install
```

### 2. Configure env

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

For WhatsApp OTP on Twilio Verify, set:

- `OTP_PROVIDER=twilio_verify`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

If not set, backend uses `OTP_PROVIDER=mock` and returns `devCode` for local testing.

### 3. Run

```bash
# terminal 1
npm start

# terminal 2
cd frontend
npm run dev
```

Backend default: `http://localhost:3001`
Frontend default: `http://localhost:3000`

## Security model

- Backend never stores plaintext Aleo private keys.
- Private keys and view keys are encrypted with user PIN + server pepper.
- Wallet binding is per phone identity after OTP verification.
- Blind relay endpoint can accept serialized transactions without inspecting private payload contents.

## Notes

- Current swap module uses server-side quote + pool simulation for deterministic demo UX.
- Frontend now signs on-chain swap/invoice transitions through Leo Wallet and stores the resulting `aleoTxId` in backend records.
- Blind relay is configured for non-mock mode via:
  - `ALEO_RELAY_SUBMIT_URL=https://api.explorer.provable.com/v1/testnet/transaction/broadcast`
  - `ALEO_RELAY_PAYLOAD_MODE=raw`
