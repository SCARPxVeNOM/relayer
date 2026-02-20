"use client";

import React, { FC, useMemo, ReactNode, useEffect, useState } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { ShieldWalletAdapter } from "@/wallets/ShieldWalletAdapter";

// Import default styles
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [initTime] = useState(() => Date.now());

  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter({
        appName: "Envelop Private Finance",
      }),
      new LeoWalletAdapter({
        appName: "Envelop Private Finance",
      }),
    ],
    []
  );

  // Check wallet extension availability for debugging during development.
  useEffect(() => {
    const checkWallet = () => {
      const shieldWallet = typeof window !== 'undefined' && (window as any).shieldWallet;
      const shield = typeof window !== 'undefined' && (window as any).shield;
      const leoWallet = typeof window !== 'undefined' && (window as any).leoWallet;
      const leo = typeof window !== 'undefined' && (window as any).leo;
      const hasShieldWallet = shieldWallet || shield;
      const hasLeoWallet = leoWallet || leo;

      if (process.env.NODE_ENV === 'development') {
        console.log('[WalletProvider] Wallet detection:', {
          shieldAvailable: !!hasShieldWallet,
          shieldWallet: shieldWallet ? 'Found' : 'Not found',
          shield: shield ? 'Found' : 'Not found',
          leoAvailable: !!hasLeoWallet,
          leoWallet: leoWallet ? 'Found' : 'Not found',
          leo: leo ? 'Found' : 'Not found'
        });
      }
    };

    // Check immediately
    checkWallet();

    // Also check after a short delay to handle race conditions
    const timeoutId = setTimeout(checkWallet, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={true}
      onError={(error) => {
        // Suppress known initialization errors - these are expected behavior
        // The WalletModal tries to auto-connect in useLayoutEffect, which can cause these errors
        // This doesn't prevent manual connection when user clicks the button
        const errorMessage = error?.message || error?.toString() || '';
        const errorName = error?.name || '';

        // Only suppress initialization errors during the first 5 seconds
        const timeSinceInit = Date.now() - initTime;
        const isInitPhase = timeSinceInit < 5000;

        // Check for invalid params error (happens during modal auto-connect)
        if (
          isInitPhase &&
          (errorMessage.includes('invalid') ||
            errorMessage.includes('INVALID_PARAMS') ||
            errorMessage.includes('Some of the parameters'))
        ) {
          // Silently suppress - this is expected during modal initialization
          if (process.env.NODE_ENV === 'development') {
            console.log('[WalletProvider] Suppressed initialization error (invalid params)');
          }
          return;
        }

        // Check for WalletNotReadyError (happens when wallet isn't initialized yet)
        if (
          isInitPhase &&
          (errorName === 'WalletNotReadyError' ||
            errorMessage.includes('WalletNotReadyError') ||
            errorMessage.includes('Wallet not ready') ||
            errorMessage.includes('wallet is not ready'))
        ) {
          // Silently suppress - this is expected during initial render
          // User can still connect manually via WalletMultiButton
          if (process.env.NODE_ENV === 'development') {
            console.log('[WalletProvider] Suppressed initialization error (wallet not ready)');
          }
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
