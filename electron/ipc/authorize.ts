import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getSession, type Session, type SessionRole } from '../session.js';
import { getMode } from '../deployment.js';
import { forwardToHost } from '../lan/client.js';
import { runWithRequestContext, type RequestDevice, type RequestSource } from '../request-context.js';

/**
 * Single IPC/LAN authorization middleware. EVERY handler in every namespace is
 * registered through `handle()` instead of `ipcMain.handle()` so that, before
 * any handler body runs, we:
 *   1. Require a valid server-side session for all non-public channels
 *      (the token is attached by preload.ts / carried in the LAN Authorization
 *      header and resolved server-side — the payload's own `role`/`userId`
 *      fields are never trusted).
 *   2. Enforce a per-channel role requirement (CHANNEL_ROLES below).
 *   3. Normalise the response to `{ success, error }` if the handler throws,
 *      so a raw throw can never crash the caller's `await`.
 *
 * TRANSPORT (offline multi-PC LAN feature):
 *   - `handle()` records every handler into `channelRegistry` and registers an
 *     `ipcMain.handle`. In STANDALONE/HOST the IPC call runs LOCALLY via
 *     `dispatch()`. In CLIENT mode a shared channel is FORWARDED to the Host
 *     over HTTP (`forwardToHost`) — local-only channels (`deployment:`, `lan:`)
 *     always run locally since they configure/monitor this very PC.
 *   - The HOST LAN server (electron/lan/server.ts) calls the SAME `dispatch()`
 *     with `source:'LAN'`, so identical validation/authorization/business rules
 *     apply regardless of origin — no duplicated logic (spec §11).
 *
 * The role map mirrors the existing client-side RBAC (sidebar visibility in
 * src/components/layout/sidebar.tsx + ROLE_PERMISSIONS in
 * src/features/auth/types/auth.types.ts) so no legitimate workflow breaks, with
 * every privileged/destructive channel pinned to ADMIN.
 */

const ALL: SessionRole[] = ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTION'];

/** `'ANY'` = any authenticated user; an array = only those roles. */
type RoleReq = SessionRole[] | 'ANY';

/**
 * Channels that must work WITHOUT a session:
 *   - the login flow itself, and
 *   - local device configuration/pairing, which necessarily happens on a fresh
 *     CLIENT before any Host user has logged in (spec §15/§17). These are ALSO
 *     local-only (never forwarded) — see `isLocalOnly`.
 */
const PUBLIC_CHANNELS = new Set<string>([
  'auth:login',
  'auth:verify',
  'auth:logout',
  'deployment:get',
  'deployment:set',
  'lan:status',
  'lan:test',
  'lan:pair',
]);

const CHANNEL_ROLES: Record<string, RoleReq> = {
  // ── auth ────────────────────────────────────────────────────────────────
  'auth:change-password': 'ANY', // any signed-in user may change their OWN password

  // ── patient ── read: all roles; write: not BILLING; delete: ADMIN ────────
  'patient:list': ALL,
  'patient:get': ALL,
  'patient:export': ALL,
  'patient:create': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'patient:update': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'patient:import': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'patient:document:upload': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'patient:delete': ['ADMIN'],

  // ── doctor / reception ───────────────────────────────────────────────────
  'doctor:list': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'doctor:get': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'doctor:history': ['ADMIN', 'DOCTOR', 'RECEPTION'],
  'doctor:queue': ['ADMIN', 'DOCTOR'],
  'doctor:me': ['ADMIN', 'DOCTOR'], // resolve the caller's OWN Doctor row
  'doctor:consultation:create': ['ADMIN', 'DOCTOR'],
  // Fee is doctor-reference-only: this detail channel (which returns
  // consultationFee) is DOCTOR/ADMIN only — RECEPTION/BILLING never receive it.
  'doctor:consultation:get': ['ADMIN', 'DOCTOR'],
  'doctor:appointment:walk-in': ['ADMIN', 'DOCTOR'],
  'doctor:patient:register-and-visit': ['ADMIN', 'DOCTOR'],
  'reception:appointment:create': ['ADMIN', 'RECEPTION', 'DOCTOR'],

  // ── inventory ── read: ADMIN|DOCTOR|BILLING; write: ADMIN|BILLING ────────
  'inventory:categories:list': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:suppliers:list': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:medicines:list': ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTION'],
  'inventory:purchases:list': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:alerts': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:reports:analytics': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:reports:export': ['ADMIN', 'DOCTOR', 'BILLING'],
  'inventory:suppliers:create': ['ADMIN', 'BILLING'],
  'inventory:suppliers:update': ['ADMIN', 'BILLING'],
  'inventory:suppliers:delete': ['ADMIN', 'BILLING'],
  'inventory:medicines:create': ['ADMIN', 'BILLING'],
  'inventory:medicines:update': ['ADMIN', 'BILLING'],
  'inventory:medicines:delete': ['ADMIN', 'BILLING'],
  'inventory:purchases:create': ['ADMIN', 'BILLING'],
  'inventory:purchases:update': ['ADMIN', 'BILLING'],
  'inventory:purchases:delete': ['ADMIN', 'BILLING'],

  // ── billing ── read: ADMIN|BILLING|RECEPTION; write: ADMIN|BILLING ───────
  'billing:invoice:list': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:patient:prescriptions': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:ready-queue': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:consultation:load': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:export': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:whatsapp:share': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:invoice:create': ['ADMIN', 'BILLING', 'RECEPTION'],
  'billing:invoice:return': ['ADMIN', 'BILLING'],
  'billing:import': ['ADMIN', 'BILLING'],

  // ── reports ── ADMIN|BILLING ──────────────────────────────────────────────
  'reports:revenue': ['ADMIN', 'BILLING'],
  'reports:patients': ['ADMIN', 'BILLING'],
  'reports:inventory': ['ADMIN', 'BILLING'],
  'reports:doctors': ['ADMIN', 'BILLING'],

  // ── dashboard ── ADMIN only (only ADMIN lands on /dashboard) ─────────────
  'dashboard:stats': ['ADMIN'],
  'dashboard:monthly-revenue': ['ADMIN'],
  'dashboard:today-appointments': ['ADMIN'],
  'dashboard:recent-patients': ['ADMIN'],
  'dashboard:notifications': ['ADMIN'],
  'dashboard:activities': ['ADMIN'],

  // ── settings ── read config: any; user/settings/backup mgmt: ADMIN ───────
  'settings:get-all': 'ANY', // non-sensitive app config (hospital name, currency…)
  'settings:update-multiple': ['ADMIN'],
  'settings:get-users': ['ADMIN'],
  'settings:create-user': ['ADMIN'],
  'settings:delete-user': ['ADMIN'],

  // ── backup ── ADMIN only ──────────────────────────────────────────────────
  'backup:list': ['ADMIN'],
  'backup:create': ['ADMIN'],
  'backup:restore': ['ADMIN'],
  'backup:reschedule': ['ADMIN'],

  // ── LAN host administration ── ADMIN only (manage who may connect) ────────
  'lan:host:enable-pairing': ['ADMIN'],
  'lan:host:disable-pairing': ['ADMIN'],
  'lan:host:devices': ['ADMIN'],
  'lan:host:revoke-device': ['ADMIN'],

  // ── notification ── any authenticated user (per-user notification tray) ───
  'notification:getAll': 'ANY',
  'notification:getUnreadCount': 'ANY',
  'notification:markRead': 'ANY',
  'notification:markUnread': 'ANY',
  'notification:delete': 'ANY',
  'notification:create': 'ANY',
};

/**
 * Handler signature. `session` is the server-resolved session (null only for
 * PUBLIC channels); `token` is the raw transport token (needed by auth:logout).
 * Existing handlers written as `(event, data)` keep working — the extra args
 * are simply ignored. Over LAN there is no real Electron event; a synthetic
 * empty object is passed (verified: no handler reads `event.*`).
 */
export type SecureHandler = (
  event: IpcMainInvokeEvent,
  data: any,
  session: Session | null,
  token: string | null
) => unknown;

/** channel -> handler, so the LAN server can reuse the exact same handlers. */
const channelRegistry = new Map<string, SecureHandler>();

export function getRegisteredHandler(channel: string): SecureHandler | undefined {
  return channelRegistry.get(channel);
}

export function isRegisteredChannel(channel: string): boolean {
  return channelRegistry.has(channel);
}

/**
 * Local-only channels manage/monitor THIS computer (deployment mode, LAN status,
 * pairing) — they must never be forwarded to a Host, even from a CLIENT.
 */
function isLocalOnly(channel: string): boolean {
  return channel.startsWith('deployment:') || channel.startsWith('lan:');
}

export interface DispatchOptions {
  source: RequestSource;
  device?: RequestDevice | null;
  /** Present for local IPC; null for LAN. */
  event?: IpcMainInvokeEvent | null;
}

/**
 * The single authorization + execution path, shared by local IPC and the LAN
 * server. Resolves the session from the token, enforces the per-channel role,
 * establishes the request context (for audit attribution), then runs the
 * handler — normalising any throw into a safe error envelope.
 */
export async function dispatch(
  channel: string,
  data: unknown,
  token: string | null,
  opts: DispatchOptions
): Promise<any> {
  const handler = channelRegistry.get(channel);
  if (!handler) {
    console.warn(`[dispatch] Unknown channel: ${channel}`);
    return { success: false, error: 'You do not have permission to perform this action.' };
  }

  // No handler reads `event.*` (verified), so a synthetic object is safe for LAN.
  const evt = (opts.event ?? ({} as IpcMainInvokeEvent)) as IpcMainInvokeEvent;
  const device = opts.device ?? null;

  try {
    if (PUBLIC_CHANNELS.has(channel)) {
      return await runWithRequestContext({ source: opts.source, session: null, device }, () =>
        Promise.resolve(handler(evt, data, null, token))
      );
    }

    const session = getSession(token);
    if (!session) {
      console.warn(`[authorize] ${channel}: DENIED — no valid session (token ${token ? 'present' : 'MISSING'}).`);
      // `code` is a machine-readable marker the renderer's IPC bridge watches
      // for, so a mid-session expiry bounces the user to the login screen.
      return { success: false, code: 'SESSION_EXPIRED', error: 'Your session has expired. Please sign in again.' };
    }

    const required = CHANNEL_ROLES[channel];
    if (!required) {
      // Fail closed: an unmapped channel is a wiring bug, not a free pass.
      console.warn(`[authorize] Denied unmapped channel: ${channel}`);
      return { success: false, error: 'You do not have permission to perform this action.' };
    }
    if (required !== 'ANY' && !required.includes(session.role)) {
      console.warn(`[authorize] ${channel}: DENIED — role ${session.role} not in [${required.join(',')}].`);
      return { success: false, error: 'You do not have permission to perform this action.' };
    }

    return await runWithRequestContext({ source: opts.source, session, device }, () =>
      Promise.resolve(handler(evt, data, session, token))
    );
  } catch (err) {
    // A handler must never crash the caller's await with a raw throw.
    console.error(`[ipc:${channel}] Unhandled error:`, err);
    return { success: false, error: 'Internal error. Please try again.' };
  }
}

/**
 * Register a channel. Records it for LAN reuse, then wires an `ipcMain.handle`
 * that routes by deployment mode: CLIENT forwards shared channels to the Host;
 * everything else runs locally through `dispatch()`.
 */
export function handle(channel: string, handler: SecureHandler): void {
  channelRegistry.set(channel, handler);
  ipcMain.handle(channel, async (event, data?: unknown, token?: string) => {
    const authToken = typeof token === 'string' ? token : null;
    if (getMode() === 'CLIENT' && !isLocalOnly(channel)) {
      return forwardToHost(channel, data, authToken);
    }
    return dispatch(channel, data, authToken, { source: 'LOCAL', event });
  });
}
