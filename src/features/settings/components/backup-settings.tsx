'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, FolderDown, RotateCcw, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
  onCreateBackup: (dir: string) => Promise<boolean>;
  onRestoreBackup: (filePath: string) => Promise<boolean>;
  isLoading: boolean;
}

export function BackupSettings({ backups, onCreateBackup, onRestoreBackup, isLoading }: BackupSettingsProps) {
  const [backupDir, setBackupDir] = useState<string>('/Users/senthilnathanr/Desktop/untitled folder 6/backups');

  const handleBackupNow = async () => {
    await onCreateBackup(backupDir);
  };

  const handleRestoreNow = async (filePath: string) => {
    if (confirm('Are you sure you want to restore this backup? This will overwrite the current active database!')) {
      await onRestoreBackup(filePath);
    }
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
                      <span className="text-[9px] bg-emerald-50 text-success border border-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        onClick={() => handleRestoreNow(log.filePath)}
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
    </div>
  );
}
