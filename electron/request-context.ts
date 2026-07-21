import { AsyncLocalStorage } from 'node:async_hooks';
import type { Session } from './session.js';

/**
 * Per-request ambient context, carried through the async call chain via
 * AsyncLocalStorage so cross-cutting code (notably audit logging) can attribute
 * a mutation to WHERE it came from — a local IPC call or a LAN client, and which
 * paired device — WITHOUT threading an extra parameter through every one of the
 * ~66 handler signatures.
 *
 * `dispatch()` (electron/ipc/authorize.ts) establishes this context around each
 * handler invocation; `writeAudit()` (electron/audit.ts) reads it.
 */

export type RequestSource = 'LOCAL' | 'LAN';

export interface RequestDevice {
  id: string;
  name: string;
}

export interface RequestContext {
  source: RequestSource;
  session: Session | null;
  device: RequestDevice | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
