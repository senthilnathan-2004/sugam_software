import React from 'react';
import { ShieldAlert, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no active records matching your request at this time.',
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-dashed border-slate-200 min-h-[300px]',
        className
      )}
    >
      <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
        <Icon className="h-10 w-10 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-sm font-medium mb-5">
        {description}
      </p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
