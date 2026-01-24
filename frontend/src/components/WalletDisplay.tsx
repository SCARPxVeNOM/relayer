import React from 'react';

export interface WalletDisplayProps {
  metamaskAddress: string | null;
  metamaskBalance: string | null;
  leoWalletAddress: string | null;
  leoWalletBalance: string | null;
  metamaskConnected: boolean;
  leoWalletConnected: boolean;
}

export const WalletDisplay: React.FC<WalletDisplayProps> = ({
  metamaskAddress,
  metamaskBalance,
  leoWalletAddress,
  leoWalletBalance,
  metamaskConnected,
  leoWalletConnected,
}) => {
  const formatBalance = (balance: string | null) => {
    if (!balance) return '0.00';
    const num = parseFloat(balance);
    return num.toFixed(4);
  };

  return (
    <div className="wallet-display" data-testid="wallet-display">
      {metamaskConnected && metamaskAddress && (
        <div className="wallet-info" data-testid="metamask-display">
          <div className="wallet-label">MetaMask</div>
          <div className="wallet-address" data-testid="metamask-address">
            {metamaskAddress}
          </div>
          <div className="wallet-balance" data-testid="metamask-balance">
            Balance: {formatBalance(metamaskBalance)} ETH
          </div>
        </div>
      )}
      
      {leoWalletConnected && leoWalletAddress && (
        <div className="wallet-info" data-testid="leo-wallet-display">
          <div className="wallet-label">Leo Wallet</div>
          <div className="wallet-address" data-testid="leo-wallet-address">
            {leoWalletAddress}
          </div>
          <div className="wallet-balance" data-testid="leo-wallet-balance">
            Balance: {formatBalance(leoWalletBalance)} ALEO
          </div>
        </div>
      )}
      
      {!metamaskConnected && !leoWalletConnected && (
        <div className="no-wallets" data-testid="no-wallets-message">
          No wallets connected
        </div>
      )}
    </div>
  );
};
