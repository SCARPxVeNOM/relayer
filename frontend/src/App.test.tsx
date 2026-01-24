import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useWalletStore } from './stores/wallet.store';

// Mock the wallet store
vi.mock('./stores/wallet.store');

// Mock the child components to simplify testing
vi.mock('./components', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
  WalletButton: ({ walletType, connected, onConnect, onDisconnect }: any) => (
    <button 
      data-testid={`wallet-button-${walletType}`}
      onClick={connected ? onDisconnect : onConnect}
    >
      {walletType} {connected ? 'Connected' : 'Connect'}
    </button>
  ),
  WalletDisplay: ({ address, walletType }: any) => (
    <div data-testid={`wallet-display-${walletType}`}>{address}</div>
  ),
  NetworkIndicator: ({ chainId }: any) => (
    <div data-testid="network-indicator">{chainId}</div>
  ),
  TransferForm: () => <div data-testid="transfer-form">Transfer Form</div>,
  TransactionHistory: () => <div data-testid="transaction-history">Transaction History</div>,
  BalanceDisplayContainer: ({ walletType, balance }: any) => (
    <div data-testid={`balance-${walletType}`}>{balance || '0'}</div>
  ),
}));

describe('App Layout', () => {
  const mockConnectMetaMask = vi.fn();
  const mockConnectLeoWallet = vi.fn();
  const mockDisconnectMetaMask = vi.fn();
  const mockDisconnectLeoWallet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(useWalletStore).mockReturnValue({
      metamask: {
        connected: false,
        address: null,
        chainId: null,
        balance: null,
      },
      leoWallet: {
        connected: false,
        address: null,
        balance: null,
      },
      connectMetaMask: mockConnectMetaMask,
      connectLeoWallet: mockConnectLeoWallet,
      disconnectMetaMask: mockDisconnectMetaMask,
      disconnectLeoWallet: mockDisconnectLeoWallet,
      updateMetaMaskNetwork: vi.fn(),
      refreshBalances: vi.fn(),
    });
  });

  describe('Layout Rendering', () => {
    it('should render the header with app title', () => {
      render(<App />);
      
      expect(screen.getByText('Privacy Barrier')).toBeInTheDocument();
      expect(screen.getByText('Cross-Chain Private Transfers')).toBeInTheDocument();
    });

    it('should render both wallet connection buttons in header', () => {
      render(<App />);
      
      expect(screen.getByTestId('wallet-button-metamask')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-button-leo')).toBeInTheDocument();
    });

    it('should render wallet status cards', () => {
      render(<App />);
      
      expect(screen.getByText('MetaMask Wallet')).toBeInTheDocument();
      expect(screen.getByText('Leo Wallet')).toBeInTheDocument();
    });

    it('should render transfer form section', () => {
      render(<App />);
      
      expect(screen.getByText('New Transfer')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-form')).toBeInTheDocument();
    });

    it('should render transaction history section', () => {
      render(<App />);
      
      // Check for the heading and the component
      expect(screen.getAllByText('Transaction History')).toHaveLength(2); // Heading + mocked component
      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });

    it('should render footer with links', () => {
      render(<App />);
      
      expect(screen.getByText(/Privacy Barrier. Testnet only/)).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Aleo Docs')).toBeInTheDocument();
      expect(screen.getByText('Sepolia Explorer')).toBeInTheDocument();
      expect(screen.getByText('Amoy Explorer')).toBeInTheDocument();
    });

    it('should wrap content in ErrorBoundary', () => {
      render(<App />);
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should use responsive grid classes for layout', () => {
      const { container } = render(<App />);
      
      // Check for responsive grid classes
      const mainGrid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3');
      expect(mainGrid).toBeInTheDocument();
    });

    it('should use responsive flex classes in header', () => {
      const { container } = render(<App />);
      
      // Check for responsive flex classes in header
      const headerFlex = container.querySelector('.flex.flex-col.sm\\:flex-row');
      expect(headerFlex).toBeInTheDocument();
    });

    it('should apply responsive padding classes', () => {
      const { container } = render(<App />);
      
      // Check for responsive padding
      const mainContent = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should display "Not connected" when wallets are disconnected', () => {
      render(<App />);
      
      const notConnectedElements = screen.getAllByText('Not connected');
      expect(notConnectedElements).toHaveLength(2); // One for each wallet
    });

    it('should display wallet information when MetaMask is connected', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: true,
          address: '0x1234567890123456789012345678901234567890',
          chainId: 11155111,
          balance: '1.5',
        },
        leoWallet: {
          connected: false,
          address: null,
          balance: null,
        },
        connectMetaMask: mockConnectMetaMask,
        connectLeoWallet: mockConnectLeoWallet,
        disconnectMetaMask: mockDisconnectMetaMask,
        disconnectLeoWallet: mockDisconnectLeoWallet,
        updateMetaMaskNetwork: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<App />);
      
      expect(screen.getByTestId('wallet-display-metamask')).toBeInTheDocument();
      expect(screen.getByTestId('network-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('balance-metamask')).toBeInTheDocument();
    });

    it('should display wallet information when Leo Wallet is connected', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: false,
          address: null,
          chainId: null,
          balance: null,
        },
        leoWallet: {
          connected: true,
          address: 'aleo1abcdefghijklmnopqrstuvwxyz',
          balance: '100',
        },
        connectMetaMask: mockConnectMetaMask,
        connectLeoWallet: mockConnectLeoWallet,
        disconnectMetaMask: mockDisconnectMetaMask,
        disconnectLeoWallet: mockDisconnectLeoWallet,
        updateMetaMaskNetwork: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<App />);
      
      expect(screen.getByTestId('wallet-display-leo')).toBeInTheDocument();
      expect(screen.getByTestId('balance-leo')).toBeInTheDocument();
    });

    it('should display both wallets when both are connected', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: true,
          address: '0x1234567890123456789012345678901234567890',
          chainId: 11155111,
          balance: '1.5',
        },
        leoWallet: {
          connected: true,
          address: 'aleo1abcdefghijklmnopqrstuvwxyz',
          balance: '100',
        },
        connectMetaMask: mockConnectMetaMask,
        connectLeoWallet: mockConnectLeoWallet,
        disconnectMetaMask: mockDisconnectMetaMask,
        disconnectLeoWallet: mockDisconnectLeoWallet,
        updateMetaMaskNetwork: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<App />);
      
      expect(screen.getByTestId('wallet-display-metamask')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-display-leo')).toBeInTheDocument();
      expect(screen.queryByText('Not connected')).not.toBeInTheDocument();
    });

    it('should call connect functions when wallet buttons are clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByTestId('wallet-button-metamask'));
      expect(mockConnectMetaMask).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByTestId('wallet-button-leo'));
      expect(mockConnectLeoWallet).toHaveBeenCalledTimes(1);
    });

    it('should call disconnect functions when connected wallet buttons are clicked', async () => {
      const user = userEvent.setup();
      
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: true,
          address: '0x1234567890123456789012345678901234567890',
          chainId: 11155111,
          balance: '1.5',
        },
        leoWallet: {
          connected: true,
          address: 'aleo1abcdefghijklmnopqrstuvwxyz',
          balance: '100',
        },
        connectMetaMask: mockConnectMetaMask,
        connectLeoWallet: mockConnectLeoWallet,
        disconnectMetaMask: mockDisconnectMetaMask,
        disconnectLeoWallet: mockDisconnectLeoWallet,
        updateMetaMaskNetwork: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<App />);
      
      await user.click(screen.getByTestId('wallet-button-metamask'));
      expect(mockDisconnectMetaMask).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByTestId('wallet-button-leo'));
      expect(mockDisconnectLeoWallet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Footer Links', () => {
    it('should have correct external links with proper attributes', () => {
      render(<App />);
      
      const githubLink = screen.getByText('GitHub').closest('a');
      expect(githubLink).toHaveAttribute('href', 'https://github.com');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const aleoDocsLink = screen.getByText('Aleo Docs').closest('a');
      expect(aleoDocsLink).toHaveAttribute('href', 'https://docs.aleo.org');
      expect(aleoDocsLink).toHaveAttribute('target', '_blank');
      
      const sepoliaLink = screen.getByText('Sepolia Explorer').closest('a');
      expect(sepoliaLink).toHaveAttribute('href', 'https://sepolia.etherscan.io');
      expect(sepoliaLink).toHaveAttribute('target', '_blank');
      
      const amoyLink = screen.getByText('Amoy Explorer').closest('a');
      expect(amoyLink).toHaveAttribute('href', 'https://amoy.polygonscan.com');
      expect(amoyLink).toHaveAttribute('target', '_blank');
    });
  });
});
