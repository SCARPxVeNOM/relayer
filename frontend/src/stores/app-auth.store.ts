"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppUser {
  id: number;
  phone?: string;
  walletAddress: string;
  username?: string | null;
  displayName?: string | null;
  usernameClaimTxId?: string | null;
  usernameClaimedAt?: number | null;
}

interface AppAuthState {
  token: string | null;
  user: AppUser | null;
  expiresAt: number | null;
  hydrated: boolean;
  setSession: (payload: { token: string; user: AppUser; expiresAt: number }) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAppAuthStore = create<AppAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: null,
      hydrated: false,
      setSession: ({ token, user, expiresAt }) => {
        set({ token, user, expiresAt });
      },
      clearSession: () => {
        set({ token: null, user: null, expiresAt: null });
      },
      setHydrated: (hydrated) => {
        set({ hydrated });
      },
    }),
    {
      name: "envelop-auth-session",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
