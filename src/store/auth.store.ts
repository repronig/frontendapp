import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrentUserContext, PortalKey } from '@/types/domain';

/** Persisted session: token + user snapshot for bootstrapping portals; keep in sync with the `/me` query cache (`queryKeys.currentUser` in `src/lib/queryKeys.ts`) via {@link useCurrentUser}. */

interface PendingTwoFactor {
  challengeId: number;
  portal: PortalKey;
  email: string;
  expiresAt: string | null;
}

interface AuthState {
  token: string | null;
  currentUser: CurrentUserContext | null;
  pendingTwoFactor: PendingTwoFactor | null;
  setToken: (token: string | null) => void;
  setCurrentUser: (currentUser: CurrentUserContext | null) => void;
  setPendingTwoFactor: (pending: PendingTwoFactor | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      currentUser: null,
      pendingTwoFactor: null,
      setToken: (token) => set({ token }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      setPendingTwoFactor: (pendingTwoFactor) => set({ pendingTwoFactor }),
      clearSession: () => set({ token: null, currentUser: null, pendingTwoFactor: null }),
    }),
    {
      name: 'repronig-auth',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
        pendingTwoFactor: state.pendingTwoFactor,
      }),
    },
  ),
);
