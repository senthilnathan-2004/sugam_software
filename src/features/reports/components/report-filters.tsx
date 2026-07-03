'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Filter, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  isLoading: boolean;
}

export function ReportFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  isLoading,
}: ReportFiltersProps) {
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onEndDateChange(end.toISOString().split('T')[0]);
    onStartDateChange(start.toISOString().split('T')[0]);
    setTimeout(onApply, 100);
  };

  return (
    <div className="flex flex-col sm:flex-row items-end gap-4 w-full">
      {/* Quick Presets */}
      <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
        <Button variant="outline" size="sm" onClick={() => setPreset(0)} className="text-[10px] font-bold h-10 bg-slate-50 hover:bg-slate-100 text-slate-600">Daily</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(7)} className="text-[10px] font-bold h-10 bg-slate-50 hover:bg-slate-100 text-slate-600">Weekly</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(30)} className="text-[10px] font-bold h-10 bg-slate-50 hover:bg-slate-100 text-slate-600">Monthly</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(365)} className="text-[10px] font-bold h-10 bg-slate-50 hover:bg-slate-100 text-slate-600">Yearly</Button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5 col-span-1">
          <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Start Date
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-10 rounded-lg text-xs"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5 col-span-1">
          <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> End Date
          </Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10 rounded-lg text-xs"
          />
        </div>
      </div>

      <Button
        onClick={onApply}
        disabled={isLoading}
        className="h-10 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
      >
        <Filter className="h-3.5 w-3.5" /> Apply Filters
      </Button>
    </div>
  );
}
