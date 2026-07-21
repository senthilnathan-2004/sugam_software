import { getHostHealth } from './client.js';
import { getConfig } from '../deployment.js';

/**
 * CLIENT connection manager (spec §19). Polls the Host's (pinned, HTTPS) /health
 * on an interval and maintains a small status the renderer reads via `lan:status`
 * to show the 🟢/🟡/🔴 banner. A single miss is "reconnecting"; several misses in
 * a row is "offline". Observational only — the transport itself fails closed
 * per-request.
 */

export type ConnectionState = 'connected' | 'reconnecting' | 'offline' | 'not-configured';

export interface ConnectionStatus {
  state: ConnectionState;
  latencyMs: number | null;
  hostName: string | null;
  appVersion: string | null;
  lastOkAt: number | null;
}

const POLL_INTERVAL_MS = 5000;
const OFFLINE_AFTER_FAILS = 3;

let status: ConnectionStatus = {
  state: 'not-configured',
  latencyMs: null,
  hostName: null,
  appVersion: null,
  lastOkAt: null,
};
let timer: NodeJS.Timeout | null = null;
let consecutiveFails = 0;

function hostConfigured(): boolean {
  const h = getConfig().host;
  return !!h?.address && !!h?.spki;
}

function applyResult(r: { ok: boolean; latencyMs?: number; hostName?: string; appVersion?: string }): void {
  if (!hostConfigured()) {
    status = { state: 'not-configured', latencyMs: null, hostName: null, appVersion: null, lastOkAt: status.lastOkAt };
    consecutiveFails = 0;
    return;
  }
  if (r.ok) {
    consecutiveFails = 0;
    status = {
      state: 'connected',
      latencyMs: r.latencyMs ?? null,
      hostName: r.hostName ?? status.hostName,
      appVersion: r.appVersion ?? status.appVersion,
      lastOkAt: Date.now(),
    };
  } else {
    consecutiveFails += 1;
    status = { ...status, state: consecutiveFails >= OFFLINE_AFTER_FAILS ? 'offline' : 'reconnecting', latencyMs: null };
  }
}

export function getConnectionStatus(): ConnectionStatus {
  return { ...status };
}

/** Force an immediate probe (used by the "Test connection" button). */
export async function testConnection(): Promise<ConnectionStatus> {
  if (!hostConfigured()) {
    applyResult({ ok: false });
    return getConnectionStatus();
  }
  applyResult(await getHostHealth());
  return getConnectionStatus();
}

export function startConnectionManager(): void {
  if (timer) return;
  void testConnection();
  timer = setInterval(() => {
    void testConnection();
  }, POLL_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  console.log('[lan:connection] client connection manager started');
}

export function stopConnectionManager(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
