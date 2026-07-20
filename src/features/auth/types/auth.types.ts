export type UserRole = 'ADMIN' | 'DOCTOR' | 'BILLING' | 'RECEPTION';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  lastActivity: number;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export type Permission =
  | 'patients:read'
  | 'patients:write'
  | 'patients:delete'
  | 'doctors:read'
  | 'doctors:write'
  | 'billing:read'
  | 'billing:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'reports:read'
  | 'settings:write'
  | 'users:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'patients:read', 'patients:write', 'patients:delete',
    'doctors:read', 'doctors:write',
    'billing:read', 'billing:write',
    'inventory:read', 'inventory:write',
    'reports:read', 'settings:write', 'users:manage',
  ],
  DOCTOR: [
    'patients:read', 'patients:write',
    'doctors:read',
    'inventory:read',
  ],
  BILLING: [
    'patients:read',
    'billing:read', 'billing:write',
    'inventory:read', 'inventory:write',
    'reports:read',
  ],
  RECEPTION: [
    'patients:read', 'patients:write',
    'doctors:read',
    'billing:read', 'billing:write',
  ],
};
