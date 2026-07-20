'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, FolderDown, RotateCcw, AlertTriangle, Clock, Save } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

interface BackupLog {
  id: string;
  filePath: string;
  createdAt: string;
  size: number;
  type: string;
  status: string;
}

interface BackupSettingsProps {
  backups: BackupLog[];
  settings: Record<string, string>;
  onCreateBackup: (dir: string) => Promise<boolean>;
  onRestoreBackup: (filePath: string) => Promise<boolean>;
  onSaveConfig: (config: Record<string, string>) => Promise<boolean>;
  isLoading: boolean;
}

export function BackupSettings({ backups, settings, onCreateBackup, onRestoreBackup, onSaveConfig, isLoading }: BackupSettingsProps) {
  // Blank by default: the main process resolves an empty path to a writable
  // per-user location (userData/backups). A hardcoded absolute path here shipped
  // a developer's macOS folder to Windows installs. Leave a placeholder so the
  // cashier can optionally point backups at an external/synced drive.
  const [backupDir, setBackupDir] = useState<string>('');
  const [restorePath, setRestorePath] = useState<string | null>(null);

  // Auto-backup config, seeded from persisted settings. Settings load async, so
  // re-sync when they arrive/change.
  const [autoEnabled, setAutoEnabled] = useState(settings.backup_enabled !== 'false');
  const [frequency, setFrequency] = useState(settings.backup_frequency || 'DAILY');
  const [retention, setRetention] = useState(settings.backup_retention || '10');
  const [autoDir, setAutoDir] = useState(settings.backup_dir || '');

  useEffect(() => {
    setAutoEnabled(settings.backup_enabled !== 'false');
    setFrequency(settings.backup_frequency || 'DAILY');
    setRetention(settings.backup_retention || '10');
    setAutoDir(settings.backup_dir || '');
  }, [settings]);

  const handleBackupNow = async () => {
    await onCreateBackup(backupDir);
  };

  const handleSaveAuto = async () => {
    await onSaveConfig({
      backup_enabled: autoEnabled ? 'true' : 'false',
      backup_frequency: frequency,
      backup_retention: String(Math.max(1, parseInt(retention, 10) || 10)),
      backup_dir: autoDir.trim(),
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Configuration Path */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
        <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">Database Backup & Restores</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3.5">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="backup-dir" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Destination Backup Folder Path</Label>
            <Input
              id="backup-dir"
              value={backupDir}
              onChange={(e) => setBackupDir(e.target.value)}
              placeholder="Default: app data folder — or type a folder path (e.g. D:\\SugamBackups)"
              className="h-11 rounded-xl text-xs font-mono"
            />
          </div>
          <Button
            onClick={handleBackupNow}
            disabled={isLoading}
            className="h-11 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow"
          >
            <FolderDown className="h-4 w-4" /> Trigger Database Backup
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-warning leading-relaxed font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <p>
            Offline database backups are saved locally as `.db` SQLite files. Copy these files to an external disk or cloud sync folder for data safety.
          </p>
        </div>
      </Card>

      {/* Automatic Backup Configuration */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
        <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">Automatic Backups</h3>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Enable Auto-Backup</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Runs on schedule while the app is open, and catches up on launch if a backup was missed.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoEnabled}
            onClick={() => setAutoEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              autoEnabled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                autoEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${autoEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
          {/* Frequency */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency} disabled={!autoEnabled}>
              <SelectTrigger className="h-11 rounded-xl text-xs">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="bg-white border">
                <SelectItem value="DAILY">Daily (midnight)</SelectItem>
                <SelectItem value="WEEKLY">Weekly (Sunday)</SelectItem>
                <SelectItem value="MONTHLY">Monthly (1st)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Retention */}
          <div className="space-y-1.5">
            <Label htmlFor="retention" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Keep Last (backups)</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              disabled={!autoEnabled}
              className="h-11 rounded-xl text-xs font-mono"
            />
          </div>

          {/* Auto backup folder */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="auto-dir" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Auto-Backup Folder Path</Label>
            <Input
              id="auto-dir"
              value={autoDir}
              onChange={(e) => setAutoDir(e.target.value)}
              disabled={!autoEnabled}
              placeholder="Default: app data folder — or type a folder path (e.g. D:\\SugamBackups)"
              className="h-11 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        <Button
          onClick={handleSaveAuto}
          disabled={isLoading}
          className="h-11 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow"
        >
          <Save className="h-4 w-4" /> Save Auto-Backup Settings
        </Button>
      </Card>

      {/* Backups Logs Table */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Database Backup History Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2.5">File Name / Path</th>
                <th className="pb-2.5">Backup Date</th>
                <th className="pb-2.5">Size</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {backups.length > 0 ? (
                backups.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono text-[10px] text-slate-600 truncate max-w-xs">{log.filePath}</td>
                    <td className="py-3">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 font-mono">{formatBytes(log.size)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-success border-emerald-100'
                            : 'bg-rose-50 text-danger border-rose-100'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border bg-slate-50 text-slate-500 border-slate-200">
                          {log.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        onClick={() => setRestorePath(log.filePath)}
                        disabled={isLoading}
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold gap-1 h-8 border-slate-200 hover:bg-rose-50 hover:text-danger hover:border-rose-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No database backups logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={!!restorePath}
        onOpenChange={(open) => !open && setRestorePath(null)}
        title="Restore Database"
        description="This will overwrite the current active database with the selected backup. Unsaved current data will be lost and the app must be restarted. This action cannot be undone."
        confirmText="Restore & Overwrite"
        variant="danger"
        onConfirm={() => {
          const p = restorePath;
          setRestorePath(null);
          if (p) onRestoreBackup(p);
        }}
      />
    </div>
  );
}
