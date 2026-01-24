import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionHistory } from './TransactionHistory';
import { useTransactionHistoryStore, type Transaction } from '@/stores/transaction-history.store';
import * as fc from 'fast-check';
import { config } from '@/config';

// Helper to generate hex characters
const hexChar = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f'
);

/**
 * Unit Tests for TransactionHistory Component
 * 
 * Tests cover:
 * - Transaction list rendering (Requirement 7.1)
 * - Transaction detail display (Requirement 7.3)
 * - Status updates (Requirement 7.4)
 * - Transaction completeness (Requirement 7.2)
 */

describe('TransactionHistory - Unit Tests', () => {
  beforeEach(() => {
    // Clear transaction history before each test
    useTransactionHistoryStore.getState().clearHistory();
  });

  describe('Transaction List Rendering', () => {
    it('should display empty state when no transactions exist', () => {
      render(<TransactionHistory />);
      
      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
      expect(screen.getByTestId('empty-history')).toBeInTheDocument();
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });

    it('should render transaction list when transactions exist', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('transaction-item')).toHaveLength(1);
    });

    it('should render multiple transactions in the list', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx-1',
          aleoTxId: 'at1abc123',
          amount: '10.5',
          destinationChain: config.chains.sepolia.chainId,
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'confirmed',
          timestamp: Date.now() - 1000,
        },
        {
          id: 'tx-2',
          aleoTxId: 'at1def456',
          amount: '5.25',
          destinationChain: config.chains.amoy.chainId,
          recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          status: 'pending',
          timestamp: Date.now(),
        },
      ];

      const store = useTransactionHistoryStore.getState();
      transactions.forEach(tx => store.addTransaction(tx));
      
      render(<TransactionHistory />);

      expect(screen.getAllByTestId('transaction-item')).toHaveLength(2);
    });

    it('should display transaction amount in list', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '15.75',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      expect(screen.getByTestId('transaction-amount')).toHaveTextContent('15.75');
    });

    it('should display transaction chain in list', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      expect(screen.getByTestId('transaction-chain')).toHaveTextContent(config.chains.sepolia.name);
    });

    it('should display transaction status badge', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('confirmed');
      expect(statusBadge).toHaveClass('status-confirmed');
    });

    it('should display transaction timestamp', () => {
      const timestamp = Date.now();
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp,
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      expect(screen.getByTestId('transaction-time')).toBeInTheDocument();
    });
  });

  describe('Transaction Detail Display', () => {
    it('should open modal when transaction is clicked', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      const transactionItem = screen.getByTestId('transaction-item');
      await user.click(transactionItem);

      await waitFor(() => {
        expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
      });
    });

    it('should display all transaction details in modal', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
        publicChainTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-status')).toHaveTextContent('confirmed');
        expect(screen.getByTestId('modal-amount')).toHaveTextContent('10.5');
        expect(screen.getByTestId('modal-recipient')).toHaveTextContent(mockTransaction.recipientAddress);
        expect(screen.getByTestId('modal-chain')).toHaveTextContent(config.chains.sepolia.name);
        expect(screen.getByTestId('modal-aleo-tx')).toHaveTextContent(mockTransaction.aleoTxId);
        expect(screen.getByTestId('modal-timestamp')).toBeInTheDocument();
        expect(screen.getByTestId('modal-public-tx')).toHaveTextContent(mockTransaction.publicChainTxHash!);
      });
    });

    it('should display error message in modal when transaction failed', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'failed',
        timestamp: Date.now(),
        errorMessage: 'Insufficient balance',
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-error')).toHaveTextContent('Insufficient balance');
      });
    });

    it('should display explorer links in modal', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
        publicChainTxHash: '0xabcdef1234567890',
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));

      await waitFor(() => {
        const aleoLink = screen.getByTestId('aleo-explorer-link');
        expect(aleoLink).toHaveAttribute(
          'href',
          `${config.aleo.explorer}/transaction/${mockTransaction.aleoTxId}`
        );

        const publicChainLink = screen.getByTestId('public-chain-explorer-link');
        expect(publicChainLink).toHaveAttribute(
          'href',
          `${config.chains.sepolia.explorer}/tx/${mockTransaction.publicChainTxHash}`
        );
      });
    });

    it('should close modal when close button is clicked', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));
      
      await waitFor(() => {
        expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('close-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
      });
    });

    it('should close modal when overlay is clicked', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));
      
      await waitFor(() => {
        expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('transaction-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
      });
    });

    it('should call onTransactionClick callback when provided', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      let clickedTxId = '';
      const handleClick = (txId: string) => {
        clickedTxId = txId;
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory onTransactionClick={handleClick} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('transaction-item'));

      await waitFor(() => {
        expect(clickedTxId).toBe(mockTransaction.aleoTxId);
      });
    });
  });

  describe('Status Updates', () => {
    it('should display pending status correctly', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('pending');
      expect(statusBadge).toHaveClass('status-pending');
    });

    it('should display confirmed status correctly', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('confirmed');
      expect(statusBadge).toHaveClass('status-confirmed');
    });

    it('should display failed status correctly', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'failed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('failed');
      expect(statusBadge).toHaveClass('status-failed');
    });

    it('should update display when transaction status changes', () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      const { rerender } = render(<TransactionHistory />);

      expect(screen.getByTestId('status-badge')).toHaveTextContent('pending');

      // Update status
      useTransactionHistoryStore.getState().updateTransactionStatus(
        mockTransaction.aleoTxId,
        'confirmed',
        { publicChainTxHash: '0xabcdef123456' }
      );

      rerender(<TransactionHistory />);

      expect(screen.getByTestId('status-badge')).toHaveTextContent('confirmed');
    });

    it('should display public chain tx hash after confirmation', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'pending',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      const { rerender } = render(<TransactionHistory />);

      // Update with public chain tx hash
      const publicChainTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      useTransactionHistoryStore.getState().updateTransactionStatus(
        mockTransaction.aleoTxId,
        'confirmed',
        { publicChainTxHash }
      );

      rerender(<TransactionHistory />);

      // Open modal to see public chain tx hash
      const user = userEvent.setup();
      await user.click(screen.getByTestId('transaction-item'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-public-tx')).toHaveTextContent(publicChainTxHash);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open modal when Enter key is pressed on transaction item', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      const transactionItem = screen.getByTestId('transaction-item');
      transactionItem.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
      });
    });

    it('should open modal when Space key is pressed on transaction item', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        aleoTxId: 'at1abc123def456',
        amount: '10.5',
        destinationChain: config.chains.sepolia.chainId,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      useTransactionHistoryStore.getState().addTransaction(mockTransaction);
      render(<TransactionHistory />);
      const user = userEvent.setup();

      const transactionItem = screen.getByTestId('transaction-item');
      transactionItem.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
      });
    });
  });
});

/**
 * Feature: wallet-integration-frontend, Property 24: Transaction detail view
 * 
 * Property: For any transaction clicked in the history, the system should display 
 * detailed information about that transaction
 * 
 * Validates: Requirements 7.3
 */

describe('TransactionHistory - Property Tests', () => {
  beforeEach(() => {
    // Clear transaction history before each test
    useTransactionHistoryStore.getState().clearHistory();
  });

  it('Property 24: should display detailed information for any clicked transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random transactions with unique IDs
        fc.integer({ min: 1, max: 3 }).chain(count => 
          fc.tuple(
            ...Array.from({ length: count }, (_, i) => 
              fc.record({
                id: fc.constant(`tx-${Date.now()}-${i}`),
                aleoTxId: fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => `at1${arr.join('')}`),
                amount: fc.integer({ min: 1, max: 1000000 }).map(n => (n / 1000000).toFixed(6)),
                destinationChain: fc.constantFrom(
                  config.chains.sepolia.chainId,
                  config.chains.amoy.chainId
                ),
                recipientAddress: fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(arr => `0x${arr.join('')}`),
                status: fc.constantFrom('pending', 'confirmed', 'failed') as fc.Arbitrary<'pending' | 'confirmed' | 'failed'>,
                timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
                errorMessage: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
                publicChainTxHash: fc.option(
                  fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => `0x${arr.join('')}`),
                  { nil: undefined }
                ),
              })
            )
          ).map(tuple => Array.from(tuple))
        ),
        async (transactions) => {
          // Add transactions to store
          const store = useTransactionHistoryStore.getState();
          transactions.forEach(tx => store.addTransaction(tx));

          // Render component
          const { unmount } = render(<TransactionHistory />);
          const user = userEvent.setup();

          // Pick a random transaction to click
          const randomTx = transactions[Math.floor(Math.random() * transactions.length)];

          // Find and click the transaction item
          const transactionItems = screen.getAllByTestId('transaction-item');
          const targetItem = transactionItems.find(item => {
            const idElement = item.querySelector('[data-testid="transaction-id"]');
            return idElement?.textContent?.includes(randomTx.aleoTxId.slice(0, 6));
          });

          expect(targetItem).toBeDefined();
          if (!targetItem) return; // Skip if not found
          
          await user.click(targetItem);

          // Wait for modal to appear
          await waitFor(() => {
            expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
          });

          // Verify all required details are displayed in the modal
          expect(screen.getByTestId('modal-status')).toHaveTextContent(randomTx.status);
          expect(screen.getByTestId('modal-amount')).toHaveTextContent(randomTx.amount);
          expect(screen.getByTestId('modal-recipient')).toHaveTextContent(randomTx.recipientAddress);
          expect(screen.getByTestId('modal-aleo-tx')).toHaveTextContent(randomTx.aleoTxId);
          expect(screen.getByTestId('modal-timestamp')).toBeInTheDocument();

          // Verify chain name is displayed
          const chainName = randomTx.destinationChain === config.chains.sepolia.chainId
            ? config.chains.sepolia.name
            : config.chains.amoy.name;
          expect(screen.getByTestId('modal-chain')).toHaveTextContent(chainName);

          // Verify optional fields
          if (randomTx.publicChainTxHash) {
            expect(screen.getByTestId('modal-public-tx')).toHaveTextContent(randomTx.publicChainTxHash);
          }

          if (randomTx.errorMessage) {
            expect(screen.getByTestId('modal-error')).toHaveTextContent(randomTx.errorMessage);
          }

          // Verify explorer links
          expect(screen.getByTestId('aleo-explorer-link')).toHaveAttribute(
            'href',
            `${config.aleo.explorer}/transaction/${randomTx.aleoTxId}`
          );

          if (randomTx.publicChainTxHash) {
            const explorerUrl = randomTx.destinationChain === config.chains.sepolia.chainId
              ? config.chains.sepolia.explorer
              : config.chains.amoy.explorer;
            expect(screen.getByTestId('public-chain-explorer-link')).toHaveAttribute(
              'href',
              `${explorerUrl}/tx/${randomTx.publicChainTxHash}`
            );
          }

          unmount();
        }
      ),
      { numRuns: 10, timeout: 5000 }
    );
  }, 60000);
});
