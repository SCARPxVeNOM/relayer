import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletDisplay } from './WalletDisplay';

describe('WalletDisplay', () => {
  it('should display "No wallets connected" when no wallets are connected', () => {
    render(
      <WalletDisplay
        metamaskAddress={null}
        metamaskBalance={null}
        leoWalletAddress={null}
        leoWalletBalance={null}
        metamaskConnected={false}
        leoWalletConnected={false}
      />
    );

    expect(screen.getByTestId('no-wallets-message')).toBeInTheDocument();
    expect(screen.getByTestId('no-wallets-message')).toHaveTextContent('No wallets connected');
  });

  it('should display MetaMask wallet info when connected', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const balance = '1.5';

    render(
      <WalletDisplay
        metamaskAddress={address}
        metamaskBalance={balance}
        leoWalletAddress={null}
        leoWalletBalance={null}
        metamaskConnected={true}
        leoWalletConnected={false}
      />
    );

    expect(screen.getByTestId('metamask-display')).toBeInTheDocument();
    expect(screen.getByTestId('metamask-address')).toHaveTextContent(address);
    expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 1.5000 ETH');
  });

  it('should display Leo Wallet info when connected', () => {
    const address = 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const balance = '100.25';

    render(
      <WalletDisplay
        metamaskAddress={null}
        metamaskBalance={null}
        leoWalletAddress={address}
        leoWalletBalance={balance}
        metamaskConnected={false}
        leoWalletConnected={true}
      />
    );

    expect(screen.getByTestId('leo-wallet-display')).toBeInTheDocument();
    expect(screen.getByTestId('leo-wallet-address')).toHaveTextContent(address);
    expect(screen.getByTestId('leo-wallet-balance')).toHaveTextContent('Balance: 100.2500 ALEO');
  });

  it('should display both wallets when both are connected', () => {
    const metamaskAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const metamaskBalance = '1.5';
    const leoAddress = 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const leoBalance = '100.25';

    render(
      <WalletDisplay
        metamaskAddress={metamaskAddress}
        metamaskBalance={metamaskBalance}
        leoWalletAddress={leoAddress}
        leoWalletBalance={leoBalance}
        metamaskConnected={true}
        leoWalletConnected={true}
      />
    );

    expect(screen.getByTestId('metamask-display')).toBeInTheDocument();
    expect(screen.getByTestId('leo-wallet-display')).toBeInTheDocument();
    expect(screen.queryByTestId('no-wallets-message')).not.toBeInTheDocument();
  });

  it('should format balance with 4 decimal places', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const balance = '1.123456789';

    render(
      <WalletDisplay
        metamaskAddress={address}
        metamaskBalance={balance}
        leoWalletAddress={null}
        leoWalletBalance={null}
        metamaskConnected={true}
        leoWalletConnected={false}
      />
    );

    expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 1.1235 ETH');
  });

  it('should display 0.00 when balance is null', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';

    render(
      <WalletDisplay
        metamaskAddress={address}
        metamaskBalance={null}
        leoWalletAddress={null}
        leoWalletBalance={null}
        metamaskConnected={true}
        leoWalletConnected={false}
      />
    );

    expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 0.00 ETH');
  });
});
