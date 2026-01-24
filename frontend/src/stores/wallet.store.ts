import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { metamaskConnector } from '@/services/metamask.service';
import { leoWalletConnector } from '@/services/leo-wallet.service';

interface MetaMaskState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
}

interface LeoWalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
}

interface WalletState {
  metamask: MetaMaskState;
  leoWallet: LeoWalletState;
  
  // MetaMask actions
  connectMetaMask: () => Promise<void>;
  disconnectMetaMask: () => Promise<void>;
  updateMetaMaskNetwork: (chainId: number) => void;
  updateMetaMaskBalance: (balance: string) => void;
  updateMetaMaskAccount: (address: string) => void;
  switchMetaMaskNetwork: (chainId: number) => Promise<void>;
  
  // Leo Wallet actions
  connectLeoWallet: () => Promise<void>;
  disconnectLeoWallet: () => Promise<void>;
  updateLeoWalletBalance: (balance: string) => void;
  updateLeoWalletAccount: (address: string) => void;
  
  // Shared actions
  refreshBalances: () => Promise<void>;
}

const initialMetaMaskState: MetaMaskState = {
  connected: false,
  address: null,
  chainId: null,
  balance: null,
};

const initialLeoWalletState: LeoWalletState = {
  connected: false,
  address: null,
  balance: null,
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      metamask: initialMetaMaskState,
      leoWallet: initialLeoWalletState,

      // MetaMask actions
      connectMetaMask: async () => {
        try {
          const connection = await metamaskConnector.connect();
          
          // Fetch balance
          let balance: string | null = null;
          try {
            balance = await metamaskConnector.getBalance(connection.address);
          } catch (error) {
            console.error('Failed to fetch MetaMask balance:', error);
          }

          set({
            metamask: {
              connected: true,
              address: connection.address,
              chainId: connection.chainId || null,
              balance,
            },
          });

          // Setup event listeners
          metamaskConnector.onAccountChange((address) => {
            get().updateMetaMaskAccount(address);
          });

          metamaskConnector.onNetworkChange((chainId) => {
            get().updateMetaMaskNetwork(chainId);
          });
        } catch (error) {
          console.error('Failed to connect MetaMask:', error);
          throw error;
        }
      },

      disconnectMetaMask: async () => {
        try {
          await metamaskConnector.disconnect();
          set({
            metamask: initialMetaMaskState,
          });
        } catch (error) {
          console.error('Failed to disconnect MetaMask:', error);
          throw error;
        }
      },

      updateMetaMaskNetwork: (chainId: number) => {
        set((state) => ({
          metamask: {
            ...state.metamask,
            chainId,
          },
        }));

        // Refresh balance when network changes
        get().refreshBalances();
      },

      updateMetaMaskBalance: (balance: string) => {
        set((state) => ({
          metamask: {
            ...state.metamask,
            balance,
          },
        }));
      },

      updateMetaMaskAccount: (address: string) => {
        set((state) => ({
          metamask: {
            ...state.metamask,
            address,
          },
        }));

        // Refresh balance when account changes
        get().refreshBalances();
      },

      switchMetaMaskNetwork: async (chainId: number) => {
        try {
          await metamaskConnector.switchNetwork(chainId);
          // Network change will be detected by the event listener
        } catch (error) {
          console.error('Failed to switch MetaMask network:', error);
          throw error;
        }
      },

      // Leo Wallet actions
      connectLeoWallet: async () => {
        try {
          const connection = await leoWalletConnector.connect();
          
          // Fetch balance
          let balance: string | null = null;
          try {
            balance = await leoWalletConnector.getBalance(connection.address);
          } catch (error) {
            console.error('Failed to fetch Leo Wallet balance:', error);
          }

          set({
            leoWallet: {
              connected: true,
              address: connection.address,
              balance,
            },
          });

          // Setup event listeners
          leoWalletConnector.onAccountChange((address) => {
            get().updateLeoWalletAccount(address);
          });
        } catch (error) {
          console.error('Failed to connect Leo Wallet:', error);
          throw error;
        }
      },

      disconnectLeoWallet: async () => {
        try {
          await leoWalletConnector.disconnect();
          set({
            leoWallet: initialLeoWalletState,
          });
        } catch (error) {
          console.error('Failed to disconnect Leo Wallet:', error);
          throw error;
        }
      },

      updateLeoWalletBalance: (balance: string) => {
        set((state) => ({
          leoWallet: {
            ...state.leoWallet,
            balance,
          },
        }));
      },

      updateLeoWalletAccount: (address: string) => {
        set((state) => ({
          leoWallet: {
            ...state.leoWallet,
            address,
          },
        }));

        // Refresh balance when account changes
        get().refreshBalances();
      },

      // Shared actions
      refreshBalances: async () => {
        const state = get();

        // Refresh MetaMask balance
        if (state.metamask.connected && state.metamask.address) {
          try {
            const balance = await metamaskConnector.getBalance(state.metamask.address);
            state.updateMetaMaskBalance(balance);
          } catch (error) {
            console.error('Failed to refresh MetaMask balance:', error);
          }
        }

        // Refresh Leo Wallet balance
        if (state.leoWallet.connected && state.leoWallet.address) {
          try {
            const balance = await leoWalletConnector.getBalance(state.leoWallet.address);
            state.updateLeoWalletBalance(balance);
          } catch (error) {
            console.error('Failed to refresh Leo Wallet balance:', error);
          }
        }
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        metamask: {
          connected: state.metamask.connected,
          address: state.metamask.address,
          chainId: state.metamask.chainId,
          balance: state.metamask.balance,
        },
        leoWallet: {
          connected: state.leoWallet.connected,
          address: state.leoWallet.address,
          balance: state.leoWallet.balance,
        },
      }),
    }
  )
);
