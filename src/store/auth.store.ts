import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, UserRole, Permission } from '@/features/auth/types/auth.types';
import { ROLE_PERMISSIONS } from '@/features/auth/types/auth.types';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  lastActivity: number;
  // Actions
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateActivity: () => void;
  hasPermission: (permission: Permission) => boolean;
  isInactive: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          lastActivity: Date.now(),
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          lastActivity: 0,
        });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      hasPermission: (permission: Permission): boolean => {
        const { user } = get();
        if (!user) return false;
        const role = user.role as UserRole;
        const permissions = ROLE_PERMISSIONS[role] ?? [];
        return permissions.includes(permission);
      },

      isInactive: (): boolean => {
        const { lastActivity, isAuthenticated } = get();
        if (!isAuthenticated) return false;
        return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
      },
    }),
    {
      name: 'sugam-hms-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
    }
  )
);
