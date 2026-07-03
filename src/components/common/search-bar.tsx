'use client';

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search records...',
  onSearch,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, 300);

    return () => clearTimeout(handler);
  }, [value, onSearch]);

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[1.75]" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 py-2 h-10 bg-white border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus-visible:ring-primary focus-visible:border-primary w-full"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
