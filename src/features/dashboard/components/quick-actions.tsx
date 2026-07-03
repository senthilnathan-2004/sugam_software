'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, Receipt, PlusCircle, BarChart3, Settings, ShieldCheck } from 'lucide-react';

export function QuickActions() {
  const actions = [
    { label: 'Register Patient', href: '/patients/new', icon: UserPlus, color: 'bg-blue-50 text-primary border-blue-100 hover:bg-blue-100/50' },
    { label: 'New Invoice Bill', href: '/billing', icon: Receipt, color: 'bg-emerald-50 text-success border-emerald-100 hover:bg-emerald-100/50' },
    { label: 'Add Medicine', href: '/inventory', icon: PlusCircle, color: 'bg-amber-50 text-warning border-amber-100 hover:bg-amber-100/50' },
    { label: 'View Reports', href: '/reports', icon: BarChart3, color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100/50' },
    { label: 'System Settings', href: '/settings', icon: Settings, color: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/50' },
  ];

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
        <p className="text-xs text-slate-400 font-medium">Commonly accessed workflows & tools</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              href={act.href}
              className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all duration-150 ${act.color} text-center hover:scale-[1.02]`}
            >
              <Icon className="h-5 w-5 mb-2 stroke-[1.75]" />
              <span className="text-xs font-bold leading-tight">{act.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
