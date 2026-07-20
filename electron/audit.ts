import { prisma } from './db.js';
import type { Session } from './session.js';

/**
 * Records an audit-trail entry attributed to the REAL authenticated user.
 *
 * Before this, only `billing:invoice:create` wrote to AuditLog, and it
 * attributed every action to `findFirst({ role: 'ADMIN' })` — i.e. a random
 * admin — which is worse than useless for compliance. Every mutating IPC
 * handler now calls this with its own `session` so `AuditLog.userId` reflects
 * who actually performed the action.
 *
 * Deliberately non-throwing: a failure to write the audit row must never fail
 * (or roll back) the underlying operation. It logs and moves on.
 *
 * `action` should be one of CREATE / UPDATE / DELETE / RESTORE (the renderer
 * activity feed colour-codes these); `entity` is the Prisma model name.
 */
export async function writeAudit(
  session: Session | null,
  action: string,
  entity: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!session) {
    console.warn(`[audit] Skipped ${action} ${entity}: no authenticated session`);
    return;
  }
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error(`[audit] Failed to record ${action} ${entity}:`, err);
  }
}
