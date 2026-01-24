import React, { useEffect } from 'react';
import { useWalletStore } from '@/stores/wallet.store';

export interface BalanceRefreshProps {
  autoRefreshInterval?: number; // in milliseconds, default 10000 (10 seconds)
}

export const BalanceRefresh: React.FC<BalanceRefreshProps> = ({ 
  autoRefreshInterval = 10000 
}) => {
  const refreshBalances = useWalletStore((state) => state.refreshBalances);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Auto-refresh balances every interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshBalances();
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, refreshBalances]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleManualRefresh}
      disabled={isRefreshing}
      className="balance-refresh-button"
      data-testid="balance-refresh-button"
      aria-label="Refresh balances"
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
    </button>
  );
};
