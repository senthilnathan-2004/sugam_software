import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function registerNotificationIPC() {
  // ─── RBAC Helper ─────────────────────────────────────────────────────────
  const applyRoleFilter = (whereClause: any, role?: string) => {
    if (!role || role === 'ADMIN') return; // Admin sees all
    
    // Define what each role can see
    const roleCategories: Record<string, string[]> = {
      DOCTOR: ['PATIENT', 'DOCTOR', 'SYSTEM'],
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
  ipcMain.handle('notification:getAll', async (_event: IpcMainInvokeEvent, query?: any) => {
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
      
      applyRoleFilter(where, query?.role);

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
  ipcMain.handle('notification:getUnreadCount', async (_event: IpcMainInvokeEvent, query?: any) => {
    try {
      const where: any = { isRead: false };
      applyRoleFilter(where, query?.role);
      
      const count = await prisma.notification.count({ where });
      return { success: true, data: count };
    } catch (error) {
      console.error('[notification:getUnreadCount] Error:', error);
      return { success: false, error: 'Failed to fetch unread count.' };
    }
  });

  // ─── Mark Read / Unread ────────────────────────────────────────────────
  ipcMain.handle('notification:markRead', async (_event: IpcMainInvokeEvent, id?: string) => {
    try {
      if (id) {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      } else {
        await prisma.notification.updateMany({
          where: { isRead: false },
          data: { isRead: true },
        });
      }
      return { success: true };
    } catch (error) {
      console.error('[notification:markRead] Error:', error);
      return { success: false, error: 'Failed to mark as read.' };
    }
  });

  ipcMain.handle('notification:markUnread', async (_event: IpcMainInvokeEvent, id: string) => {
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
  ipcMain.handle('notification:delete', async (_event: IpcMainInvokeEvent, id?: string) => {
    try {
      if (id) {
        await prisma.notification.delete({ where: { id } });
      } else {
        await prisma.notification.deleteMany({});
      }
      return { success: true };
    } catch (error) {
      console.error('[notification:delete] Error:', error);
      return { success: false, error: 'Failed to delete notifications.' };
    }
  });

  // ─── Create Notification (Internal utility via IPC for convenience) ────
  ipcMain.handle('notification:create', async (_event: IpcMainInvokeEvent, data: any) => {
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
