import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, X509Certificate } from 'node:crypto';

/**
 * Per-install TLS certificate for the Host LAN server. Electron/Node cannot
 * self-sign an X.509 cert natively, so we use `selfsigned` (pure JS) to mint one
 * ONCE at first HOST startup and persist it. The cert stays stable across
 * restarts so a paired Client's pinned fingerprint keeps matching (spec §14:
 * security must not weaken in LAN mode — this encrypts the JWT, device token,
 * and all PHI in transit, and pinning defeats a same-Wi-Fi MITM).
 */

// selfsigned ships no type declarations. v5 is async (WebCrypto-based).
const selfsigned = require('selfsigned') as {
  generate: (
    attrs: Array<{ name: string; value: string }>,
    opts: Record<string, unknown>
  ) => Promise<{ private: string; cert: string; public: string }>;
};

export interface HostCert {
  key: string;
  cert: string;
}

let cached: HostCert | null = null;

function certPath(): string {
  return path.join(app.getPath('userData'), 'lan-tls.json');
}

export async function getOrCreateHostCert(): Promise<HostCert> {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(fs.readFileSync(certPath(), 'utf-8'));
    if (parsed?.key && parsed?.cert) {
      cached = { key: parsed.key, cert: parsed.cert };
      return cached;
    }
  } catch {
    /* absent/corrupt → generate a fresh one */
  }
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'Sugam HMS Host' }], {
    days: 3650,
    keySize: 2048,
    algorithm: 'sha256',
    // Make it a self-signed CA so a client that pins this cert can pass it as a
    // trust anchor (`ca:[cert]`) and have the leaf validate against itself. With
    // the default CA:false, OpenSSL rejects it as an issuer ("unable to verify
    // the first certificate"). keyCertSign + cA:true make it a valid anchor.
    extensions: [
      { name: 'basicConstraints', cA: true, critical: true },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, keyCertSign: true, critical: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] },
    ],
  });
  cached = { key: pems.private, cert: pems.cert };
  try {
    fs.writeFileSync(certPath(), JSON.stringify(cached), { mode: 0o600 });
  } catch (err) {
    console.error('[lan:cert] failed to persist TLS cert:', err);
  }
  return cached;
}

/** Base64 sha256 of a cert's SubjectPublicKeyInfo (DER) — the value clients pin. */
export function spkiFingerprintFromPem(certPem: string): string {
  const der = new X509Certificate(certPem).publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return createHash('sha256').update(der).digest('base64');
}

export function spkiFingerprintFromDer(der: Buffer): string {
  const spki = new X509Certificate(der).publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return createHash('sha256').update(spki).digest('base64');
}

/** Convert a DER cert (from a TLS peer) to PEM for storage/`ca` pinning. */
export function derToPem(der: Buffer): string {
  const b64 = der.toString('base64').replace(/(.{64})/g, '$1\n');
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
}
