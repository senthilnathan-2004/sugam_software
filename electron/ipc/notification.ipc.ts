import { IpcMainInvokeEvent } from 'electron';
import { handle } from './authorize.js';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import type { Session } from '../session.js';

export function registerNotificationIPC() {
  // ─── RBAC Helper ─────────────────────────────────────────────────────────
  const applyRoleFilter = (whereClause: any, role?: string) => {
    if (!role || role === 'ADMIN') return; // Admin sees all
    
    // Define what each role can see. Keys MUST match the app's actual role set
    // (ADMIN, DOCTOR, BILLING, RECEPTION — see settings.ipc VALID_ROLES and the
    // User.role schema comment); otherwise a valid user falls through to the
    // SYSTEM-only fallback and never sees their own domain's notifications.
    const roleCategories: Record<string, string[]> = {
      DOCTOR: ['PATIENT', 'DOCTOR', 'SYSTEM'],
      BILLING: ['BILLING', 'PATIENT', 'INVENTORY', 'SYSTEM'],
      RECEPTION: ['PATIENT', 'BILLING', 'SYSTEM'],
      // Legacy aliases kept so any older tokens/records still resolve sensibly.
      RECEPTIONIST: ['PATIENT', 'BILLING', 'SYSTEM'],
      PHARMACIST: ['INVENTORY', 'PATIENT', 'SYSTEM'],
      NURSE: ['PATIENT', 'SYSTEM'],
    };
    
    const allowed = roleCategories[role] || ['SYSTEM']; // Fallback sees only SYSTEM
    
    // If a specific category is requested, check if it's allowed
    if (whereClause.category) {
      if (!allowed.includes(whereClause.category)) {
        whereClause.category = 'NONE'; // Will return no results
      }
    } else {
      whereClause.category = { in: allowed };
    }
  };

  // ─── Fetch Notifications ────────────────────────────────────────────────
  handle('notification:getAll', async (_event: IpcMainInvokeEvent, query: any, session: Session | null) => {
    try {
      const take = query?.limit ? Number(query.limit) : 50;
      const skip = query?.offset ? Number(query.offset) : 0;
      
      const where: any = {};
      if (query?.category && query.category !== 'ALL') where.category = query.category;
      if (query?.isRead !== undefined) where.isRead = query.isRead;
      if (query?.search) {
        where.OR = [
          { title: { contains: query.search } },
          { message: { contains: query.search } }
        ];
      }
      
      applyRoleFilter(where, session?.role);

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          take,
          skip,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
      ]);

      return { success: true, data: { notifications, total } };
    } catch (error) {
      console.error('[notification:getAll] Error:', error);
      return { success: false, error: 'Failed to fetch notifications.' };
    }
  });

  // ─── Get Unread Count ──────────────────────────────────────────────────
  handle('notification:getUnreadCount', async (_event: IpcMainInvokeEvent, query: any, session: Session | null) => {
    try {
      const where: any = { isRead: false };
      applyRoleFilter(where, session?.role);
      
      const count = await prisma.notification.count({ where });
      return { success: true, data: count };
    } catch (error) {
      console.error('[notification:getUnreadCount] Error:', error);
      return { success: false, error: 'Failed to fetch unread count.' };
    }
  });

  // ─── Mark Read / Unread ────────────────────────────────────────────────
  handle('notification:markRead', async (_event: IpcMainInvokeEvent, id: string | undefined, session: Session | null) => {
    try {
      if (id) {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      } else {
        // "Mark all read" must not reach across other roles' domains.
        const where: any = { isRead: false };
        applyRoleFilter(where, session?.role);
        await prisma.notification.updateMany({
          where,
          data: { isRead: true },
        });
      }
      return { success: true };
    } catch (error) {
      console.error('[notification:markRead] Error:', error);
      return { success: false, error: 'Failed to mark as read.' };
    }
  });

  handle('notification:markUnread', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      await prisma.notification.update({
        where: { id },
        data: { isRead: false },
      });
      return { success: true };
    } catch (error) {
      console.error('[notification:markUnread] Error:', error);
      return { success: false, error: 'Failed to mark as unread.' };
    }
  });

  // ─── Delete ────────────────────────────────────────────────────────────
  handle('notification:delete', async (_event: IpcMainInvokeEvent, id: string | undefined, session: Session | null) => {
    try {
      if (id) {
        await prisma.notification.delete({ where: { id } });
      } else {
        // "Clear all" must be scoped to what this role can see, so a non-admin
        // cannot wipe every user's notifications (SECURITY/BACKUP included).
        const where: any = {};
        applyRoleFilter(where, session?.role);
        await prisma.notification.deleteMany({ where });
      }
      await writeAudit(session, 'DELETE', 'Notification', id ?? null);
      return { success: true };
    } catch (error) {
      console.error('[notification:delete] Error:', error);
      return { success: false, error: 'Failed to delete notifications.' };
    }
  });

  // ─── Create Notification (Internal utility via IPC for convenience) ────
  handle('notification:create', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      const notif = await prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          priority: data.priority || 'LOW',
          category: data.category || 'SYSTEM',
          userId: data.userId || null,
          relatedEntityId: data.relatedEntityId || null,
          relatedEntityType: data.relatedEntityType || null,
        }
      });
      return { success: true, data: notif };
    } catch (error) {
      console.error('[notification:create] Error:', error);
      return { success: false, error: 'Failed to create notification.' };
    }
  });
}
