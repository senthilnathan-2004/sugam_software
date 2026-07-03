import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function MetricCard({
  label,
  value,
  subLabel,
  variant = 'primary',
  className,
}: MetricCardProps) {
  const variantStyles = {
    primary: 'border-primary/20 bg-primary/5 text-primary',
    secondary: 'border-secondary/20 bg-secondary/5 text-secondary',
    success: 'border-success/20 bg-success/5 text-success',
    warning: 'border-warning/20 bg-warning/5 text-warning',
    danger: 'border-danger/20 bg-danger/5 text-danger',
  };

  return (
    <div
      className={cn(
        'p-4 rounded-hms border flex flex-col justify-between transition-all duration-hms hover:shadow-md',
        variantStyles[variant],
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
          {label}
        </p>
        <h4 className="text-3xl font-extrabold tracking-tight">{value}</h4>
      </div>
      {subLabel && (
        <span className="text-[11px] opacity-75 mt-2 font-medium truncate">
          {subLabel}
        </span>
      )}
    </div>
  );
}
