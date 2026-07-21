import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db.js';

/**
 * Device-credential verification for the Host LAN server. Every LAN request must
 * present a paired-device credential (X-Device-Id + X-Device-Token) in addition
 * to the user's JWT — two independent factors, both checked server-side (spec
 * §14/§17). The plaintext token is never stored; only its sha256 hash is.
 */

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf-8').digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
  } catch {
    return false;
  }
}

export interface VerifiedDevice {
  id: string;
  name: string;
}

/**
 * Resolve a paired device from its id + token, or null if unknown, revoked, or
 * the token doesn't match. Bumps lastSeenAt (fire-and-forget) so the Host can
 * show connected devices and warn on shutdown.
 */
export async function verifyDevice(
  deviceId: string | undefined | null,
  deviceToken: string | undefined | null
): Promise<VerifiedDevice | null> {
  if (!deviceId || !deviceToken) return null;
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device || device.revoked) return null;
  if (!safeEqualHex(device.tokenHash, hashToken(deviceToken))) return null;

  prisma.device
    .update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {
      /* advisory; never fail the request on a lastSeen write */
    });

  return { id: device.id, name: device.name };
}
