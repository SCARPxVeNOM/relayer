# Envelop: Aleo Private Finance with Username Identity

Envelop is an Aleo-native private fintech app with:

- Passkey (WebAuthn) + PIN onboarding (recommended)
- WhatsApp OTP onboarding fallback
- Backend shielded wallet binding (encrypted key storage)
- Private asset management for `ALEO` + ARC-21 style assets
- Private swap flow with explicit quotes/rates
- Private payments and invoice lifecycle
- On-chain username claim flow (`envelop_identity_v2.aleo/register_username`)
- On-chain-anchored username recipient resolution (send/invoice by `@username`)
- Blind relayer API for serialized Aleo transaction submission

## Aleo Programs (Testnet)

- `envelop_swap.aleo`
  - Deployment tx: `at13c8f75f26f5qqglvj2x5p4q9rchjezc7a3p8sdhwhyzzlsmk9yrqc3hl4g`
  - Frontend transition: `create_swap_request`
- `envelop_invoice.aleo`
  - Deployment tx: `at1k6dtpcrn4rzfa4zhs7w7k3qvplm0z79zt2n9wgg5lllzdrwrwufq4xm76r`
  - Frontend transitions: `create_invoice`, `pay_invoice`
- `envelop_payments.aleo`
  - Deployment tx: `at16z2907anpu3jaa887nuhd6drnhasdffyjmg989sk9s5mlycavygqzsyn35`
  - Frontend transition: `create_payment_intent`
- `envelop_yield.aleo`
  - Frontend transitions: `stake_onchain`, `unstake_onchain`, `claim_onchain`, `rebalance_onchain`
- `envelop_identity_v2.aleo`
  - Frontend transition: `register_username`
  - Used by backend `/api/me/profile` claim validation

## What changed

This project was refactored from cross-chain bridge intent logging into a single Aleo-focused product:

- Removed dependency on tunnel/bridge UX language
- Replaced bridge runtime with Aleo fintech backend APIs
- Added phone-to-wallet onboarding and encrypted key binding
- Added swap, payments, invoices, yield, and portfolio modules
- Added identity program wiring for username registration tied to wallet identity

## Repo layout

```text
aleo/
  envelop_swap/        # private swap request + settlement receipt records
  envelop_invoice/     # private invoice + payment receipt records
  envelop_payments/    # private payment intents + settlement records
  envelop_yield/       # private yield/stake transitions
  envelop_identity_v2/ # on-chain username claims

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
- `POST /api/auth/passkey/register/options`
- `POST /api/auth/passkey/register/verify`
- `POST /api/auth/passkey/login/options`
- `POST /api/auth/passkey/login/verify`

Authenticated (`Authorization: Bearer <token>`):

- `GET /api/me`
- `POST /api/me/profile`
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

For Passkey/WebAuthn, set:

- `PASSKEY_RP_NAME`
- `PASSKEY_RP_ID` (usually your domain)
- `PASSKEY_EXPECTED_ORIGINS` (comma-separated allowed origins)

`OTP_PROVIDER=mock` is only for local development and is blocked in production.

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
- Wallet binding is created after passkey registration (or OTP fallback verification).
- Username registration requires a confirmed `envelop_identity_v2.aleo/register_username` tx.
- Backend verifies username/display hashes and binds claim to the authenticated wallet.
- Recipient username resolution is claim-index-first (`identity_claims`) and can be enforced as on-chain-only via `IDENTITY_REQUIRE_ONCHAIN_RECIPIENT=true`.
- `ENFORCE_ONCHAIN_LEDGER=true` makes backend settlement on-chain-canonical (no local balance/position mutation in swap/payment/invoice/yield execution routes).
- Swap/payment/invoice/yield execute routes require a confirmed tx that matches allowed `program/function` policy for that feature.
- Execute routes verify tx owner against authenticated wallet (with optional fee-payer strict fallback via `ALEO_TX_ENFORCE_FEE_PAYER_MATCH=true`).
- Blind relay endpoint can accept serialized transactions without inspecting private payload contents.
- State-changing settlements (swap/payment/invoice/yield) require Aleo tx confirmation first.

## Notes

- Current swap module uses server-side quote + pool simulation for deterministic demo UX.
- Frontend signs on-chain swap/payment/invoice/yield/identity transitions through Shield/Leo Wallet and submits resulting `aleoTxId`.
- In `ENFORCE_ONCHAIN_LEDGER=true`, backend stores execution metadata only (local balances are non-authoritative cache).
- Transition allowlists are configurable via env:
  - `ALEO_SWAP_ALLOWED_FUNCTIONS`
  - `ALEO_PAYMENTS_ALLOWED_FUNCTIONS`
  - `ALEO_INVOICE_CREATE_ALLOWED_FUNCTIONS`
  - `ALEO_INVOICE_PAY_ALLOWED_FUNCTIONS`
  - `ALEO_YIELD_ALLOWED_FUNCTIONS`
- Blind relay is configured for non-mock mode via:
  - `ALEO_RELAY_SUBMIT_URL=https://api.explorer.provable.com/v1/testnet/transaction/broadcast`
  - `ALEO_RELAY_PAYLOAD_MODE=raw`
