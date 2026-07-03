import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'title' | 'circle' | 'rect';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-slate-200 rounded';

  const variantClasses = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded-md',
    circle: 'rounded-full shrink-0',
    rect: 'w-full rounded-lg',
  };

  return <div className={cn(baseClass, variantClasses[variant], className)} />;
}

export function SkeletonLoader({ type = 'card' }: { type?: 'card' | 'table' | 'profile' }) {
  if (type === 'table') {
    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-4">
          <Skeleton variant="rect" className="h-10 w-48" />
          <Skeleton variant="rect" className="h-10 w-24 ml-auto" />
        </div>
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-100">
            <Skeleton variant="text" className="h-5 w-1/3" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center gap-4">
                <Skeleton variant="text" className="h-4 w-1/4" />
                <Skeleton variant="text" className="h-4 w-1/3" />
                <Skeleton variant="text" className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-card rounded-lg shadow-card border border-slate-100">
        <Skeleton variant="circle" className="h-24 w-24" />
        <div className="flex-1 space-y-4">
          <Skeleton variant="title" className="h-6 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton variant="text" className="h-4 w-3/4" />
            <Skeleton variant="text" className="h-4 w-2/3" />
            <Skeleton variant="text" className="h-4 w-1/2" />
            <Skeleton variant="text" className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-card border border-slate-100 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton variant="text" className="h-4 w-1/3" />
        <Skeleton variant="circle" className="h-8 w-8" />
      </div>
      <Skeleton variant="title" className="h-8 w-1/2" />
      <Skeleton variant="text" className="h-3 w-3/4" />
    </div>
  );
}
