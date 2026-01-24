import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransferForm } from './TransferForm';
import { useWalletStore } from '@/stores/wallet.store';
import { useTransferStore } from '@/stores/transfer.store';

// Mock the stores
vi.mock('@/stores/wallet.store');
vi.mock('@/stores/transfer.store');

describe('TransferForm', () => {
  const mockUpdateAmount = vi.fn();
  const mockUpdateDestinationChain = vi.fn();
  const mockUpdateRecipientAddress = vi.fn();
  const mockSubmitTransfer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for wallet store
    vi.mocked(useWalletStore).mockReturnValue({
      metamask: {
        connected: true,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 11155111, // Sepolia
        balance: '1.0',
      },
      leoWallet: {
        connected: true,
        address: 'aleo1234567890abcdef',
        balance: '10.0',
      },
      connectMetaMask: vi.fn(),
      disconnectMetaMask: vi.fn(),
      updateMetaMaskNetwork: vi.fn(),
      updateMetaMaskBalance: vi.fn(),
      updateMetaMaskAccount: vi.fn(),
      connectLeoWallet: vi.fn(),
      disconnectLeoWallet: vi.fn(),
      updateLeoWalletBalance: vi.fn(),
      updateLeoWalletAccount: vi.fn(),
      refreshBalances: vi.fn(),
    });

    // Default mock implementation for transfer store
    vi.mocked(useTransferStore).mockReturnValue({
      form: {
        amount: '',
        destinationChain: 'sepolia',
        recipientAddress: '',
      },
      validation: {
        amount: { valid: true },
        recipientAddress: { valid: true },
      },
      isSubmitting: false,
      updateAmount: mockUpdateAmount,
      updateDestinationChain: mockUpdateDestinationChain,
      updateRecipientAddress: mockUpdateRecipientAddress,
      validateForm: vi.fn().mockReturnValue(true),
      submitTransfer: mockSubmitTransfer,
      resetForm: vi.fn(),
    });
  });

  describe('Form Field Updates', () => {
    it('should call updateAmount when amount input changes', () => {
      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.change(amountInput, { target: { value: '1.5' } });

      expect(mockUpdateAmount).toHaveBeenCalledWith('1.5');
    });

    it('should call updateDestinationChain when chain selector changes', () => {
      render(<TransferForm />);

      const chainSelector = screen.getByTestId('chain-selector');
      fireEvent.change(chainSelector, { target: { value: 'amoy' } });

      expect(mockUpdateDestinationChain).toHaveBeenCalledWith('amoy');
    });

    it('should call updateRecipientAddress when recipient input changes', () => {
      render(<TransferForm />);

      const recipientInput = screen.getByTestId('recipient-input');
      fireEvent.change(recipientInput, { target: { value: '0xabcd' } });

      expect(mockUpdateRecipientAddress).toHaveBeenCalledWith('0xabcd');
    });
  });

  describe('Validation Display', () => {
    it('should display amount validation error when amount is invalid', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '-5',
          destinationChain: 'sepolia',
          recipientAddress: '',
        },
        validation: {
          amount: { valid: false, error: 'Amount must be greater than zero' },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const errorElement = screen.getByTestId('amount-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Amount must be greater than zero');
    });

    it('should display recipient address validation error when address is invalid', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.0',
          destinationChain: 'sepolia',
          recipientAddress: 'invalid',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: false, error: 'Address must start with 0x' },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const errorElement = screen.getByTestId('recipient-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Address must start with 0x');
    });

    it('should not display validation errors when fields are empty', () => {
      render(<TransferForm />);

      const amountError = screen.queryByTestId('amount-error');
      const recipientError = screen.queryByTestId('recipient-error');

      expect(amountError).not.toBeInTheDocument();
      expect(recipientError).not.toBeInTheDocument();
    });

    it('should display chain info with selected chain name', () => {
      render(<TransferForm />);

      const chainInfo = screen.getByTestId('chain-info');
      expect(chainInfo).toHaveTextContent('Selected: Ethereum Sepolia');
    });

    it('should update chain info when chain selection changes', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '',
          destinationChain: 'amoy',
          recipientAddress: '',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const chainInfo = screen.getByTestId('chain-info');
      expect(chainInfo).toHaveTextContent('Selected: Polygon Amoy');
    });
  });

  describe('Form Submission', () => {
    it('should call submitTransfer when form is submitted with valid data', async () => {
      mockSubmitTransfer.mockResolvedValue(undefined);

      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.5',
          destinationChain: 'sepolia',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitTransfer).toHaveBeenCalledTimes(1);
      });
    });

    it('should call custom onSubmit handler when provided', async () => {
      const customOnSubmit = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.5',
          destinationChain: 'sepolia',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm onSubmit={customOnSubmit} />);

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(customOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmitTransfer).not.toHaveBeenCalled();
      });
    });

    it('should display loading state during submission', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.5',
          destinationChain: 'sepolia',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: true,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Processing...');
      expect(submitButton).toBeDisabled();
    });

    it('should display error message when submission fails', async () => {
      const errorMessage = 'Transaction failed';
      mockSubmitTransfer.mockRejectedValue(new Error(errorMessage));

      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.5',
          destinationChain: 'sepolia',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Form Disabling Conditions', () => {
    it('should disable form when MetaMask is not connected', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: false,
          address: null,
          chainId: null,
          balance: null,
        },
        leoWallet: {
          connected: true,
          address: 'aleo1234567890abcdef',
          balance: '10.0',
        },
        connectMetaMask: vi.fn(),
        disconnectMetaMask: vi.fn(),
        updateMetaMaskNetwork: vi.fn(),
        updateMetaMaskBalance: vi.fn(),
        updateMetaMaskAccount: vi.fn(),
        connectLeoWallet: vi.fn(),
        disconnectLeoWallet: vi.fn(),
        updateLeoWalletBalance: vi.fn(),
        updateLeoWalletAccount: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      const chainSelector = screen.getByTestId('chain-selector');
      const recipientInput = screen.getByTestId('recipient-input');
      const submitButton = screen.getByTestId('submit-button');

      expect(amountInput).toBeDisabled();
      expect(chainSelector).toBeDisabled();
      expect(recipientInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      const disabledMessage = screen.getByTestId('form-disabled-message');
      expect(disabledMessage).toHaveTextContent('Please connect MetaMask to continue');
    });

    it('should disable form when Leo Wallet is not connected', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: true,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 11155111,
          balance: '1.0',
        },
        leoWallet: {
          connected: false,
          address: null,
          balance: null,
        },
        connectMetaMask: vi.fn(),
        disconnectMetaMask: vi.fn(),
        updateMetaMaskNetwork: vi.fn(),
        updateMetaMaskBalance: vi.fn(),
        updateMetaMaskAccount: vi.fn(),
        connectLeoWallet: vi.fn(),
        disconnectLeoWallet: vi.fn(),
        updateLeoWalletBalance: vi.fn(),
        updateLeoWalletAccount: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<TransferForm />);

      const disabledMessage = screen.getByTestId('form-disabled-message');
      expect(disabledMessage).toHaveTextContent('Please connect Leo Wallet to continue');
    });

    it('should disable form when both wallets are not connected', () => {
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
        connectMetaMask: vi.fn(),
        disconnectMetaMask: vi.fn(),
        updateMetaMaskNetwork: vi.fn(),
        updateMetaMaskBalance: vi.fn(),
        updateMetaMaskAccount: vi.fn(),
        connectLeoWallet: vi.fn(),
        disconnectLeoWallet: vi.fn(),
        updateLeoWalletBalance: vi.fn(),
        updateLeoWalletAccount: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<TransferForm />);

      const disabledMessage = screen.getByTestId('form-disabled-message');
      expect(disabledMessage).toHaveTextContent('Please connect both MetaMask and Leo Wallet to continue');
    });

    it('should disable form when MetaMask is on unsupported network', () => {
      vi.mocked(useWalletStore).mockReturnValue({
        metamask: {
          connected: true,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 1, // Mainnet - unsupported
          balance: '1.0',
        },
        leoWallet: {
          connected: true,
          address: 'aleo1234567890abcdef',
          balance: '10.0',
        },
        connectMetaMask: vi.fn(),
        disconnectMetaMask: vi.fn(),
        updateMetaMaskNetwork: vi.fn(),
        updateMetaMaskBalance: vi.fn(),
        updateMetaMaskAccount: vi.fn(),
        connectLeoWallet: vi.fn(),
        disconnectLeoWallet: vi.fn(),
        updateLeoWalletBalance: vi.fn(),
        updateLeoWalletAccount: vi.fn(),
        refreshBalances: vi.fn(),
      });

      render(<TransferForm />);

      const disabledMessage = screen.getByTestId('form-disabled-message');
      expect(disabledMessage).toHaveTextContent('Please switch MetaMask to Sepolia or Amoy network');
    });

    it('should enable form when both wallets are connected and network is correct', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '1.5',
          destinationChain: 'sepolia',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        validation: {
          amount: { valid: true },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(true),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      const chainSelector = screen.getByTestId('chain-selector');
      const recipientInput = screen.getByTestId('recipient-input');
      const submitButton = screen.getByTestId('submit-button');

      expect(amountInput).not.toBeDisabled();
      expect(chainSelector).not.toBeDisabled();
      expect(recipientInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();

      const disabledMessage = screen.queryByTestId('form-disabled-message');
      expect(disabledMessage).not.toBeInTheDocument();
    });

    it('should disable submit button when form fields are empty', () => {
      render(<TransferForm />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when validation fails', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '-5',
          destinationChain: 'sepolia',
          recipientAddress: 'invalid',
        },
        validation: {
          amount: { valid: false, error: 'Amount must be greater than zero' },
          recipientAddress: { valid: false, error: 'Address must start with 0x' },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on form inputs', () => {
      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      const chainSelector = screen.getByTestId('chain-selector');
      const recipientInput = screen.getByTestId('recipient-input');
      const submitButton = screen.getByTestId('submit-button');

      expect(amountInput).toHaveAttribute('aria-label', 'Transfer amount');
      expect(chainSelector).toHaveAttribute('aria-label', 'Destination chain');
      expect(recipientInput).toHaveAttribute('aria-label', 'Recipient address');
      expect(submitButton).toHaveAttribute('aria-label', 'Submit transfer');
    });

    it('should set aria-invalid when validation fails', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '-5',
          destinationChain: 'sepolia',
          recipientAddress: 'invalid',
        },
        validation: {
          amount: { valid: false, error: 'Amount must be greater than zero' },
          recipientAddress: { valid: false, error: 'Address must start with 0x' },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      const recipientInput = screen.getByTestId('recipient-input');

      expect(amountInput).toHaveAttribute('aria-invalid', 'true');
      expect(recipientInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error messages with inputs using aria-describedby', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '-5',
          destinationChain: 'sepolia',
          recipientAddress: '',
        },
        validation: {
          amount: { valid: false, error: 'Amount must be greater than zero' },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const amountInput = screen.getByTestId('amount-input');
      expect(amountInput).toHaveAttribute('aria-describedby', 'amount-error');
    });

    it('should have role="alert" on error messages', () => {
      vi.mocked(useTransferStore).mockReturnValue({
        form: {
          amount: '-5',
          destinationChain: 'sepolia',
          recipientAddress: '',
        },
        validation: {
          amount: { valid: false, error: 'Amount must be greater than zero' },
          recipientAddress: { valid: true },
        },
        isSubmitting: false,
        updateAmount: mockUpdateAmount,
        updateDestinationChain: mockUpdateDestinationChain,
        updateRecipientAddress: mockUpdateRecipientAddress,
        validateForm: vi.fn().mockReturnValue(false),
        submitTransfer: mockSubmitTransfer,
        resetForm: vi.fn(),
      });

      render(<TransferForm />);

      const errorElement = screen.getByTestId('amount-error');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });
  });
});
