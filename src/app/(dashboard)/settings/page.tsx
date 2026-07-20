'use client';

import React, { useEffect, useState } from 'react';
import { ProfileSettings } from '@/features/settings/components/profile-settings';
import { PasswordChange } from '@/features/settings/components/password-change';
import { SystemSettings } from '@/features/settings/components/system-settings';
import { UserManagement } from '@/features/settings/components/user-management';
import { BackupSettings } from '@/features/settings/components/backup-settings';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  Settings2,
  UserCircle,
  Building2,
  Users,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';

type TabId = 'profile' | 'system' | 'users' | 'backup';

interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: React.ElementType;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'My Account',       description: 'Profile & password',     icon: UserCircle,  adminOnly: false },
  { id: 'system',  label: 'Hospital Profile', description: 'Name, address & GST',    icon: Building2,   adminOnly: true  },
  { id: 'users',   label: 'System Users',     description: 'Manage staff accounts',  icon: Users,       adminOnly: true  },
  { id: 'backup',  label: 'Backup & Restore', description: 'Database snapshots',     icon: HardDrive,   adminOnly: true  },
];
export default function SettingsPage() {
  const { user } = useAuthStore();
  const {
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
  } = useSettings();

  const [activeTab, setActiveTab] = useState<TabId>('profile');

  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, [fetchSettings, fetchBackups]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-100" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-400">Loading session…</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';
  const visibleNav = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin);
  const activeMeta = visibleNav.find((n) => n.id === activeTab) ?? visibleNav[0];
  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <PageHeader
        title="Settings"
        description="Manage your account, hospital configuration, users, and backups."
      />

      {/* ── Settings Layout ───────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Sidebar nav ── */}
        <nav
          aria-label="Settings sections"
          className="w-full lg:w-60 xl:w-64 shrink-0 lg:sticky lg:top-6"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Navigation
              </p>
            </div>
            <ul role="list" className="pb-2">
              {visibleNav.map(({ id, label, description, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${id}`}
                      id={`tab-${id}`}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                        isActive
                          ? 'bg-primary/5 border-r-2 border-primary'
                          : 'hover:bg-slate-50 border-r-2 border-transparent'
                      )}
                    >
                      <div className={cn(
                        'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        isActive
                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                          : 'bg-slate-100 text-slate-500'
                      )}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-bold truncate leading-tight',
                          isActive ? 'text-primary' : 'text-slate-700'
                        )}>
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {description}
                        </p>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Role badge */}
          <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Logged in as
            </p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm uppercase shadow-sm shadow-primary/25 shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Panel content ── */}
        <div className="flex-1 min-w-0 w-full">

          {/* Panel header strip */}
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-4 shadow-sm flex items-center gap-3">
            <div className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
              'bg-primary text-white shadow-sm shadow-primary/25'
            )}>
              <activeMeta.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{activeMeta.label}</h2>
              <p className="text-[11px] text-slate-500 font-medium">{activeMeta.description}</p>
            </div>
          </div>

          {/* Profile tab */}
          <div
            role="tabpanel"
            id="panel-profile"
            aria-labelledby="tab-profile"
            hidden={activeTab !== 'profile'}
            className="space-y-4 focus-visible:outline-none"
          >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <ProfileSettings
                user={user}
                onSubmit={async () => true}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <PasswordChange
                userId={user.id}
                onPasswordChange={changePassword}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Hospital Profile tab */}
          {isAdmin && (
            <div
              role="tabpanel"
              id="panel-system"
              aria-labelledby="tab-system"
              hidden={activeTab !== 'system'}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 focus-visible:outline-none"
            >
              <SystemSettings
                initialValues={settings}
                onSubmit={updateSettings}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Users tab */}
          {isAdmin && (
            <div
              role="tabpanel"
              id="panel-users"
              aria-labelledby="tab-users"
              hidden={activeTab !== 'users'}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 focus-visible:outline-none"
            >
              <UserManagement />
            </div>
          )}

          {/* Backup tab */}
          {isAdmin && (
            <div
              role="tabpanel"
              id="panel-backup"
              aria-labelledby="tab-backup"
              hidden={activeTab !== 'backup'}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 focus-visible:outline-none"
            >
              <BackupSettings
                backups={backups}
                settings={settings}
                onCreateBackup={createBackup}
                onRestoreBackup={restoreBackup}
                onSaveConfig={saveBackupSettings}
                isLoading={isLoading}
              />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}