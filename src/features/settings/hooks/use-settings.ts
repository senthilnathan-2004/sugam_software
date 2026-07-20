'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface BackupLog {
  id: string;
  filePath: string;
  createdAt: string;
  size: number;
  type: string;
  status: string;
}

const DEMO_SETTINGS = {
  hospital_name: 'Sugam General Hospital',
  hospital_phone: '+91 98765 43210',
  hospital_address: '123, Healthcare Avenue, Chennai, TN 600001',
  gst_number: '33AABCU9603R1ZM',
  currency: 'INR',
};

const DEMO_BACKUPS: BackupLog[] = [
  { id: '1', filePath: '/backups/sugam_hms_backup_demo.db', createdAt: new Date().toISOString(), size: 204800, type: 'MANUAL', status: 'SUCCESS' },
];

async function safeInvoke<T>(channel: string, fallback: T, payload?: any): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const res = await window.electronAPI.invoke(channel, payload);
      if (res?.success) return res.data as T;
    } catch {}
  }
  return fallback;
}

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(DEMO_SETTINGS);
  const [backups, setBackups] = useState<BackupLog[]>(DEMO_BACKUPS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke('settings:get-all', DEMO_SETTINGS);
    setSettings(data);
    setIsLoading(false);
  }, []);

  const fetchBackups = useCallback(async () => {
    const data = await safeInvoke<BackupLog[]>('backup:list', DEMO_BACKUPS);
    setBackups(data);
  }, []);

  // In the packaged app window.electronAPI always exists and IPC handlers return
  // {success,error} envelopes (never throw). A failed mutation MUST surface the
  // real error and return false — never a fake "Demo Mode" success that shows
  // the user new values which were never persisted. The demo-mode branch fires
  // ONLY in a browser dev context where there is no electronAPI. Every function
  // uses try/finally so isLoading is always cleared (otherwise the shared flag
  // sticks true and disables every settings button until the page remounts).
  const updateSettings = async (newSettings: Record<string, string>) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('settings:update-multiple', newSettings);
        if (res?.success) {
          toast.success('Hospital settings updated successfully!');
          fetchSettings();
          return true;
        }
        toast.error(res?.error ?? 'Failed to update settings.');
        return false;
      } catch {
        toast.error('Failed to update settings.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Settings updated (Demo Mode)');
    setSettings((prev) => ({ ...prev, ...newSettings }));
    setIsLoading(false);
    return true;
  };

  // Persist auto-backup config, then tell the main process to rebuild the cron
  // schedule so a changed frequency / toggle / retention applies immediately.
  const saveBackupSettings = async (config: Record<string, string>) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('settings:update-multiple', config);
        if (res?.success) {
          await window.electronAPI.invoke('backup:reschedule');
          toast.success('Auto-backup settings saved.');
          fetchSettings();
          fetchBackups();
          return true;
        }
        toast.error(res?.error ?? 'Failed to save auto-backup settings.');
        return false;
      } catch {
        toast.error('Failed to save auto-backup settings.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Auto-backup settings saved (Demo Mode)');
    setSettings((prev) => ({ ...prev, ...config }));
    setIsLoading(false);
    return true;
  };

  const changePassword = async (userId: string, payload: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('auth:change-password', {
          userId,
          currentPassword: payload.currentPassword,
          newPassword: payload.newPassword,
        });
        if (res?.success) {
          toast.success('Password changed successfully!');
          return true;
        }
        toast.error(res?.error ?? 'Failed to change password.');
        return false;
      } catch {
        toast.error('Failed to change password.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Password changed successfully (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const createBackup = async (backupDir: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('backup:create', backupDir);
        if (res?.success) {
          toast.success('Database backup created successfully!');
          fetchBackups();
          return true;
        }
        toast.error(res?.error ?? 'Backup process failed.');
        return false;
      } catch {
        toast.error('Backup process failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Database backup logged (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const restoreBackup = async (backupFilePath: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('backup:restore', backupFilePath);
        if (res?.success) {
          toast.success('Database restored successfully! Please restart the application.');
          return true;
        }
        toast.error(res?.error ?? 'Restore process failed.');
        return false;
      } catch {
        toast.error('Restore process failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Database restored (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  return {
    settings,
    backups,
    isLoading,
    fetchSettings,
    fetchBackups,
    updateSettings,
    saveBackupSettings,
    changePassword,
    createBackup,
    restoreBackup,
  };
}
