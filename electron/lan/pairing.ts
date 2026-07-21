import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db.js';
import { hashToken } from './device-auth.js';

/** Constant-time equality for the pairing code (removes a timing side-channel). */
function codeMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Host-side device pairing (spec §17).
 *
 * An admin explicitly ENABLES pairing, which mints a short-lived 6-digit code
 * shown on the Host screen. A Doctor client submits that code once to receive a
 * long, random, per-device credential (stored hashed). The 6-digit code is NOT
 * a long-term secret — it only gates the one-time exchange and expires quickly;
 * the durable credential is the random device token (spec: "Do not use a
 * permanent six-digit code as the only long-term authentication mechanism").
 */

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 5; // brute-force guard (1e6 space, but throttle anyway)

interface ActiveCode {
  code: string;
  expiresAt: number;
  failedAttempts: number;
}

let active: ActiveCode | null = null;

export interface PairingState {
  enabled: boolean;
  /** Present only while enabled; the code itself is returned only to the Host UI. */
  code?: string;
  expiresAt?: number;
}

function isExpired(c: ActiveCode): boolean {
  return Date.now() > c.expiresAt;
}

/** Admin enables pairing → mint a fresh code. Returns the code for the Host UI. */
export function enablePairing(ttlMs: number = CODE_TTL_MS): PairingState {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  active = { code, expiresAt: Date.now() + ttlMs, failedAttempts: 0 };
  console.log('[lan:pairing] pairing enabled (code expires in ' + Math.round(ttlMs / 1000) + 's)');
  return { enabled: true, code, expiresAt: active.expiresAt };
}

export function disablePairing(): void {
  if (active) console.log('[lan:pairing] pairing disabled');
  active = null;
}

/** State for the Host UI (includes the code so the admin can read it aloud). */
export function getPairingState(): PairingState {
  if (!active || isExpired(active)) {
    active = null;
    return { enabled: false };
  }
  return { enabled: true, code: active.code, expiresAt: active.expiresAt };
}

export interface PairResult {
  deviceId: string;
  deviceToken: string;
}

/**
 * Validate a submitted code and, on success, register a new device returning its
 * one-time plaintext credential. Wrong codes count against a small attempt
 * budget; exhausting it (or expiry) invalidates the code so the admin must
 * re-enable pairing.
 */
export async function pairDevice(code: string, deviceName: string): Promise<PairResult | null> {
  if (!active || isExpired(active)) {
    active = null;
    return null;
  }
  if (!codeMatches(code, active.code)) {
    active.failedAttempts += 1;
    if (active.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      console.warn('[lan:pairing] too many failed attempts — pairing code invalidated');
      active = null;
    }
    return null;
  }

  const token = randomBytes(32).toString('hex');
  const name = (deviceName || '').trim().slice(0, 60) || 'Clinic device';
  const device = await prisma.device.create({
    data: { name, tokenHash: hashToken(token) },
  });
  // One-shot: burn the code immediately after a successful pair so it cannot be
  // reused to pair a second (possibly rogue) device within its validity window.
  // The admin re-enables pairing for each additional device.
  active = null;
  console.log(`[lan:pairing] device paired: ${name} (${device.id})`);
  return { deviceId: device.id, deviceToken: token };
}

export async function listDevices(): Promise<
  Array<{ id: string; name: string; pairedAt: Date; lastSeenAt: Date | null; revoked: boolean }>
> {
  return prisma.device.findMany({ orderBy: { pairedAt: 'desc' } });
}

export async function revokeDevice(deviceId: string): Promise<boolean> {
  try {
    await prisma.device.update({ where: { id: deviceId }, data: { revoked: true } });
    console.log(`[lan:pairing] device revoked: ${deviceId}`);
    return true;
  } catch {
    return false;
  }
}
