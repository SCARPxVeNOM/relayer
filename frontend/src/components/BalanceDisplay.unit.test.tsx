import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WalletDisplay } from './WalletDisplay';
import { BalanceRefresh } from './BalanceRefresh';
import { useWalletStore } from '@/stores/wallet.store';

/**
 * Unit tests for balance display functionality
 * Requirements: 8.1, 8.2, 8.3
 */

// Mock the wallet store
vi.mock('@/stores/wallet.store', () => ({
  useWalletStore: vi.fn(),
}));

describe('Balance Display Unit Tests', () => {
  describe('Balance Rendering (Requirement 8.1)', () => {
    it('should render MetaMask balance when wallet is connected', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const balance = '5.5';

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

      const balanceElement = screen.getByTestId('metamask-balance');
      expect(balanceElement).toBeInTheDocument();
      expect(balanceElement).toHaveTextContent('Balance:');
      expect(balanceElement).toHaveTextContent('5.5000');
      expect(balanceElement).toHaveTextContent('ETH');
    });

    it('should render Leo Wallet balance when wallet is connected', () => {
      const address = 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const balance = '250.75';

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

      const balanceElement = screen.getByTestId('leo-wallet-balance');
      expect(balanceElement).toBeInTheDocument();
      expect(balanceElement).toHaveTextContent('Balance:');
      expect(balanceElement).toHaveTextContent('250.7500');
      expect(balanceElement).toHaveTextContent('ALEO');
    });

    it('should render both balances when both wallets are connected', () => {
      const metamaskAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const metamaskBalance = '10.5';
      const leoAddress = 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const leoBalance = '500.25';

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

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('10.5000 ETH');
      expect(screen.getByTestId('leo-wallet-balance')).toHaveTextContent('500.2500 ALEO');
    });

    it('should not render balance when wallet is not connected', () => {
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

      expect(screen.queryByTestId('metamask-balance')).not.toBeInTheDocument();
      expect(screen.queryByTestId('leo-wallet-balance')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-wallets-message')).toBeInTheDocument();
    });
  });

  describe('Balance Updates (Requirement 8.2)', () => {
    let mockRefreshBalances: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRefreshBalances = vi.fn().mockResolvedValue(undefined);
      
      (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        const mockState = {
          refreshBalances: mockRefreshBalances,
        };
        return selector(mockState);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should update balance display when balance prop changes', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const initialBalance = '5.0';
      const updatedBalance = '10.0';

      const { rerender } = render(
        <WalletDisplay
          metamaskAddress={address}
          metamaskBalance={initialBalance}
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('5.0000 ETH');

      rerender(
        <WalletDisplay
          metamaskAddress={address}
          metamaskBalance={updatedBalance}
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('10.0000 ETH');
    });

    it('should call refreshBalances when auto-refresh interval elapses', () => {
      vi.useFakeTimers();

      render(<BalanceRefresh autoRefreshInterval={10000} />);

      expect(mockRefreshBalances).toHaveBeenCalledTimes(0);

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);
      expect(mockRefreshBalances).toHaveBeenCalledTimes(1);

      // Fast-forward another 10 seconds
      vi.advanceTimersByTime(10000);
      expect(mockRefreshBalances).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should refresh balances within 10 seconds by default', () => {
      vi.useFakeTimers();

      render(<BalanceRefresh />);

      expect(mockRefreshBalances).toHaveBeenCalledTimes(0);

      // Fast-forward less than 10 seconds - should not refresh yet
      vi.advanceTimersByTime(9000);
      expect(mockRefreshBalances).toHaveBeenCalledTimes(0);

      // Fast-forward to 10 seconds - should refresh
      vi.advanceTimersByTime(1000);
      expect(mockRefreshBalances).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('Amount Formatting (Requirement 8.3)', () => {
    it('should format balance with exactly 4 decimal places', () => {
      const testCases = [
        { balance: '1', expected: '1.0000' },
        { balance: '1.1', expected: '1.1000' },
        { balance: '1.12', expected: '1.1200' },
        { balance: '1.123', expected: '1.1230' },
        { balance: '1.1234', expected: '1.1234' },
        { balance: '1.12345', expected: '1.1235' }, // Should round
        { balance: '1.123456789', expected: '1.1235' }, // Should round
      ];

      testCases.forEach(({ balance, expected }) => {
        const { unmount } = render(
          <WalletDisplay
            metamaskAddress="0x1234567890abcdef1234567890abcdef12345678"
            metamaskBalance={balance}
            leoWalletAddress={null}
            leoWalletBalance={null}
            metamaskConnected={true}
            leoWalletConnected={false}
          />
        );

        expect(screen.getByTestId('metamask-balance')).toHaveTextContent(`Balance: ${expected} ETH`);
        unmount();
      });
    });

    it('should format zero balance correctly', () => {
      render(
        <WalletDisplay
          metamaskAddress="0x1234567890abcdef1234567890abcdef12345678"
          metamaskBalance="0"
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 0.0000 ETH');
    });

    it('should format null balance as 0.00', () => {
      render(
        <WalletDisplay
          metamaskAddress="0x1234567890abcdef1234567890abcdef12345678"
          metamaskBalance={null}
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 0.00 ETH');
    });

    it('should format large balances correctly', () => {
      const largeBalance = '1234567.89';

      render(
        <WalletDisplay
          metamaskAddress="0x1234567890abcdef1234567890abcdef12345678"
          metamaskBalance={largeBalance}
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 1234567.8900 ETH');
    });

    it('should format small balances correctly', () => {
      const smallBalance = '0.00001234';

      render(
        <WalletDisplay
          metamaskAddress="0x1234567890abcdef1234567890abcdef12345678"
          metamaskBalance={smallBalance}
          leoWalletAddress={null}
          leoWalletBalance={null}
          metamaskConnected={true}
          leoWalletConnected={false}
        />
      );

      expect(screen.getByTestId('metamask-balance')).toHaveTextContent('Balance: 0.0000 ETH');
    });

    it('should format Leo Wallet balance with 4 decimal places', () => {
      render(
        <WalletDisplay
          metamaskAddress={null}
          metamaskBalance={null}
          leoWalletAddress="aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
          leoWalletBalance="123.456789"
          metamaskConnected={false}
          leoWalletConnected={true}
        />
      );

      expect(screen.getByTestId('leo-wallet-balance')).toHaveTextContent('Balance: 123.4568 ALEO');
    });
  });
});
