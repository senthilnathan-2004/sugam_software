'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheck, User, Phone, MapPin, Heart, AlertTriangle } from 'lucide-react';
import type { Patient } from '../types/patient.types';

interface PatientProfileProps {
  patient: Patient;
}

export function PatientProfile({ patient }: PatientProfileProps) {
  const formatBloodGroup = (bg: string) => {
    return bg.replace('_POS', ' +ve').replace('_NEG', ' -ve').replace('UNKNOWN', 'Unknown');
  };

  return (
    <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Patient Avatar/Identity */}
      <div className="flex flex-col items-center justify-center text-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 h-full">
        <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl uppercase overflow-hidden shrink-0">
          {patient.photo ? (
            <img src={patient.photo} alt={patient.name} className="h-full w-full object-cover" />
          ) : (
            patient.name.charAt(0)
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">{patient.name}</h2>
          <p className="text-xs text-slate-400 font-extrabold mt-0.5">{patient.patientId}</p>
        </div>
        <span className="text-[10px] font-extrabold uppercase bg-primary/5 text-primary border border-primary/20 rounded px-2.5 py-1">
          Active Patient
        </span>
      </div>

      {/* Primary Details Table */}
      <div className="col-span-1 md:col-span-3">
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <th className="py-3 px-4 font-semibold text-slate-500 bg-slate-50/80 w-1/3 align-top">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> Age / Gender
                  </div>
                </th>
                <td className="py-3 px-4 font-bold text-slate-800 align-top">
                  {patient.age} Yrs · {patient.gender.toLowerCase()}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <th className="py-3 px-4 font-semibold text-slate-500 bg-slate-50/80 align-top">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-slate-400" /> Blood Group
                  </div>
                </th>
                <td className="py-3 px-4 font-bold text-slate-800 align-top">
                  {formatBloodGroup(patient.bloodGroup)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <th className="py-3 px-4 font-semibold text-slate-500 bg-slate-50/80 align-top">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" /> Phone Number
                  </div>
                </th>
                <td className="py-3 px-4 font-bold text-slate-800 font-mono align-top">
                  {patient.phone}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <th className="py-3 px-4 font-semibold text-slate-500 bg-slate-50/80 align-top">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Address
                  </div>
                </th>
                <td className="py-3 px-4 font-bold text-slate-800 align-top">
                  {patient.address}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <th className="py-3 px-4 font-semibold text-slate-500 bg-slate-50/80 align-top">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-400" /> Emergency
                  </div>
                </th>
                <td className="py-3 px-4 font-bold text-slate-800 align-top">
                  {patient.emergencyContactName} <span className="text-slate-500 font-normal">({patient.emergencyContactPhone})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
