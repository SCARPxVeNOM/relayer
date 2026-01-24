/**
 * Session Store - Mission Control Session State
 * 
 * This store manages the control session state.
 * Frontend acts as mission control, NOT a wallet dApp.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { leoWalletConnector } from '@/services/leo-wallet.service';

interface SessionState {
  // Aleo wallet connection (for creating private intents)
  aleoConnected: boolean;
  aleoAddress: string | null;
  
  // Control session state
  controlSessionActive: boolean;
  sessionId: string | null;
  
  // Actions
  connectAleo: () => Promise<void>;
  disconnectAleo: () => Promise<void>;
  initSession: () => Promise<void>;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      aleoConnected: false,
      aleoAddress: null,
      controlSessionActive: false,
      sessionId: null,

      connectAleo: async () => {
        try {
          const connection = await leoWalletConnector.connect();
          
          set({
            aleoConnected: true,
            aleoAddress: connection.address,
          });
        } catch (error) {
          console.error('Failed to connect Aleo wallet:', error);
          throw error;
        }
      },

      disconnectAleo: async () => {
        try {
          await leoWalletConnector.disconnect();
          
          set({
            aleoConnected: false,
            aleoAddress: null,
            controlSessionActive: false,
            sessionId: null,
          });
        } catch (error) {
          console.error('Failed to disconnect Aleo wallet:', error);
          throw error;
        }
      },

      initSession: async () => {
        const { apiClient } = await import('@/services/api.client');
        
        try {
          const response = await apiClient.initSession();
          
          set({
            controlSessionActive: true,
            sessionId: response.sessionId,
          });
        } catch (error) {
          console.error('Failed to initialize session:', error);
          throw error;
        }
      },

      resetSession: () => {
        set({
          controlSessionActive: false,
          sessionId: null,
        });
      },
    }),
    {
      name: 'mission-control-session',
      partialize: (state) => ({
        aleoConnected: state.aleoConnected,
        aleoAddress: state.aleoAddress,
        controlSessionActive: state.controlSessionActive,
        sessionId: state.sessionId,
      }),
    }
  )
);

