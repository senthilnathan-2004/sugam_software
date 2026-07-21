import { z } from 'zod';
import { handle } from './authorize.js';
import { getConfig, getRawConfigOrNull, setConfig, DEFAULT_LAN_PORT } from '../deployment.js';
import { getSession } from '../session.js';
import { writeAudit } from '../audit.js';

/**
 * Local-only deployment configuration (spec §15). These channels run on THIS
 * computer and are never forwarded to a Host. They must work before login (a
 * fresh install is unconfigured), hence PUBLIC in authorize.ts. Switching TO
 * CLIENT goes through the pairing flow (lan:pair), not here.
 *
 * A mode change requires an app restart because DB provisioning (env.ts) and
 * LAN startup (main.ts) are decided once at boot — so `deployment:set` persists
 * the choice and signals `restartRequired`.
 */

const SetSchema = z.object({
  mode: z.enum(['STANDALONE', 'HOST']),
  port: z.number().int().min(1).max(65535).optional(),
  deviceName: z.string().max(60).optional(),
});

export function registerDeploymentIpc(): void {
  handle('deployment:get', async () => {
    const cfg = getConfig();
    return {
      success: true,
      data: {
        mode: cfg.mode,
        port: cfg.port,
        // Expose only address/port to the renderer — not the pinned cert PEM.
        host: cfg.host ? { address: cfg.host.address, port: cfg.host.port } : null,
        deviceName: cfg.deviceName ?? null,
        paired: !!cfg.device,
        configured: getRawConfigOrNull() !== null,
      },
    };
  });

  handle('deployment:set', async (_event, data, _session, token) => {
    const parsed = SetSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid deployment settings.' };
    }
    const next = setConfig({
      mode: parsed.data.mode,
      port: parsed.data.port ?? DEFAULT_LAN_PORT,
      deviceName: parsed.data.deviceName,
    });
    // Best-effort audit with the real actor when a session exists (reconfigure
    // by an admin on a Host/Standalone box); skipped silently pre-login.
    await writeAudit(getSession(token), 'UPDATE', 'Deployment', null, { mode: next.mode, port: next.port });
    console.log(`[deployment] mode set to ${next.mode} (port ${next.port}) — restart required`);
    return { success: true, data: { mode: next.mode, port: next.port, restartRequired: true } };
  });
}
