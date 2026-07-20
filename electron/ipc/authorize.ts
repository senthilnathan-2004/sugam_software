import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getSession, type Session, type SessionRole } from '../session.js';

/**
 * Single IPC authorization middleware. EVERY IPC handler in every namespace is
 * registered through `handle()` instead of `ipcMain.handle()` so that, before
 * any handler body runs, we:
 *   1. Require a valid server-side session for all non-public channels
 *      (the token is attached by preload.ts and resolved server-side — the
 *      payload's own `role`/`userId` fields are never trusted).
 *   2. Enforce a per-channel role requirement (CHANNEL_ROLES below).
 *   3. Normalise the response to `{ success, error }` if the handler throws,
 *      so a raw throw can never crash the renderer's `await`.
 *
 * The role map mirrors the existing client-side RBAC (sidebar visibility in
 * src/components/layout/sidebar.tsx + ROLE_PERMISSIONS in
 * src/features/auth/types/auth.types.ts) so no legitimate workflow breaks, with
 * every privileged/destructive channel pinned to ADMIN.
 */

const ALL: SessionRole[] = ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTION'];

/** `'ANY'` = any authenticated user; an array = only those roles. */
type RoleReq = SessionRole[] | 'ANY';

/** Channels that must work WITHOUT a session (the login flow itself). */
const PUBLIC_CHANNELS = new Set<string>(['auth:login', 'auth:verify', 'auth:logout']);

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
  'doctor:consultation:create': ['ADMIN', 'DOCTOR'],
  'doctor:appointment:walk-in': ['ADMIN', 'DOCTOR'],
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
 * are simply ignored.
 */
export type SecureHandler = (
  event: IpcMainInvokeEvent,
  data: any,
  session: Session | null,
  token: string | null
) => unknown;

export function handle(channel: string, handler: SecureHandler): void {
  ipcMain.handle(channel, async (event, data?: unknown, token?: string) => {
    const authToken = typeof token === 'string' ? token : null;
    try {
      if (PUBLIC_CHANNELS.has(channel)) {
        return await handler(event, data, null, authToken);
      }

      const session = getSession(authToken);
      if (!session) {
        console.warn(`[authorize] ${channel}: DENIED — no valid session (token ${authToken ? 'present' : 'MISSING'}).`);
        // `code` is a machine-readable marker the renderer's IPC bridge watches
        // for, so a mid-session expiry bounces the user to the login screen
        // instead of leaving them stuck with repeatedly-failing actions.
        return { success: false, code: 'SESSION_EXPIRED', error: 'Your session has expired. Please sign in again.' };
      }

      const required = CHANNEL_ROLES[channel];
      if (!required) {
        // Fail closed: an unmapped channel is a wiring bug, not a free pass.
        console.warn(`[authorize] Denied unmapped IPC channel: ${channel}`);
        return { success: false, error: 'You do not have permission to perform this action.' };
      }
      if (required !== 'ANY' && !required.includes(session.role)) {
        console.warn(`[authorize] ${channel}: DENIED — role ${session.role} not in [${required.join(',')}].`);
        return { success: false, error: 'You do not have permission to perform this action.' };
      }

      return await handler(event, data, session, authToken);
    } catch (err) {
      // A handler must never crash the renderer's await with a raw throw.
      console.error(`[ipc:${channel}] Unhandled error:`, err);
      return { success: false, error: 'Internal error. Please try again.' };
    }
  });
}
