import { IpcMainInvokeEvent } from 'electron';
import { handle } from './authorize.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import type { Session } from '../session.js';
import { destroySessionsForUser } from '../session.js';

export function registerSettingsIpc() {
  // ─── Get System Settings ──────────────────────────────────────────────────
  handle('settings:get-all', async () => {
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
  handle('settings:update-multiple', async (_event: IpcMainInvokeEvent, settings: Record<string, string>, session: Session | null) => {
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
      await writeAudit(session, 'UPDATE', 'AppSetting', null, { keys: Object.keys(settings) });
      return { success: true };
    } catch (error) {
      console.error('[settings:update-multiple] Error:', error);
      return { success: false, error: 'Failed to update system settings.' };
    }
  });

  // ─── Get Users List ───────────────────────────────────────────────────────
  handle('settings:get-users', async () => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      return { success: true, data: users };
    } catch {
      // Uniform shape; empty list preserves the old no-crash behaviour.
      return { success: true, data: [] };
    }
  });

  // ─── Register User Account ────────────────────────────────────────────────
  handle('settings:create-user', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    try {
      const { name, email, password, role } = data;

      const VALID_ROLES = ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTION'];
      if (!name?.trim() || !email?.trim() || !password) {
        return { success: false, error: 'Name, email, and password are required.' };
      }
      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters.' };
      }
      if (!VALID_ROLES.includes(role)) {
        return { success: false, error: 'Invalid user role.' };
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { success: false, error: 'Email address already registered.' };
      }

      const hash = await bcrypt.hash(password, 12);

      // User + (optional) Doctor must be atomic: if the Doctor insert fails the
      // User insert has to roll back, otherwise a failed doctor-create leaves an
      // orphaned login with no clinical profile.
      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name,
            email,
            passwordHash: hash,
            role,
            isActive: true,
          },
        });

        // If doctor role, create the associated doctor record automatically.
        if (role === 'DOCTOR') {
          await tx.doctor.create({
            data: {
              userId: u.id,
              specialization: 'General Physician',
              // Doctor.license is @unique. The old `REG-${count+1000}` scheme
              // collided with the seeded doctor (REG-1001) as soon as one doctor
              // existed. Derive a guaranteed-unique placeholder from the user id
              // (editable later once a doctor-profile screen exists).
              license: `REG-${u.id.slice(0, 8).toUpperCase()}`,
              qualification: 'MBBS',
              schedule: '{}',
            },
          });
        }
        return u;
      });

      await writeAudit(session, 'CREATE', 'User', user.id);
      return { success: true };
    } catch (error) {
      console.error('[settings:create-user] Error:', error);
      return { success: false, error: 'Failed to create user account.' };
    }
  });

  // ─── Delete User Account ──────────────────────────────────────────────────
  handle('settings:delete-user', async (_event: IpcMainInvokeEvent, userId: string, session: Session | null) => {
    try {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return { success: false, error: 'User not found.' };

      // Prevent locking everyone out by removing the last remaining admin.
      if (target.role === 'ADMIN') {
        const activeAdmins = await prisma.user.count({
          where: { role: 'ADMIN', isActive: true },
        });
        if (activeAdmins <= 1) {
          return { success: false, error: 'Cannot delete the last active administrator.' };
        }
      }

      // Soft-delete: deactivate instead of hard-deleting. A hard delete would
      // cascade-remove this user's AuditLog rows (AuditLog.userId onDelete:
      // Cascade), destroying the compliance trail of everything they ever did.
      // Deactivating keeps the row (and its logs) while blocking login
      // (auth:login rejects !isActive) and hiding them from the user list.
      await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
      // Revoke any live session so a just-disabled account can't keep acting.
      destroySessionsForUser(userId);
      await writeAudit(session, 'DELETE', 'User', userId);
      return { success: true };
    } catch (error) {
      console.error('[settings:delete-user] Error:', error);
      return { success: false, error: 'Failed to delete user account.' };
    }
  });
}
