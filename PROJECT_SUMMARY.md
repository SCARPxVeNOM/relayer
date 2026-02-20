# Project Summary (Updated)

## Product

Envelop is now an Aleo-native private fintech app:

- Private asset manager
- Private token swaps with explicit quotes/rates
- Private payments
- Private invoices
- Mobile onboarding with WhatsApp OTP + wallet binding

## Architecture

- `frontend/`: Next.js app with onboarding and product flows
- `relayer/`: API backend + SQLite persistence + blind relay endpoint
- `aleo/envelop_swap`: Leo program for private swap requests and settlement receipts
- `aleo/envelop_invoice`: Leo program for private invoices and payment receipts
- `aleo/envelop_payments`: Leo program for private payment intents and receipts

## Key backend additions

- OTP auth (`/api/auth/otp/send`, `/api/auth/otp/verify`)
- Encrypted wallet binding (private key + view key encrypted at rest)
- Balances, swaps, payments, invoices APIs
- Blind relay submission API (`/api/relay/submit`)
- Relay status API (`/api/relay/status/:txId`)

## Status

Core MVP flows are implemented end-to-end for demo/testing in this repo.
