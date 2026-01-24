/**
 * Session Store - Mission Control Session State
 * 
 * This store manages the control session state.
 * Frontend acts as mission control, NOT a wallet dApp.
 * 
 * Note: Wallet connection is managed by @demox-labs/aleo-wallet-adapter-react
 * This store only tracks session state and syncs with wallet adapter.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  // Control session state
  controlSessionActive: boolean;
  sessionId: string | null;
  
  // Actions
  initSession: () => Promise<void>;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      controlSessionActive: false,
      sessionId: null,

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
        controlSessionActive: state.controlSessionActive,
        sessionId: state.sessionId,
      }),
    }
  )
);

