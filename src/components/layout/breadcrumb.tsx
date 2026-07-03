'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export function Breadcrumb() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const paths = pathname.split('/').filter((p) => p);

  if (paths.length === 0) return null;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-500 mb-6">
      {isAdmin ? (
        <Link
          href="/dashboard"
          className="flex items-center hover:text-primary transition-colors duration-150 font-medium"
        >
          Home
        </Link>
      ) : (
        <span className="flex items-center text-slate-400 font-medium cursor-not-allowed">
          Home
        </span>
      )}
      
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const formattedPath = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={path}>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-800" aria-current="page">
                {formattedPath}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-primary transition-colors duration-150"
              >
                {formattedPath}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
