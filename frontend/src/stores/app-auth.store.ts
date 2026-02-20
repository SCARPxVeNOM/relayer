"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppUser {
  id: number;
  phone: string;
  walletAddress: string;
}

interface AppAuthState {
  token: string | null;
  user: AppUser | null;
  expiresAt: number | null;
  setSession: (payload: { token: string; user: AppUser; expiresAt: number }) => void;
  clearSession: () => void;
}

export const useAppAuthStore = create<AppAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: null,
      setSession: ({ token, user, expiresAt }) => {
        set({ token, user, expiresAt });
      },
      clearSession: () => {
        set({ token: null, user: null, expiresAt: null });
      },
    }),
    {
      name: "envelop-auth-session",
    }
  )
);

