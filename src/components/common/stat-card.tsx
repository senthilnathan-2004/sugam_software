import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'p-6 bg-card rounded-lg shadow-md border border-slate-100 flex items-start justify-between transition-all duration-150 hover:shadow-xl hover:translate-y-[-2px]',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {value}
        </h3>
        {trend && (
          <div className="flex items-center gap-1.5 text-xs mb-1">
            <span
              className={cn(
                'font-bold px-1.5 py-0.5 rounded',
                trend.isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              )}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-slate-400 font-semibold">vs last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-slate-400 truncate">{description}</p>
        )}
      </div>
      <div className="p-3 rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-white">
        <Icon className="h-6 w-6 stroke-[2]" />
      </div>
    </div>
  );
}
