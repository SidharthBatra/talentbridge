import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setTokens: (tokens) =>
        set({
          user: tokens.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => get().accessToken !== null,
    }),
    { name: 'talentbridge-auth' },
  ),
);
