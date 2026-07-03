'use client';

import React from 'react';
import { Calendar, UserCheck, Stethoscope, ClipboardList } from 'lucide-react';
import type { PatientVisit } from '../types/patient.types';

interface VisitHistoryProps {
  visits: PatientVisit[];
}

export function VisitHistory({ visits }: VisitHistoryProps) {
  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6">
      <div className="mb-6 border-b border-slate-50 pb-3">
        <h3 className="text-sm font-bold text-slate-800">Visit & Consultation History</h3>
        <p className="text-xs text-slate-400 font-medium">Timeline of medical checkups and logs</p>
      </div>

      {visits.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visits.map((visit) => (
            <div key={visit.id} className="relative group p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
              {/* Visit card info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        Consultation with {visit.doctorName ?? 'Staff Doctor'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(visit.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">
                      Chief Complaint
                    </span>
                    <p className="text-slate-800 font-medium mt-1">{visit.chiefComplaint}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">
                      Diagnosis
                    </span>
                    <p className="text-slate-800 font-bold mt-1">{visit.diagnosis}</p>
                  </div>
                  {visit.notes && (
                    <div>
                      <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">
                        Doctor Notes
                      </span>
                      <p className="text-slate-600 font-medium mt-1 leading-relaxed">{visit.notes}</p>
                    </div>
                  )}
                  {visit.nextVisitDate && (
                    <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
                      <UserCheck className="h-4 w-4" /> Next Visit Date:{' '}
                      {new Date(visit.nextVisitDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
          No recorded visits for this patient.
        </div>
      )}
    </div>
  );
}
