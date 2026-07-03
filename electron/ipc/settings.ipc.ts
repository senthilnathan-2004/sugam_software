import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export function registerSettingsIpc() {
  // ─── Get System Settings ──────────────────────────────────────────────────
  ipcMain.handle('settings:get-all', async () => {
    try {
      const settings = await prisma.appSetting.findMany();
      const config: Record<string, string> = {};
      settings.forEach((s: any) => {
        config[s.key] = s.value;
      });
      return { success: true, data: config };
    } catch {
      return { success: false, error: 'Failed to retrieve system settings.' };
    }
  });

  // ─── Update System Settings ────────────────────────────────────────────────
  ipcMain.handle('settings:update-multiple', async (_event: IpcMainInvokeEvent, settings: Record<string, string>) => {
    try {
      await prisma.$transaction(
        Object.entries(settings).map(([key, value]) =>
          prisma.appSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value, type: 'STRING' },
          })
        )
      );
      return { success: true };
    } catch (error) {
      console.error('[settings:update-multiple] Error:', error);
      return { success: false, error: 'Failed to update system settings.' };
    }
  });

  // ─── Get Users List ───────────────────────────────────────────────────────
  ipcMain.handle('settings:get-users', async () => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      return users;
    } catch {
      return [];
    }
  });

  // ─── Register User Account ────────────────────────────────────────────────
  ipcMain.handle('settings:create-user', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      const { name, email, password, role } = data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { success: false, error: 'Email address already registered.' };
      }

      const hash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hash,
          role,
          isActive: true,
        },
      });

      // If doctor role, create associated doctor record automatically
      if (role === 'DOCTOR') {
        const docCount = await prisma.doctor.count();
        await prisma.doctor.create({
          data: {
            userId: user.id,
            specialization: 'General Physician',
            license: `REG-${String(docCount + 1000).padStart(4, '0')}`,
            qualification: 'MBBS',
            schedule: '{}',
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[settings:create-user] Error:', error);
      return { success: false, error: 'Failed to create user account.' };
    }
  });

  // ─── Delete User Account ──────────────────────────────────────────────────
  ipcMain.handle('settings:delete-user', async (_event: IpcMainInvokeEvent, userId: string) => {
    try {
      await prisma.user.delete({ where: { id: userId } });
      return { success: true };
    } catch (error) {
      console.error('[settings:delete-user] Error:', error);
      return { success: false, error: 'Failed to delete user account.' };
    }
  });
}
