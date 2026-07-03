'use client';

import React from 'react';
import { User, Phone } from 'lucide-react';

interface RecentPatient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  createdAt: string;
}

interface RecentPatientsProps {
  patients: RecentPatient[];
  isLoading: boolean;
}

export function RecentPatients({ patients, isLoading }: RecentPatientsProps) {
  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Recent Admissions</h3>
        <p className="text-xs text-slate-400 font-medium">Newly registered hospital patients</p>
      </div>

      <div className="space-y-3.5">
        {isLoading ? (
          <p className="text-xs text-slate-400 py-4 text-center">Loading patients...</p>
        ) : patients.length > 0 ? (
          patients.map((patient) => (
            <div
              key={patient.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{patient.name}</p>
                  <span className="text-[9px] bg-slate-200/60 px-1 rounded text-slate-500 font-bold">
                    {patient.bloodGroup}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>
                    {patient.age} Yrs · {patient.gender.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-0.5 font-bold font-mono">
                    <Phone className="h-2.5 w-2.5" /> {patient.phone}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">No recent patient records.</p>
        )}
      </div>
    </div>
  );
}
