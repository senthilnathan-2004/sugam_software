'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useAuthStore } from '@/store/auth.store';
import { ConnectionBanner } from '@/features/lan/components/connection-banner';

const AUTH_STORAGE_KEY = 'sugam-hms-auth';

// Reads the persisted token straight from localStorage (the same source
// preload uses) so we don't race Zustand's async rehydration.
function readPersistedToken(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw)?.state?.token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  // Server-side session bootstrap. The main process keeps sessions in memory,
  // so after an app restart the persisted token must be re-verified to
  // re-establish the session BEFORE any data-loading IPC fires. This gate also
  // enforces server-side validity on every entry (expired token / disabled
  // account → bounced to login), which client-only persistence never did.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Browser/demo mode (no Electron bridge): let the UI render as before.
      if (typeof window === 'undefined' || !window.electronAPI) {
        setReady(true);
        return;
      }

      const token = readPersistedToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const res = await window.electronAPI.invoke('auth:verify', token);
        if (cancelled) return;
        if (res?.valid && res.user) {
          // Re-establishes the in-memory server session and refreshes the
          // cached user; keeps the existing token.
          login(res.user, token);
          setReady(true);
        } else {
          logout();
          router.replace('/login');
        }
      } catch {
        if (!cancelled) {
          logout();
          router.replace('/login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <LoadingScreen />;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <Sidebar />

      {/* Main content column — takes remaining width, scrolls independently */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Sticky topbar */}
        <Topbar />

        {/* Scrollable content area — overflow-y-auto is the scroll fix */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Client connection status (renders only in CLIENT mode) */}
          <div className="px-6 pt-4 empty:hidden">
            <ConnectionBanner />
          </div>
          <main className="w-full mx-auto px-6 py-6 pb-16">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
