import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transaction {
  id: string;
  aleoTxId: string;
  amount: string;
  destinationChain: number;
  recipientAddress: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  errorMessage?: string;
  publicChainTxHash?: string;
}

interface TransactionHistoryState {
  transactions: Transaction[];
  
  // Actions
  addTransaction: (tx: Transaction) => void;
  updateTransactionStatus: (
    txId: string,
    status: 'pending' | 'confirmed' | 'failed',
    updates?: Partial<Pick<Transaction, 'publicChainTxHash' | 'errorMessage'>>
  ) => void;
  loadTransactions: () => void;
  clearHistory: () => void;
}

export const useTransactionHistoryStore = create<TransactionHistoryState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx: Transaction) => {
        set((state) => ({
          transactions: [tx, ...state.transactions],
        }));
      },

      updateTransactionStatus: (txId, status, updates = {}) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.aleoTxId === txId
              ? {
                  ...tx,
                  status,
                  ...updates,
                }
              : tx
          ),
        }));
      },

      loadTransactions: () => {
        // Transactions are automatically loaded from localStorage by persist middleware
        // This method is here for explicit loading if needed
        const state = get();
        return;
      },

      clearHistory: () => {
        set({ transactions: [] });
      },
    }),
    {
      name: 'transaction-history-storage',
      version: 1,
    }
  )
);
