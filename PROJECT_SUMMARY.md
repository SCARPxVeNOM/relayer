# Project Summary (Updated)

## Product

Envelop is now an Aleo-native private fintech app:

- Private asset manager
- Private token swaps with explicit quotes/rates
- Private payments
- Private invoices
- On-chain username registry tied to wallet identity
- Passkey + PIN onboarding (with WhatsApp OTP fallback) + wallet binding

## Architecture

- `frontend/`: Next.js app with onboarding and product flows
- `relayer/`: API backend + SQLite persistence + blind relay endpoint
- `aleo/envelop_swap`: Leo program for private swap requests and settlement receipts
- `aleo/envelop_invoice`: Leo program for private invoices and payment receipts
- `aleo/envelop_payments`: Leo program for private payment intents and receipts
- `aleo/envelop_yield`: Leo program for private staking/yield transitions
- `aleo/envelop_identity_v2`: Leo program for `register_username` identity claims with public hash inputs

## Key backend additions

- OTP auth (`/api/auth/otp/send`, `/api/auth/otp/verify`)
- Passkey auth (`/api/auth/passkey/*`)
- Encrypted wallet binding (private key + view key encrypted at rest)
- Balances, swaps, payments, invoices APIs
- Profile API (`/api/me/profile`) that verifies on-chain username claim tx
- Blind relay submission API (`/api/relay/submit`)
- Relay status API (`/api/relay/status/:txId`)
- Confirmation-gated settlement for swap/yield/payments/invoices

## Status

Core MVP flows are implemented end-to-end for demo/testing in this repo.
