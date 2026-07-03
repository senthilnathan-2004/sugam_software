'use client';

import React from 'react';
import { Calendar, UserCheck, Stethoscope } from 'lucide-react';
import type { PatientVisit } from '@/features/patients/types/patient.types';

interface PatientTimelineProps {
  visits: PatientVisit[];
}

export function PatientTimeline({ visits }: PatientTimelineProps) {
  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full flex flex-col overflow-y-auto">
      <div className="mb-4 border-b border-slate-50 pb-3">
        <h3 className="text-sm font-bold text-slate-800">Visit Timeline</h3>
        <p className="text-xs text-slate-400 font-medium">History log of previous consultations</p>
      </div>

      {visits.length > 0 ? (
        <div className="space-y-6 pl-8 border-l border-slate-200 ml-2 text-xs">
          {visits.map((visit) => (
            <div key={visit.id} className="relative">
              <span className="absolute -left-[43px] top-0.5 p-1 bg-white border border-primary rounded-full shadow-sm">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-slate-800 leading-tight">
                    Consultation with {visit.doctorName ?? 'Staff Doctor'}
                  </p>
                  <span className="text-[9px] text-slate-400 font-bold shrink-0">
                    {new Date(visit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3 mt-2">
                  <div>
                    <h4 className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Complaint</h4>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{visit.chiefComplaint}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Diagnosis</h4>
                    <p className="text-xs text-slate-900 font-bold leading-relaxed">{visit.diagnosis}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-6 text-slate-400 text-xs font-semibold">No timeline records found.</p>
      )}
    </div>
  );
}
