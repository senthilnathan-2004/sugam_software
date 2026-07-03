'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePatients } from '@/features/patients/hooks/use-patients';

interface PatientSearchWalkinProps {
  onSelect: (patientId: string) => void;
}

export function PatientSearchWalkin({ onSelect }: PatientSearchWalkinProps) {
  const { patients, fetchPatients } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search patient for walk-in..."
          className="pl-9 bg-white"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>

      {isOpen && searchTerm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <div
                key={p.id}
                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex items-center justify-between"
                onClick={() => {
                  onSelect(p.id);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.patientId} · {p.phone}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-primary shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-slate-400">
              No patients found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
