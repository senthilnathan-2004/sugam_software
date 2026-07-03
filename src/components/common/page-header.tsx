import React from 'react';
import { Breadcrumb } from '../layout/breadcrumb';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100 mb-8',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <Breadcrumb />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 font-medium">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
