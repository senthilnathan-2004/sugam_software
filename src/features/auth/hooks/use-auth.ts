'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import type { LoginCredentials } from '../types/auth.types';

const INACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, login, logout, updateActivity, isInactive, hasPermission } =
    useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    intervalRef.current = setInterval(() => {
      if (isInactive()) {
        toast.warning('Session expired', {
          description: 'You have been signed out due to inactivity.',
        });
        logout();
        router.replace('/login');
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, isInactive, logout, router]);

  // Record activity on user interactions
  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => updateActivity();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [isAuthenticated, updateActivity]);

  const handleLogin = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        // Call Electron IPC
        const response = await window.electronAPI.invoke('auth:login', credentials);

        if (response.success && response.user && response.token) {
          login(response.user, response.token);
          
          let redirectPath = '/dashboard';
          if (response.user.role === 'DOCTOR') redirectPath = '/doctor';
          else if (response.user.role === 'RECEPTION') redirectPath = '/reception';
          else if (response.user.role === 'BILLING') redirectPath = '/billing';

          router.replace(redirectPath);
          toast.success(`Welcome back, ${response.user.name}!`);
          return { success: true };
        }

        return { success: false, error: response.error ?? 'Invalid credentials. Please try again.' };
      } catch (error) {
        return { success: false, error: 'Connection failed. Please restart the application.' };
      }
    },
    [login, router]
  );

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/login');
    toast.info('You have been signed out.');
  }, [logout, router]);

  return {
    user,
    isAuthenticated,
    hasPermission,
    handleLogin,
    handleLogout,
  };
}
