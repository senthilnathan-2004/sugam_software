'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

export type DeploymentMode = 'STANDALONE' | 'HOST' | 'CLIENT';

export interface DeploymentInfo {
  mode: DeploymentMode;
  port: number;
  host: { address: string; port: number } | null;
  deviceName: string | null;
  paired: boolean;
  configured: boolean;
}

export interface ClientStatus {
  mode: 'CLIENT';
  state: 'connected' | 'reconnecting' | 'offline' | 'not-configured';
  latencyMs: number | null;
  hostName: string | null;
  appVersion: string | null;
  lastOkAt: number | null;
}

export interface HostStatus {
  mode: 'HOST';
  server: { running: boolean; port: number };
  devices: Array<{ id: string; name: string }>;
}

export type LanStatus = ClientStatus | HostStatus | { mode: 'STANDALONE' };

export interface HostDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  revoked: boolean;
  online: boolean;
}

async function call<T = any>(channel: string, payload?: unknown): Promise<T | null> {
  if (typeof window === 'undefined' || !window.electronAPI) return null;
  try {
    const res = await window.electronAPI.invoke(channel, payload);
    return res?.success ? ((res.data ?? {}) as T) : null;
  } catch {
    return null;
  }
}

export function useLan() {
  const getDeployment = useCallback(() => call<DeploymentInfo>('deployment:get'), []);

  const setDeployment = useCallback(
    async (mode: 'STANDALONE' | 'HOST', port?: number, deviceName?: string) => {
      if (typeof window === 'undefined' || !window.electronAPI) return null;
      const res = await window.electronAPI.invoke('deployment:set', { mode, port, deviceName });
      if (!res?.success) {
        toast.error(res?.error ?? 'Failed to save the setting.');
        return null;
      }
      return res.data as { mode: DeploymentMode; port: number; restartRequired: boolean };
    },
    []
  );

  const getStatus = useCallback(() => call<LanStatus>('lan:status'), []);
  const testConnection = useCallback(() => call<LanStatus>('lan:test'), []);

  const pair = useCallback(async (address: string, port: number, code: string, deviceName?: string) => {
    if (typeof window === 'undefined' || !window.electronAPI) return { success: false };
    const res = await window.electronAPI.invoke('lan:pair', { address, port, code, deviceName });
    if (!res?.success) {
      toast.error(res?.error ?? 'Pairing failed.');
      return { success: false };
    }
    return { success: true, data: res.data as { hostName: string | null; restartRequired: boolean } };
  }, []);

  const enablePairing = useCallback(
    () => call<{ enabled: boolean; code: string; expiresAt: number }>('lan:host:enable-pairing'),
    []
  );
  const disablePairing = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return false;
    const res = await window.electronAPI.invoke('lan:host:disable-pairing');
    return !!res?.success;
  }, []);
  const listDevices = useCallback(
    () =>
      call<{ pairing: { enabled: boolean; code?: string; expiresAt?: number }; devices: HostDevice[] }>(
        'lan:host:devices'
      ),
    []
  );
  const revokeDevice = useCallback(async (id: string) => {
    if (typeof window === 'undefined' || !window.electronAPI) return false;
    const res = await window.electronAPI.invoke('lan:host:revoke-device', { id });
    if (!res?.success) {
      toast.error(res?.error ?? 'Could not revoke the device.');
      return false;
    }
    return true;
  }, []);

  return {
    getDeployment,
    setDeployment,
    getStatus,
    testConnection,
    pair,
    enablePairing,
    disablePairing,
    listDevices,
    revokeDevice,
  };
}
