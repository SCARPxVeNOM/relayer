# Privacy Box Frontend

Web frontend for the Multi-Chain Privacy Barrier system. Enables private cross-chain transfers using Aleo, MetaMask, and Leo Wallet.

## Features

- 🔐 Dual wallet support (MetaMask + Leo Wallet)
- 🌐 Multi-chain transfers (Ethereum Sepolia, Polygon Amoy)
- 🔒 Privacy-preserving transactions via Aleo
- 📊 Real-time transaction monitoring
- 💰 Balance tracking across chains
- 📱 Responsive design for mobile and desktop

## Prerequisites

- Node.js 18+
- MetaMask browser extension
- Leo Wallet browser extension
- Testnet tokens (Sepolia ETH, Amoy MATIC, Aleo testnet tokens)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
src/
├── components/     # React components
├── services/       # Wallet connectors and API clients
├── stores/         # Zustand state management
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── config/         # Configuration
└── test/           # Test setup and utilities
```

## Technology Stack

- **React 18+** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **ethers.js** - Ethereum interaction
- **Vitest** - Testing framework
- **fast-check** - Property-based testing

## Development

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
