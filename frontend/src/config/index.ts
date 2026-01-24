export const config = {
  aleo: {
    programId: process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID || 'privacy_box_mvp.aleo',
    explorer: process.env.NEXT_PUBLIC_ALEO_EXPLORER || 'https://explorer.aleo.org',
  },
  relayer: {
    apiUrl: process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3000',
  },
  chains: {
    sepolia: {
      chainId: parseInt(process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID || '11155111'),
      name: 'Ethereum Sepolia',
      rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      explorer: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER || 'https://sepolia.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia ETH',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    amoy: {
      chainId: parseInt(process.env.NEXT_PUBLIC_AMOY_CHAIN_ID || '80002'),
      name: 'Polygon Amoy',
      rpcUrl: process.env.NEXT_PUBLIC_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      explorer: process.env.NEXT_PUBLIC_AMOY_EXPLORER || 'https://amoy.polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18,
      },
    },
  },
} as const;

export const SUPPORTED_CHAIN_IDS = [
  config.chains.sepolia.chainId,
  config.chains.amoy.chainId,
] as const;

export type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number];
