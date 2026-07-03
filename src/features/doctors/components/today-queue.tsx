'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QueueItem } from '../types/doctor.types';

interface TodayQueueProps {
  queue: QueueItem[];
  selectedItem: QueueItem | null;
  onSelect: (item: QueueItem) => void;
  isLoading: boolean;
}

export function TodayQueue({ queue, selectedItem, onSelect, isLoading }: TodayQueueProps) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: 'bg-emerald-50 text-success border-emerald-200',
      PENDING: 'bg-amber-50 text-warning border-amber-200',
      COMPLETED: 'bg-blue-50 text-primary border-blue-200',
    };
    return (
      <Badge className={cn('text-[9px] font-bold px-1.5 py-0 rounded border uppercase', styles[status] || 'bg-slate-50 text-slate-500')}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full flex flex-col justify-between">
      <div>
        <div className="mb-5 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Today&apos;s Consultation Queue</h3>
          <span className="inline-block text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md">
            {queue.length} Remaining
          </span>
        </div>

        <div className="space-y-2.5">
          {isLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading queue...</p>
          ) : queue.length > 0 ? (
            queue.map((item) => {
              const isSelected = selectedItem?.appointmentId === item.appointmentId;
              return (
                <div
                  key={item.appointmentId}
                  onClick={() => onSelect(item)}
                  className={cn(
                    'p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all duration-150',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-bold truncate leading-tight', isSelected ? 'text-primary' : 'text-slate-900')}>
                        {item.name}
                      </p>
                      <span className="text-[10px] font-bold shrink-0 font-mono">{item.time}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>
                        {item.age} Yrs · {item.gender.toLowerCase()}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No patients in queue.</p>
          )}
        </div>
      </div>
    </div>
  );
}
