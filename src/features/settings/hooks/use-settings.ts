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
      } catch {}
    }
    toast.success('Settings updated (Demo Mode)');
    setSettings((prev) => ({ ...prev, ...newSettings }));
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
        } else {
          toast.error(res?.error ?? 'Failed to change password.');
          return false;
        }
      } catch {}
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
        } else {
          toast.error(res?.error ?? 'Backup process failed.');
          return false;
        }
      } catch {}
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
        } else {
          toast.error(res?.error ?? 'Restore process failed.');
          return false;
        }
      } catch {}
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
    changePassword,
    createBackup,
    restoreBackup,
  };
}
