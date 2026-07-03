'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function ProfileDropdown() {
  const router = useRouter();
  const { user, handleLogout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-2 py-1 pr-2 hover:bg-hover rounded-xl transition-colors duration-150">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-bold text-slate-800 leading-tight">{user.name}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2 shadow-card border border-slate-100 rounded-lg bg-card">
        <DropdownMenuLabel className="px-3 py-1.5 flex flex-col">
          <span className="font-bold text-sm text-slate-800">{user.name}</span>
          <span className="text-xs text-slate-500 font-semibold">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem 
          onClick={() => router.push('/settings')}
          className="p-2.5 text-sm font-semibold text-slate-600 rounded-lg hover:bg-hover cursor-pointer focus:bg-hover gap-2 transition-colors duration-150"
        >
          <UserIcon className="h-4 w-4" /> My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="p-2.5 text-sm font-bold text-danger rounded-lg hover:bg-danger/10 cursor-pointer focus:bg-danger/10 gap-2 transition-colors duration-150"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
