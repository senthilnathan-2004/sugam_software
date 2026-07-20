import { contextBridge, ipcRenderer } from 'electron';

/**
 * Only IPC channels under these known namespaces may be invoked from the
 * renderer. The previous bridge forwarded ANY channel string, so a script
 * running in the renderer (e.g. via XSS) could reach internal Electron channels
 * or probe for undocumented handlers. Every real handler is namespaced, so a
 * prefix allowlist blocks arbitrary channels without enumerating all ~60.
 */
const ALLOWED_PREFIXES = [
  'auth:',
  'patient:',
  'doctor:',
  'reception:',
  'inventory:',
  'billing:',
  'reports:',
  'dashboard:',
  'settings:',
  'backup:',
  'notification:',
];

/**
 * The renderer persists its auth token via Zustand under this localStorage key
 * (see src/store/auth.store.ts, `name: 'sugam-hms-auth'`). We read it HERE, in
 * preload, and attach it to every invoke as a trailing argument so the main
 * process can authenticate the call. This keeps all renderer call sites
 * unchanged and — crucially — means identity is resolved server-side from the
 * token, never from anything the calling code puts in its own payload.
 */
const AUTH_STORAGE_KEY = 'sugam-hms-auth';

function getAuthToken(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/**
 * When the main process reports the session has expired (sliding idle timeout
 * or the absolute token cap — see electron/session.ts), recover gracefully:
 * clear the persisted auth and send the user to the login screen. Without this,
 * a mid-session expiry left every subsequent action failing silently with no
 * path back. Guarded so concurrent failing calls trigger the bounce only once.
 */
let handlingExpiry = false;
function handleSessionExpired(): void {
  if (handlingExpiry) return;
  handlingExpiry = true;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = new URL('/login', window.location.origin).href;
    }
  } catch {
    /* ignore */
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: async (channel: string, data?: any) => {
    if (typeof channel !== 'string' || !ALLOWED_PREFIXES.some((p) => channel.startsWith(p))) {
      return Promise.reject(new Error(`Blocked IPC channel: ${String(channel)}`));
    }
    const result = await ipcRenderer.invoke(channel, data, getAuthToken());
    if (result && typeof result === 'object' && (result as { code?: string }).code === 'SESSION_EXPIRED') {
      handleSessionExpired();
    }
    return result;
  },
});
