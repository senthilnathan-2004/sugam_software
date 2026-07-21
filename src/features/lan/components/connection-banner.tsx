'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { useLan, type ClientStatus } from '../hooks/use-lan';
import { cn } from '@/lib/utils';

/**
 * Client-only connection status (spec §19). Polls lan:status every 5s and shows
 * a compact pill. Renders nothing on HOST/STANDALONE. When the Host is
 * unreachable it makes that unmistakable so a failed save is never mistaken for
 * success (the transport itself already fails closed).
 */
export function ConnectionBanner() {
  const { getStatus, testConnection } = useLan();
  const [status, setStatus] = useState<ClientStatus | null>(null);
  const [isClientMode, setIsClientMode] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getStatus();
    if (s && s.mode === 'CLIENT') {
      setIsClientMode(true);
      setStatus(s as ClientStatus);
    } else {
      setIsClientMode(false);
      setStatus(null);
    }
  }, [getStatus]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!isClientMode || !status) return null;

  const map = {
    connected: {
      icon: <Wifi className="h-3.5 w-3.5" />,
      label: status.latencyMs != null ? `Connected · ${status.latencyMs} ms` : 'Connected',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    reconnecting: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: 'Reconnecting…',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    offline: {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: 'Main computer offline',
      cls: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    'not-configured': {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: 'Not connected',
      cls: 'bg-slate-50 text-slate-500 border-slate-200',
    },
  } as const;

  const v = map[status.state];

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold', v.cls)}>
      {v.icon}
      <span>
        {status.hostName ? `${status.hostName}: ` : ''}
        {v.label}
      </span>
      {(status.state === 'offline' || status.state === 'not-configured') && (
        <button
          type="button"
          onClick={() => testConnection().then((s) => s && s.mode === 'CLIENT' && setStatus(s as ClientStatus))}
          className="ml-1 inline-flex items-center gap-1 underline"
          title="Retry"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
      {status.state === 'offline' && (
        <span className="hidden md:inline font-medium opacity-80">— your clinic data is safe on the Main computer.</span>
      )}
    </div>
  );
}
