'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Server, KeyRound, Trash2, Circle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLan, type HostStatus, type HostDevice } from '../hooks/use-lan';
import { cn } from '@/lib/utils';

/**
 * Host administration panel (spec §16). Shown in Settings when this computer is
 * the Main/Host. Displays server status, connected devices, and a pairing
 * control that mints a short-lived code for a Doctor client to connect.
 */
export function HostSettings() {
  const { getStatus, listDevices, enablePairing, disablePairing, revokeDevice } = useLan();
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [mode, setMode] = useState<string>('');
  const [devices, setDevices] = useState<HostDevice[]>([]);
  const [pairing, setPairing] = useState<{ enabled: boolean; code?: string; expiresAt?: number }>({ enabled: false });
  const [now, setNow] = useState<number>(() => Date.now());

  const refreshDevices = useCallback(async () => {
    const d = await listDevices();
    if (d) {
      setDevices(d.devices);
      setPairing(d.pairing);
    }
  }, [listDevices]);

  useEffect(() => {
    (async () => {
      const s = await getStatus();
      setMode(s?.mode ?? '');
      if (s && s.mode === 'HOST') {
        setStatus(s as HostStatus);
        refreshDevices();
      }
    })();
  }, [getStatus, refreshDevices]);

  useEffect(() => {
    if (mode !== 'HOST') return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (typeof document === 'undefined' || document.visibilityState === 'visible') refreshDevices();
    }, 3000);
    return () => clearInterval(id);
  }, [mode, refreshDevices]);

  if (mode && mode !== 'HOST') {
    return (
      <div className="text-sm text-slate-600 space-y-3">
        <p className="font-semibold">This computer is not set as the Main/Host.</p>
        <p className="text-xs text-slate-500">
          Only the Main/Host computer stores the clinic database and accepts connections from Doctor computers.
        </p>
        <Link href="/setup">
          <Button variant="outline" className="rounded-xl font-bold">Change this computer&apos;s role</Button>
        </Link>
      </div>
    );
  }

  const secsLeft = pairing.expiresAt ? Math.max(0, Math.round((pairing.expiresAt - now) / 1000)) : 0;

  return (
    <div className="space-y-6">
      {/* Server status */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            Main / Host — clinic network server
          </p>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Circle className={cn('h-2.5 w-2.5', status?.server.running ? 'fill-emerald-500 text-emerald-500' : 'fill-rose-500 text-rose-500')} />
            {status?.server.running ? 'Running' : 'Not running'} · port {status?.server.port ?? '—'}
          </p>
        </div>
      </div>

      {/* Pairing control */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Connect a Doctor computer</h3>
        </div>
        {pairing.enabled && pairing.code ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              On the Doctor computer, choose <b>Additional / Client Computer</b>, enter this Main computer&apos;s
              address, and type this code:
            </p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl font-black tracking-[0.3em] text-primary">{pairing.code}</span>
              <span className="text-xs font-semibold text-slate-400">expires in {secsLeft}s</span>
            </div>
            <Button variant="outline" onClick={() => disablePairing().then(refreshDevices)} className="rounded-xl font-bold">
              Stop pairing
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Generate a short-lived code, then enter it on the Doctor computer to authorize it. Each device gets its
              own secure credential — the code is not a permanent password.
            </p>
            <Button
              onClick={() => enablePairing().then((r) => { if (r) setPairing({ enabled: true, code: r.code, expiresAt: r.expiresAt }); })}
              className="bg-primary hover:bg-primary-light text-white rounded-xl font-bold"
            >
              Enable pairing
            </Button>
          </div>
        )}
      </div>

      {/* Connected / paired devices */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-slate-800">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Paired devices</h3>
        </div>
        {devices.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-3">No devices paired yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {devices.map((d) => (
              <div key={d.id} className={cn('flex items-center justify-between px-4 py-3', d.revoked && 'opacity-50')}>
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {d.name}
                    <Circle className={cn('h-2 w-2', d.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {d.revoked ? 'Revoked' : d.online ? 'Online' : 'Offline'}
                    {d.lastSeenAt ? ` · last seen ${new Date(d.lastSeenAt).toLocaleString('en-IN')}` : ''}
                  </p>
                </div>
                {!d.revoked && (
                  <Button
                    variant="ghost"
                    onClick={() => revokeDevice(d.id).then((ok) => { if (ok) void refreshDevices(); })}
                    className="h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
