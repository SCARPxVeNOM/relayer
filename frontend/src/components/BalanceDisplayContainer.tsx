import React from 'react';
import { useWalletStore } from '@/stores/wallet.store';
import { WalletDisplay } from './WalletDisplay';
import { BalanceRefresh } from './BalanceRefresh';

/**
 * Container component that integrates balance display with wallet store
 * Implements Requirements 8.1, 8.2, 8.3:
 * - 8.1: Display balance for both wallets
 * - 8.2: Auto-refresh balances every 10 seconds
 * - 8.3: Format amounts with proper decimals
 */
export const BalanceDisplayContainer: React.FC = () => {
  const metamaskAddress = useWalletStore((state) => state.metamask.address);
  const metamaskBalance = useWalletStore((state) => state.metamask.balance);
  const metamaskConnected = useWalletStore((state) => state.metamask.connected);
  
  const leoWalletAddress = useWalletStore((state) => state.leoWallet.address);
  const leoWalletBalance = useWalletStore((state) => state.leoWallet.balance);
  const leoWalletConnected = useWalletStore((state) => state.leoWallet.connected);

  return (
    <div className="balance-display-container" data-testid="balance-display-container">
      <WalletDisplay
        metamaskAddress={metamaskAddress}
        metamaskBalance={metamaskBalance}
        leoWalletAddress={leoWalletAddress}
        leoWalletBalance={leoWalletBalance}
        metamaskConnected={metamaskConnected}
        leoWalletConnected={leoWalletConnected}
      />
      
      {(metamaskConnected || leoWalletConnected) && (
        <BalanceRefresh autoRefreshInterval={10000} />
      )}
    </div>
  );
};
