import { IpcMainInvokeEvent } from 'electron';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { getJwtSecret } from '../auth-secret.js';
import { handle } from './authorize.js';
import { createSession, restoreSession, destroySession, type Session } from '../session.js';

interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function registerAuthIpc() {
  // ─── Login Handler ────────────────────────────────────────────────────────
  handle('auth:login', async (_event: IpcMainInvokeEvent, payload: LoginPayload) => {
    try {
      const email = String(payload?.email ?? '').trim();
      const password = String(payload?.password ?? '');

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid credentials or account is disabled.' };
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        return { success: false, error: 'Invalid credentials.' };
      }

      // Issues a signed token AND registers a server-side session for it.
      const token = createSession(user);

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
  // Called at app boot with the persisted token. If it is still valid and the
  // user is active, we re-establish the in-memory session (which the app
  // restart cleared) so subsequent IPC calls authenticate.
  handle('auth:verify', async (_event: IpcMainInvokeEvent, token: string) => {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
        userId: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user || !user.isActive) {
        return { valid: false };
      }

      restoreSession(user, token);

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

  // ─── Logout Handler ────────────────────────────────────────────────────────
  // Revokes the session server-side so the token can no longer be used, even
  // before it would expire.
  handle('auth:logout', async (_event, _data, _session, token) => {
    destroySession(token);
    return { success: true };
  });

  // ─── Change Password Handler ───────────────────────────────────────────────
  // The target user is ALWAYS the authenticated session user — never a userId
  // taken from the payload (which the renderer could set to someone else's id).
  handle(
    'auth:change-password',
    async (
      _event: IpcMainInvokeEvent,
      payload: { currentPassword: string; newPassword: string },
      session: Session | null
    ) => {
      try {
        if (!session) return { success: false, error: 'UNAUTHORIZED' };

        if (!payload?.newPassword || payload.newPassword.length < 8) {
          return { success: false, error: 'New password must be at least 8 characters.' };
        }

        const user = await prisma.user.findUnique({ where: { id: session.userId } });

        if (!user) return { success: false, error: 'User not found.' };

        const valid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
        if (!valid) return { success: false, error: 'Current password is incorrect.' };

        const newHash = await bcrypt.hash(payload.newPassword, 12);
        await prisma.user.update({
          where: { id: user.id },
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
