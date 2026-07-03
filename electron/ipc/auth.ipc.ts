import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = 'sugam-hms-secret-dev-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function registerAuthIpc() {
  // ─── Login Handler ────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_event: IpcMainInvokeEvent, payload: LoginPayload) => {
    try {
      const email = payload.email.trim();
      const password = payload.password;

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid credentials or account is disabled.' };
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        return { success: false, error: 'Invalid credentials.' };
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar ?? undefined,
        },
      };
    } catch (error) {
      console.error('[auth:login] Error:', error);
      return { success: false, error: 'Internal server error. Please try again.' };
    }
  });

  // ─── Token Verify Handler ─────────────────────────────────────────────────
  ipcMain.handle('auth:verify', async (_event: IpcMainInvokeEvent, token: string) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
        userId: string;
        email: string;
        role: string;
        name: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user || !user.isActive) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar ?? undefined,
        },
      };
    } catch {
      return { valid: false };
    }
  });

  // ─── Change Password Handler ───────────────────────────────────────────────
  ipcMain.handle(
    'auth:change-password',
    async (
      _event: IpcMainInvokeEvent,
      payload: { userId: string; currentPassword: string; newPassword: string }
    ) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });

        if (!user) return { success: false, error: 'User not found.' };

        const valid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
        if (!valid) return { success: false, error: 'Current password is incorrect.' };

        const newHash = await bcrypt.hash(payload.newPassword, 12);
        await prisma.user.update({
          where: { id: payload.userId },
          data: { passwordHash: newHash },
        });

        return { success: true };
      } catch (error) {
        console.error('[auth:change-password] Error:', error);
        return { success: false, error: 'Failed to change password.' };
      }
    }
  );
}
