import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceDisplayContainer } from './BalanceDisplayContainer';
import { useWalletStore } from '@/stores/wallet.store';

// Mock the wallet store
vi.mock('@/stores/wallet.store', () => ({
  useWalletStore: vi.fn(),
}));

describe('BalanceDisplayContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render wallet display with store data', () => {
    const mockState = {
      metamask: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '5.5',
        connected: true,
      },
      leoWallet: {
        address: 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        balance: '100.25',
        connected: true,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.getByTestId('balance-display-container')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-display')).toBeInTheDocument();
    expect(screen.getByTestId('metamask-balance')).toHaveTextContent('5.5000 ETH');
    expect(screen.getByTestId('leo-wallet-balance')).toHaveTextContent('100.2500 ALEO');
  });

  it('should render balance refresh button when wallets are connected', () => {
    const mockState = {
      metamask: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '5.5',
        connected: true,
      },
      leoWallet: {
        address: null,
        balance: null,
        connected: false,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.getByTestId('balance-refresh-button')).toBeInTheDocument();
  });

  it('should not render balance refresh button when no wallets are connected', () => {
    const mockState = {
      metamask: {
        address: null,
        balance: null,
        connected: false,
      },
      leoWallet: {
        address: null,
        balance: null,
        connected: false,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.queryByTestId('balance-refresh-button')).not.toBeInTheDocument();
  });

  it('should display no wallets message when no wallets are connected', () => {
    const mockState = {
      metamask: {
        address: null,
        balance: null,
        connected: false,
      },
      leoWallet: {
        address: null,
        balance: null,
        connected: false,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.getByTestId('no-wallets-message')).toBeInTheDocument();
  });

  it('should render only MetaMask balance when only MetaMask is connected', () => {
    const mockState = {
      metamask: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.0',
        connected: true,
      },
      leoWallet: {
        address: null,
        balance: null,
        connected: false,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.getByTestId('metamask-balance')).toBeInTheDocument();
    expect(screen.queryByTestId('leo-wallet-balance')).not.toBeInTheDocument();
  });

  it('should render only Leo Wallet balance when only Leo Wallet is connected', () => {
    const mockState = {
      metamask: {
        address: null,
        balance: null,
        connected: false,
      },
      leoWallet: {
        address: 'aleo1abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        balance: '50.0',
        connected: true,
      },
    };

    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector(mockState);
    });

    render(<BalanceDisplayContainer />);

    expect(screen.queryByTestId('metamask-balance')).not.toBeInTheDocument();
    expect(screen.getByTestId('leo-wallet-balance')).toBeInTheDocument();
  });
});
