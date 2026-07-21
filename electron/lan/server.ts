import * as http from 'node:http';
import * as https from 'node:https';
import * as os from 'node:os';
import { app } from 'electron';
import { dispatch } from '../ipc/authorize.js';
import { verifyDevice } from './device-auth.js';
import { pairDevice } from './pairing.js';
import { getOrCreateHostCert } from './cert.js';
import { getConfig, DEFAULT_LAN_PORT } from '../deployment.js';

/**
 * Host LAN HTTP server (spec §13). A dependency-free node:http server bound to
 * 0.0.0.0:<port> exposing exactly three routes:
 *   GET  /health  (public)  → liveness + version/mode for the client status UI
 *   POST /pair    (public)  → exchange a pairing code for a device credential
 *   POST /rpc     (device+user authed) → run a business channel via dispatch()
 *
 * /rpc reuses the SAME dispatch() as local IPC, so validation/authorization/
 * audit/business rules are identical regardless of origin (spec §11/§14). The
 * device credential and the user's JWT are two independent, server-verified
 * factors; the renderer's claimed identity is never trusted.
 */

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB guard (documents ride patient IPC, not here)

let server: https.Server | null = null;
let maintenance = false;

/** deviceId -> last-seen info, for the connected-devices UI + shutdown warning. */
const connected = new Map<string, { name: string; lastSeen: number }>();

export function setMaintenance(on: boolean): void {
  maintenance = on;
}

export function getConnectedDevices(withinMs = 30_000): Array<{ id: string; name: string }> {
  const cutoff = Date.now() - withinMs;
  const out: Array<{ id: string; name: string }> = [];
  for (const [id, info] of connected) {
    if (info.lastSeen >= cutoff) out.push({ id, name: info.name });
  }
  return out;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function bearer(req: http.IncomingMessage): string | null {
  const h = req.headers['authorization'];
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice('Bearer '.length);
  return null;
}

function headerStr(req: http.IncomingMessage, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  return typeof v === 'string' ? v : null;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = (req.url || '').split('?')[0];
  const method = req.method || 'GET';

  // ── GET /health ── public liveness/version (spec §35) ───────────────────────
  if (method === 'GET' && url === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      appVersion: app.getVersion(),
      mode: getConfig().mode,
      hostName: hostDisplayName(),
      maintenance,
      dbReady: !maintenance,
    });
    return;
  }

  // ── POST /pair ── exchange a pairing code for a device credential ───────────
  if (method === 'POST' && url === '/pair') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}') as { code?: string; deviceName?: string };
      const result = await pairDevice(String(body.code ?? ''), String(body.deviceName ?? ''));
      if (!result) {
        sendJson(res, 400, {
          success: false,
          code: 'PAIRING_FAILED',
          error: 'Invalid or expired pairing code. Ask the Main computer to enable pairing again.',
        });
        return;
      }
      sendJson(res, 200, { success: true, ...result, hostName: hostDisplayName() });
    } catch {
      sendJson(res, 400, { success: false, code: 'BAD_REQUEST', error: 'Malformed pairing request.' });
    }
    return;
  }

  // ── POST /rpc ── the shared business surface ────────────────────────────────
  if (method === 'POST' && url === '/rpc') {
    if (maintenance) {
      // Do not let clients touch the DB mid-migration (spec §37).
      sendJson(res, 503, {
        success: false,
        code: 'HOST_MAINTENANCE',
        error: 'The Main computer is updating. Please wait a moment and try again.',
      });
      return;
    }

    let parsed: { channel?: string; data?: unknown };
    try {
      parsed = JSON.parse((await readBody(req)) || '{}');
    } catch {
      sendJson(res, 400, { success: false, code: 'BAD_REQUEST', error: 'Malformed request body.' });
      return;
    }
    const channel = typeof parsed.channel === 'string' ? parsed.channel : '';

    // Local-only channels manage a specific PC; they are never valid over LAN.
    if (!channel || channel.startsWith('deployment:') || channel.startsWith('lan:')) {
      sendJson(res, 403, { success: false, error: 'This operation is not available over the network.' });
      return;
    }

    // Factor 1: paired device.
    const device = await verifyDevice(headerStr(req, 'X-Device-Id'), headerStr(req, 'X-Device-Token'));
    if (!device) {
      console.warn(`[lan:server] /rpc ${channel}: DENIED — device not paired/revoked.`);
      sendJson(res, 401, {
        success: false,
        code: 'DEVICE_UNAUTHORIZED',
        error: 'This device is not authorized to connect. Please pair it again.',
      });
      return;
    }
    connected.set(device.id, { name: device.name, lastSeen: Date.now() });

    // Factor 2: user session (JWT) + role — enforced inside dispatch().
    const token = bearer(req);
    const result = await dispatch(channel, parsed.data, token, { source: 'LAN', device });
    // Always 200 for a resolved envelope; the client reads `success`.
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { success: false, error: 'Not found.' });
}

function hostDisplayName(): string {
  try {
    return os.hostname();
  } catch {
    return 'Sugam HMS Host';
  }
}

/** Start the LAN server. Resolves once listening; rejects on bind failure. */
export async function startLanServer(port?: number): Promise<void> {
  const listenPort = port ?? getConfig().port ?? DEFAULT_LAN_PORT;
  if (server) return;
  // TLS: encrypts the JWT, device token, and all PHI in transit. Per-install
  // self-signed cert (generated once); clients pin its SPKI at pairing.
  const { key, cert } = await getOrCreateHostCert();
  await new Promise<void>((resolve, reject) => {
    const srv = https.createServer({ key, cert }, (req, res) => {
      handleRequest(req, res).catch((err) => {
        console.error('[lan:server] request handler crashed:', err);
        try {
          sendJson(res, 500, { success: false, error: 'Internal server error.' });
        } catch {
          /* response may be partially sent */
        }
      });
    });
    server = srv;
    // A client that pins a different cert aborts the TLS handshake — swallow it
    // rather than surfacing a noisy unhandled socket error.
    srv.on('tlsClientError', () => {});
    srv.on('error', (err: NodeJS.ErrnoException) => {
      console.error(`[lan:server] failed to bind 0.0.0.0:${listenPort}:`, err.message);
      server = null;
      reject(err);
    });
    // Bind on all interfaces so LAN clients can reach it (spec §13). Exposure is
    // restricted to the private network via the Windows Firewall rule (Phase I).
    srv.listen(listenPort, '0.0.0.0', () => {
      console.log(`[lan:server] listening (TLS) on 0.0.0.0:${listenPort} (host: ${hostDisplayName()})`);
      resolve();
    });
  });
}

export function stopLanServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      console.log('[lan:server] stopped');
      server = null;
      resolve();
    });
  });
}

export function isLanServerRunning(): boolean {
  return server !== null;
}
