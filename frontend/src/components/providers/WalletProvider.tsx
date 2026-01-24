"use client";

import React, { FC, useMemo, ReactNode } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

// Import default styles
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: "Privacy Interface",
      }),
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={false}
      onError={(error) => {
        // Suppress the "invalid parameters" error - it's a known issue with the adapter
        // The WalletModal tries to auto-connect in useLayoutEffect, which causes this error
        // This doesn't prevent manual connection when user clicks the button
        const errorMessage = error?.message || error?.toString() || '';
        const errorName = error?.name || '';
        
        // Check for invalid params error (happens during modal auto-connect)
        if (
          errorMessage.includes('invalid') || 
          errorMessage.includes('INVALID_PARAMS') ||
          errorMessage.includes('Some of the parameters')
        ) {
          // Silently suppress - this is expected during modal initialization
          // User can still connect manually via WalletMultiButton
          return;
        }
        
        // Log other errors for debugging
        console.error('Wallet adapter error:', error);
      }}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
