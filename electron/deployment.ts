import { app, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Deployment-mode configuration for the offline multi-PC LAN feature.
 *
 * This is intentionally a FILE OUTSIDE the clinic database (`deployment.json`
 * in userData) so the app knows how to start — whether to open the local DB,
 * run migrations, start the LAN server, or forward everything to a Host —
 * BEFORE any database connectivity exists. It is read on the very first line of
 * the main process (via env.ts), before the Prisma client is constructed.
 *
 * Three modes (spec §4):
 *   - STANDALONE: existing single-PC behavior. Owns a local authoritative DB.
 *   - HOST:       owns the single authoritative DB + runs the LAN server so
 *                 Doctor clients can share it. (Billing PC by default.)
 *   - CLIENT:     owns NO operational DB. Forwards every request to the Host
 *                 over the LAN. (Doctor PCs.)
 *
 * BACKWARD COMPATIBILITY: a missing/unreadable config resolves to STANDALONE, so
 * every existing single-PC install keeps working exactly as before with no
 * first-run gate. The mode is chosen explicitly from the in-app setup/settings.
 */

export type DeploymentMode = 'STANDALONE' | 'HOST' | 'CLIENT';

export const DEFAULT_LAN_PORT = 4783; // spec §13

export interface HostRef {
  address: string;
  port: number;
  /**
   * Pinned Host TLS certificate (PEM) + its SPKI fingerprint, captured
   * trust-on-first-use during pairing. Every later HTTPS request verifies the
   * Host presents this exact key — defeats a same-Wi-Fi MITM. Not secret.
   */
  certPem?: string;
  spki?: string;
}

/** A paired-device credential (CLIENT only). `tokenEnc` is encrypted at rest. */
export interface DeviceCredential {
  id: string;
  tokenEnc: string;
}

export interface DeploymentConfig {
  mode: DeploymentMode;
  /** Port the HOST listens on / the CLIENT connects to. */
  port: number;
  /** CLIENT: where the Host is reachable. */
  host?: HostRef;
  /** CLIENT: the credential issued by the Host at pairing time. */
  device?: DeviceCredential;
  /** Friendly name for THIS computer (shown in the Host's connected-devices list). */
  deviceName?: string;
}

const CONFIG_FILE = 'deployment.json';

function configPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

/** In-process cache so getMode()/getConfig() are cheap and consistent. */
let cache: DeploymentConfig | null = null;
let loaded = false;

function defaults(): DeploymentConfig {
  return { mode: 'STANDALONE', port: DEFAULT_LAN_PORT };
}

/**
 * Read the raw persisted config, or null if the file is absent/unreadable.
 * The renderer uses null to detect a never-configured (fresh) install and offer
 * the setup screen — without forcing existing standalone users through it.
 */
export function getRawConfigOrNull(): DeploymentConfig | null {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DeploymentConfig>;
    if (parsed && (parsed.mode === 'STANDALONE' || parsed.mode === 'HOST' || parsed.mode === 'CLIENT')) {
      return { ...defaults(), ...parsed, mode: parsed.mode };
    }
  } catch {
    /* absent or corrupt → treated as unconfigured */
  }
  return null;
}

function load(): DeploymentConfig {
  if (loaded && cache) return cache;
  cache = getRawConfigOrNull() ?? defaults();
  loaded = true;
  return cache;
}

/** Full effective config (defaults filled). Never throws. */
export function getConfig(): DeploymentConfig {
  return { ...load() };
}

/** The effective deployment mode. Missing config → STANDALONE (back-compat). */
export function getMode(): DeploymentMode {
  return load().mode;
}

export function isConfigured(): boolean {
  return getRawConfigOrNull() !== null;
}

/**
 * Persist a (partial) config change and update the in-process cache. Written
 * with 0600 perms since it can carry an (encrypted) device credential.
 * Returns the new effective config.
 */
export function setConfig(patch: Partial<DeploymentConfig>): DeploymentConfig {
  const next: DeploymentConfig = { ...load(), ...patch };
  // Normalize: a non-CLIENT install shouldn't retain host/device pairing state.
  if (next.mode !== 'CLIENT') {
    delete next.host;
    delete next.device;
  }
  try {
    fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('[deployment] Failed to persist config:', err);
  }
  cache = next;
  loaded = true;
  return { ...next };
}

/* ── Device-credential encryption ─────────────────────────────────────────────
 * The CLIENT stores the Host-issued device token at rest. Use the OS keychain
 * (DPAPI on Windows) via Electron safeStorage when available; otherwise fall
 * back to base64 with an explicit marker so we never silently believe an
 * unencrypted value is protected. safeStorage is only touched here (lazily),
 * never at config-read time, since it may be unavailable very early in startup.
 */
const ENC_PREFIX = 'enc:';
const B64_PREFIX = 'b64:';

export function encryptSecret(plain: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64');
    }
  } catch {
    /* fall through to base64 */
  }
  return B64_PREFIX + Buffer.from(plain, 'utf-8').toString('base64');
}

export function decryptSecret(stored: string | undefined | null): string | null {
  if (!stored) return null;
  try {
    if (stored.startsWith(ENC_PREFIX)) {
      return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'));
    }
    if (stored.startsWith(B64_PREFIX)) {
      return Buffer.from(stored.slice(B64_PREFIX.length), 'base64').toString('utf-8');
    }
  } catch (err) {
    console.error('[deployment] Failed to decrypt device secret:', err);
  }
  return null;
}
