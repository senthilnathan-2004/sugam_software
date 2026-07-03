'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Receipt,
  ShoppingCart,
  Package,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app.store';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user, handleLogout } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
    { name: 'Reception Desk', href: '/reception', icon: Users, roles: ['ADMIN', 'RECEPTION', 'DOCTOR'] },
    { name: 'Doctor Panel', href: '/doctor', icon: Stethoscope, roles: ['ADMIN', 'DOCTOR'] },
    { name: 'Patients', href: '/patients', icon: UserSquare2, roles: ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTION'] },
    { name: 'Doctors', href: '/doctors', icon: Stethoscope, roles: ['ADMIN', 'DOCTOR', 'RECEPTION'] },
    { name: 'Hospital Billing', href: '/billing', icon: Receipt, roles: ['ADMIN', 'BILLING', 'RECEPTION'] },
    { name: 'Direct Billing', href: '/direct-billing', icon: ShoppingCart, roles: ['ADMIN', 'BILLING'] },
    { name: 'Medicine Stock', href: '/inventory', icon: Package, roles: ['ADMIN', 'DOCTOR', 'BILLING'] },
    { name: 'Reports', href: '/reports', icon: FileBarChart2, roles: ['ADMIN', 'BILLING'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  // Filter routes by current user's role
  const userRole = user?.role || 'ADMIN';
  const visibleItems = navigationItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        'bg-sidebar text-slate-300 h-screen sticky top-0 flex flex-col justify-between transition-all duration-150 z-30 shrink-0 border-r border-sidebar-hover',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div>
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-hover">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white shrink-0">
              S
            </div>
            {sidebarOpen && (
              <span className="font-extrabold tracking-tight text-white text-base truncate">
                Sugam HMS
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded hover:bg-sidebar-hover text-slate-400 hover:text-white transition-colors duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-4 space-y-1.5 flex-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-white font-bold shadow-md'
                    : 'text-slate-400 hover:bg-sidebar-hover hover:text-white'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-sidebar-hover space-y-4">
        {/* Toggle button when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded hover:bg-sidebar-hover text-slate-400 hover:text-white transition-colors duration-150"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* User profile card */}
        {sidebarOpen && user && (
          <div className="bg-sidebar-hover/40 p-3 rounded-xl border border-sidebar-hover flex items-center gap-3 transition-colors duration-150">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-white uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{user.role}</p>
            </div>
          </div>
        )}

        {/* Logout Action */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-danger/10 hover:text-danger font-semibold transition-colors duration-150',
            !sidebarOpen && 'justify-center'
          )}
          title="Sign Out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
