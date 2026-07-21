import * as https from 'node:https';
import type { TLSSocket } from 'node:tls';
import { getConfig, decryptSecret } from '../deployment.js';
import { spkiFingerprintFromDer, derToPem } from './cert.js';

/**
 * CLIENT transport: forward a shared IPC channel to the Host over HTTPS.
 *
 * Security (addresses the plaintext-credential finding): all traffic — the user
 * JWT, the device token, and every PHI payload — travels over TLS. The Host uses
 * a per-install self-signed cert; the Client PINS that cert's SPKI at pairing
 * (trust-on-first-use) and verifies it on every subsequent request, so a device
 * that knows the shared Wi-Fi password still cannot MITM or read the traffic.
 *
 * Guarantees kept: NEVER returns a false success (network/timeout/pin failure →
 * a `{ success:false, code }` envelope); single attempt per call so a
 * non-idempotent write is never silently duplicated by the transport.
 */

const RPC_TIMEOUT_MS = 8000;

export interface HostEnvelope {
  success: boolean;
  code?: string;
  error?: string;
  [k: string]: unknown;
}

interface HostConn {
  address: string;
  port: number;
  certPem?: string;
  spki?: string;
}

function getHostConn(): HostConn | null {
  const cfg = getConfig();
  if (!cfg.host?.address) return null;
  return {
    address: cfg.host.address,
    port: cfg.host.port || cfg.port,
    certPem: cfg.host.certPem,
    spki: cfg.host.spki,
  };
}

function deviceHeaders(): Record<string, string> {
  const cfg = getConfig();
  const headers: Record<string, string> = {};
  if (cfg.device?.id) {
    const token = decryptSecret(cfg.device.tokenEnc);
    if (token) {
      headers['X-Device-Id'] = cfg.device.id;
      headers['X-Device-Token'] = token;
    }
  }
  return headers;
}

interface RawResult {
  status: number;
  json: HostEnvelope | null;
  peerCertPem?: string;
  peerSpki?: string;
}

interface RequestOpts {
  address: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  /** When set, verify the Host presents this exact pinned cert. When absent,
   *  trust-on-first-use: accept any cert and capture it for pinning (pairing). */
  pin?: { certPem?: string; spki: string } | null;
}

function request(opts: RequestOpts): Promise<RawResult> {
  return new Promise((resolve, reject) => {
    const tofu = !opts.pin;
    const reqOpts: https.RequestOptions = {
      host: opts.address,
      port: opts.port,
      path: opts.path,
      method: opts.method,
      headers: opts.headers,
      timeout: RPC_TIMEOUT_MS,
    };
    if (opts.pin) {
      // Pin by SPKI; hostname/IP is intentionally ignored (the Host IP can
      // change). rejectUnauthorized + the pinned cert as its own CA still
      // require a valid chain to THAT key.
      if (opts.pin.certPem) reqOpts.ca = [opts.pin.certPem];
      reqOpts.rejectUnauthorized = true;
      reqOpts.checkServerIdentity = (_host, cert) => {
        try {
          const der = (cert as unknown as { raw?: Buffer }).raw;
          if (der && spkiFingerprintFromDer(der) === opts.pin!.spki) return undefined;
        } catch {
          /* fall through to failure */
        }
        return new Error('Host certificate does not match the paired certificate.');
      };
    } else {
      // TRUST-ON-FIRST-USE, pairing ONLY. A self-signed cert has no chain to
      // validate on first contact, so we accept it once here and immediately
      // capture + PIN its SPKI (see pairWithHost). EVERY subsequent request
      // (the `if (opts.pin)` branch above) enforces rejectUnauthorized:true and
      // verifies that pin — so ongoing traffic is fully MITM-protected. The only
      // residual exposure is a MITM during the ~5-min admin-initiated pairing
      // window on the private LAN; mitigate by verifying the fingerprint
      // out-of-band (see DEPLOYMENT_LAN.md). This flag is never used post-pairing.
      reqOpts.rejectUnauthorized = false;
    }

    const req = https.request(reqOpts, (res) => {
      let peerCertPem: string | undefined;
      let peerSpki: string | undefined;
      if (tofu) {
        try {
          const socket = res.socket as TLSSocket;
          const pc = socket.getPeerCertificate(true) as unknown as { raw?: Buffer };
          if (pc?.raw) {
            peerCertPem = derToPem(pc.raw);
            peerSpki = spkiFingerprintFromDer(pc.raw);
          }
        } catch {
          /* leave undefined → caller treats as pairing failure */
        }
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json: HostEnvelope | null = null;
        try {
          json = data ? (JSON.parse(data) as HostEnvelope) : null;
        } catch {
          json = null;
        }
        resolve({ status: res.statusCode || 0, json, peerCertPem, peerSpki });
      });
    });
    req.on('timeout', () => req.destroy(new Error('ETIMEDOUT')));
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function isCertError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  const code = (err as { code?: string })?.code ?? '';
  return /certificate|self.signed|CERT_|TLS/i.test(msg) || /CERT|TLS/i.test(code);
}

export async function forwardToHost(
  channel: string,
  data: unknown,
  token: string | null
): Promise<HostEnvelope> {
  const conn = getHostConn();
  if (!conn || !conn.spki) {
    return {
      success: false,
      code: 'HOST_NOT_CONFIGURED',
      error: 'This computer is not connected to a Main Sugam HMS computer yet.',
    };
  }
  try {
    const res = await request({
      address: conn.address,
      port: conn.port,
      path: '/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...deviceHeaders(),
      },
      body: JSON.stringify({ channel, data }),
      pin: { certPem: conn.certPem, spki: conn.spki },
    });
    if (res.status === 503) {
      return {
        success: false,
        code: 'HOST_MAINTENANCE',
        error: 'The Main computer is updating its database. Please wait a moment and try again.',
      };
    }
    if (res.status === 401 || res.status === 403) {
      return (
        res.json ?? {
          success: false,
          code: 'DEVICE_UNAUTHORIZED',
          error: 'This device is not authorized to connect to the Main computer.',
        }
      );
    }
    if (res.json && typeof res.json === 'object') return res.json;
    return { success: false, code: 'HOST_BAD_RESPONSE', error: 'Unexpected response from the Main computer.' };
  } catch (err) {
    if (isCertError(err)) {
      console.error(`[lan:client] '${channel}' TLS/pin failure:`, (err as Error)?.message ?? err);
      return {
        success: false,
        code: 'HOST_CERT_MISMATCH',
        error:
          'The Main computer could not be securely verified (certificate changed). Re-pair this computer from Multi-PC setup.',
      };
    }
    const aborted = (err as Error)?.message === 'ETIMEDOUT';
    console.error(`[lan:client] forward '${channel}' failed:`, (err as Error)?.message ?? err);
    return {
      success: false,
      code: 'HOST_OFFLINE',
      error: aborted
        ? 'The Main computer did not respond in time. Please try again.'
        : 'Unable to reach the Main Sugam HMS computer. Check that it is on and connected to the same Wi-Fi/LAN.',
    };
  }
}

export interface HealthResult {
  ok: boolean;
  latencyMs?: number;
  hostName?: string;
  appVersion?: string;
  maintenance?: boolean;
}

/** Pinned /health probe used by the connection manager. */
export async function getHostHealth(): Promise<HealthResult> {
  const conn = getHostConn();
  if (!conn || !conn.spki) return { ok: false };
  const start = Date.now();
  try {
    const res = await request({
      address: conn.address,
      port: conn.port,
      path: '/health',
      method: 'GET',
      pin: { certPem: conn.certPem, spki: conn.spki },
    });
    const j = res.json as
      | { status?: string; hostName?: string; appVersion?: string; maintenance?: boolean }
      | null;
    if (res.status === 200 && j?.status === 'ok') {
      return {
        ok: true,
        latencyMs: Date.now() - start,
        hostName: j.hostName,
        appVersion: j.appVersion,
        maintenance: j.maintenance,
      };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export interface PairOutcome extends HostEnvelope {
  deviceId?: string;
  deviceToken?: string;
  hostName?: string;
  certPem?: string;
  spki?: string;
}

/**
 * One-time pairing exchange over TLS (trust-on-first-use): accept the Host's
 * self-signed cert, capture its PEM + SPKI for pinning, and exchange the code
 * for a device credential. Returns the captured cert so the caller can persist
 * the pin alongside the device credential.
 */
export async function pairWithHost(
  address: string,
  port: number,
  code: string,
  deviceName: string
): Promise<PairOutcome> {
  try {
    const res = await request({
      address,
      port,
      path: '/pair',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceName }),
      pin: null, // TOFU
    });
    if (!res.peerSpki) {
      return { success: false, code: 'HOST_OFFLINE', error: 'Could not read the Main computer certificate.' };
    }
    const body = res.json as PairOutcome | null;
    if (body && typeof body === 'object') {
      return { ...body, certPem: res.peerCertPem, spki: res.peerSpki };
    }
    return { success: false, code: 'HOST_BAD_RESPONSE', error: 'Unexpected response from the Main computer.' };
  } catch (err) {
    const aborted = (err as Error)?.message === 'ETIMEDOUT';
    return {
      success: false,
      code: 'HOST_OFFLINE',
      error: aborted
        ? 'The Main computer did not respond in time.'
        : 'Could not reach the Main computer at that address. Check the address, Wi-Fi/LAN, and that Sugam HMS is running there.',
    };
  }
}
