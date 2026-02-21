"use client";

import React, { FC, useMemo, ReactNode, useEffect, useState, useRef } from "react";
import { WalletProvider as AleoWalletProvider, useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
  WalletReadyState,
} from "@demox-labs/aleo-wallet-adapter-base";
import type { WalletName } from "@demox-labs/aleo-wallet-adapter-base";
import { ShieldWalletAdapter } from "@/wallets/ShieldWalletAdapter";

// Import default styles
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

const WALLET_SELECTION_KEY = "walletName";
const WALLET_SELECTION_LEGACY_KEY = "envelop-wallet-name";
const WALLET_SELECTION_BACKUP_KEY = "envelop-wallet-name-backup";
const LAST_CONNECTED_WALLET_KEY = "envelop-last-connected-wallet";
const ENABLE_AUTO_RECONNECT = ["1", "true", "yes"].includes(
  String(process.env.NEXT_PUBLIC_WALLET_AUTO_RECONNECT || "false").toLowerCase()
);

function canAutoConnect(readyState: WalletReadyState): boolean {
  return (
    readyState === WalletReadyState.Installed ||
    readyState === WalletReadyState.Loadable
  );
}

function parseStoredWalletName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim();
    }
  } catch {
    // Raw fallback values are supported for backward compatibility.
  }
  return trimmed;
}

const WalletReconnectBridge: FC = () => {
  const { wallet, wallets, connected, connecting, connect, select } = useWallet();
  const restoredSelectionRef = useRef(false);
  const shouldReconnectRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const selectedName = wallet?.adapter?.name ? String(wallet.adapter.name) : "";
    if (selectedName) {
      window.localStorage.setItem(WALLET_SELECTION_BACKUP_KEY, selectedName);
    }
    if (connected && selectedName) {
      window.localStorage.setItem(LAST_CONNECTED_WALLET_KEY, selectedName);
    }
  }, [wallet?.adapter?.name, connected]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredSelectionRef.current) return;
    if (wallet) {
      restoredSelectionRef.current = true;
      return;
    }

    const preferredWalletName = parseStoredWalletName(
      window.localStorage.getItem(WALLET_SELECTION_KEY)
    );
    const legacyWalletName = parseStoredWalletName(
      window.localStorage.getItem(WALLET_SELECTION_LEGACY_KEY)
    );
    const backupWalletName = parseStoredWalletName(
      window.localStorage.getItem(WALLET_SELECTION_BACKUP_KEY)
    );

    const selectedWalletName = preferredWalletName || legacyWalletName || backupWalletName;
    if (!selectedWalletName) {
      const firstInstalled = wallets.find((registeredWallet) =>
        canAutoConnect(registeredWallet.readyState)
      );
      if (firstInstalled) {
        select(firstInstalled.adapter.name as WalletName);
      }
      restoredSelectionRef.current = true;
      return;
    }

    const knownWallet = wallets.some(
      (registeredWallet) => String(registeredWallet.adapter.name) === selectedWalletName
    );
    if (!knownWallet) {
      restoredSelectionRef.current = true;
      return;
    }

    if (legacyWalletName && !preferredWalletName) {
      window.localStorage.setItem(WALLET_SELECTION_KEY, JSON.stringify(legacyWalletName));
    }

    const lastConnectedWalletName = window.localStorage.getItem(LAST_CONNECTED_WALLET_KEY);
    shouldReconnectRef.current = lastConnectedWalletName
      ? lastConnectedWalletName === selectedWalletName
      : true;
    reconnectAttemptedRef.current = false;
    select(selectedWalletName as WalletName);
    restoredSelectionRef.current = true;
  }, [wallet, wallets, select]);

  useEffect(() => {
    if (!ENABLE_AUTO_RECONNECT) return;
    if (!wallet || connected || connecting) return;
    if (!shouldReconnectRef.current || reconnectAttemptedRef.current) return;
    if (!canAutoConnect(wallet.readyState)) return;

    reconnectAttemptedRef.current = true;
    const timerId = window.setTimeout(() => {
      connect(
        DecryptPermission.NoDecrypt,
        WalletAdapterNetwork.Testnet,
        []
      ).catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[WalletProvider] Auto-reconnect skipped:", error);
        }
      });
    }, 150);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [wallet, connected, connecting, connect]);

  return null;
};

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
      decryptPermission={DecryptPermission.NoDecrypt}
      network={WalletAdapterNetwork.Testnet}
      autoConnect={false}
      localStorageKey={WALLET_SELECTION_KEY}
      onError={(error) => {
        // Suppress known initialization errors - these are expected behavior
        // The WalletModal tries to auto-connect in useLayoutEffect, which can cause these errors
        // This doesn't prevent manual connection when user clicks the button
        const errorMessage = error?.message || error?.toString() || '';
        const errorName = error?.name || '';
        const normalizedErrorMessage = errorMessage.toLowerCase();

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

        // Expired wallet sessions can happen after extension idle timeout.
        // We recover in page actions, so suppress noisy console errors.
        if (
          normalizedErrorMessage.includes('dapp not connected') &&
          normalizedErrorMessage.includes('connection expired')
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WalletProvider] Suppressed expected session-expired wallet error');
          }
          return;
        }

        // Log other errors for debugging
        console.error('Wallet adapter error:', error);
      }}
    >
      <WalletReconnectBridge />
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
