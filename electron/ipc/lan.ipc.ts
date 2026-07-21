import { z } from 'zod';
import { handle } from './authorize.js';
import { getMode, getConfig, setConfig, encryptSecret } from '../deployment.js';
import { getSession } from '../session.js';
import { writeAudit } from '../audit.js';
import { getConnectionStatus, testConnection } from '../lan/connection.js';
import { pairWithHost } from '../lan/client.js';
import { enablePairing, disablePairing, getPairingState, listDevices, revokeDevice } from '../lan/pairing.js';
import { getConnectedDevices, isLanServerRunning } from '../lan/server.js';

/**
 * Local-only LAN status/pairing channels (spec §16-§19). Never forwarded.
 *   - lan:status / lan:test / lan:pair : client-facing, work pre-login (PUBLIC).
 *   - lan:host:* : Host administration, ADMIN-gated (manage who may connect).
 */

const PairSchema = z.object({
  address: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  code: z.string().min(4).max(12),
  deviceName: z.string().max(60).optional(),
});

export function registerLanIpc(): void {
  // ── Client status ─────────────────────────────────────────────────────────
  handle('lan:status', async () => {
    const mode = getMode();
    const cfg = getConfig();
    if (mode === 'CLIENT') {
      return { success: true, data: { mode, ...getConnectionStatus() } };
    }
    if (mode === 'HOST') {
      return {
        success: true,
        data: {
          mode,
          server: { running: isLanServerRunning(), port: cfg.port },
          devices: getConnectedDevices(),
        },
      };
    }
    return { success: true, data: { mode } };
  });

  handle('lan:test', async () => {
    if (getMode() !== 'CLIENT') return { success: true, data: { mode: getMode() } };
    return { success: true, data: await testConnection() };
  });

  // ── Client pairing ──────────────────────────────────────────────────────────
  handle('lan:pair', async (_event, data) => {
    const parsed = PairSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid pairing details.' };
    }
    const { address, port, code, deviceName } = parsed.data;
    const r = await pairWithHost(address, port, code, deviceName ?? '');
    if (!r.success || !r.deviceId || !r.deviceToken || !r.spki) {
      return { success: false, code: r.code, error: r.error ?? 'Pairing failed.' };
    }
    setConfig({
      mode: 'CLIENT',
      // Persist the pinned Host cert (PEM + SPKI) captured during pairing so
      // every later HTTPS request verifies the Host's identity.
      host: { address, port, certPem: r.certPem, spki: r.spki },
      device: { id: r.deviceId, tokenEnc: encryptSecret(r.deviceToken) },
      deviceName: deviceName ?? getConfig().deviceName,
    });
    console.log(`[lan] paired with host ${address}:${port} — restart required`);
    return { success: true, data: { hostName: r.hostName ?? null, restartRequired: true } };
  });

  // ── Host administration (ADMIN) ──────────────────────────────────────────────
  handle('lan:host:enable-pairing', async (_event, _data, session) => {
    if (getMode() !== 'HOST') {
      return { success: false, error: 'Enable Main/Host mode on this computer before pairing devices.' };
    }
    const state = enablePairing();
    await writeAudit(session, 'UPDATE', 'DevicePairing', null, { action: 'enabled' });
    return { success: true, data: state };
  });

  handle('lan:host:disable-pairing', async (_event, _data, session) => {
    disablePairing();
    await writeAudit(session, 'UPDATE', 'DevicePairing', null, { action: 'disabled' });
    return { success: true };
  });

  handle('lan:host:devices', async () => {
    const [devices, pairing] = [await listDevices(), getPairingState()];
    const online = new Set(getConnectedDevices().map((d) => d.id));
    return {
      success: true,
      data: {
        pairing,
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          pairedAt: d.pairedAt,
          lastSeenAt: d.lastSeenAt,
          revoked: d.revoked,
          online: online.has(d.id),
        })),
      },
    };
  });

  handle('lan:host:revoke-device', async (_event, data, session) => {
    const id = typeof (data as { id?: unknown })?.id === 'string' ? (data as { id: string }).id : '';
    if (!id) return { success: false, error: 'Missing device id.' };
    const ok = await revokeDevice(id);
    if (ok) await writeAudit(session, 'UPDATE', 'Device', id, { action: 'revoked' });
    return ok ? { success: true } : { success: false, error: 'Could not revoke that device.' };
  });
}
