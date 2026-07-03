'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Printer, Calendar, Heart, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrescriptionPrintProps {
  doctor: { name: string; specialization: string; license: string };
  patient: { name: string; age: number; gender: string; patientId: string };
  chiefComplaint: string;
  diagnosis: string;
  medicines: { name: string; dosage: string; duration: string; instructions?: string }[];
}

export function PrescriptionPrint({
  doctor,
  patient,
  chiefComplaint,
  diagnosis,
  medicines,
}: PrescriptionPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Rx Card print sheet */}
      <Card
        id="prescription-print-sheet"
        className="w-full max-w-2xl bg-white border border-slate-200 shadow-xl p-8 text-slate-800 font-sans space-y-6"
      >
        {/* Hospital header */}
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-primary leading-tight">SUGAM GENERAL HOSPITAL</h2>
            <p className="text-xs text-slate-400 font-medium">123, Healthcare Avenue, Chennai, TN 600001</p>
            <p className="text-[10px] text-slate-400 font-bold font-mono">GST No: 33AABCU9603R1ZM</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">{doctor.name}</h3>
            <p className="text-xs text-primary font-semibold">{doctor.specialization}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Reg No: {doctor.license}</p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs font-semibold">
          <div className="space-y-1">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Patient Details</p>
            <p className="text-slate-950 font-bold text-sm">{patient.name}</p>
            <p className="text-slate-500">
              {patient.age} Yrs · {patient.gender.toLowerCase()}
            </p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Registration Number</p>
            <p className="text-slate-950 font-mono text-sm font-bold">{patient.patientId}</p>
            <p className="text-slate-500 font-mono">
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Complaints + Diagnosis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Chief Complaints
            </h4>
            <p className="text-slate-800 font-medium leading-relaxed">{chiefComplaint || 'None'}</p>
          </div>
          <div>
            <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Diagnosis / Impression
            </h4>
            <p className="text-slate-800 font-bold leading-relaxed">{diagnosis || 'None'}</p>
          </div>
        </div>

        {/* Rx Symbol */}
        <div>
          <span className="text-2xl font-black text-primary font-serif">Rₓ</span>
        </div>

        {/* Medicines list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2 w-1/12">#</th>
                <th className="pb-2 w-5/12">Medicine / Generic</th>
                <th className="pb-2 w-3/12">Dosage</th>
                <th className="pb-2 w-3/12 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {medicines.map((med, index) => (
                <tr key={index}>
                  <td className="py-3 text-slate-400 font-bold">{index + 1}</td>
                  <td className="py-3">
                    <div>
                      <p className="font-bold text-slate-900 leading-snug">{med.name}</p>
                      {med.instructions && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                          Note: {med.instructions}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-slate-800">{med.dosage}</td>
                  <td className="py-3 text-right text-slate-800">{med.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature Line */}
        <div className="flex justify-end pt-12">
          <div className="text-center w-48 border-t border-slate-200 pt-2 text-xs">
            <p className="font-bold text-slate-800">{doctor.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Authorized Signature</p>
          </div>
        </div>
      </Card>

      {/* Trigger control */}
      <div className="flex justify-center">
        <Button onClick={handlePrint} className="text-xs font-bold gap-1.5 h-10 shadow">
          <Printer className="h-4 w-4" /> Print Consultation Prescription
        </Button>
      </div>
    </div>
  );
}
