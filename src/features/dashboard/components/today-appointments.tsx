'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TodayAppointment {
  id: string;
  time: string;
  status: string;
  type: string;
  patient: { name: string; patientId: string; phone: string };
}

interface TodayAppointmentsProps {
  appointments: TodayAppointment[];
  isLoading: boolean;
}

export function TodayAppointments({ appointments, isLoading }: TodayAppointmentsProps) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: 'bg-emerald-50 text-success border-emerald-200',
      PENDING: 'bg-amber-50 text-warning border-amber-200',
      CANCELLED: 'bg-rose-50 text-danger border-rose-200',
      COMPLETED: 'bg-blue-50 text-primary border-blue-200',
    };
    return (
      <Badge className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', styles[status] || 'bg-slate-50 text-slate-500')}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Today&apos;s Appointments</h3>
          <span className="text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
            {appointments.length} Scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-2.5">Time</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length > 0 ? (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-bold text-slate-800">{appt.time}</td>
                    <td className="py-3">
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{appt.patient.name}</p>
                        <p className="text-[10px] text-slate-400">{appt.patient.patientId}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {appt.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">{getStatusBadge(appt.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No appointments for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
