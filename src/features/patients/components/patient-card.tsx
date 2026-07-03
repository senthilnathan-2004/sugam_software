'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Printer, Heart, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Patient } from '../types/patient.types';

interface PatientCardProps {
  patient: Patient;
}

export function PatientCard({ patient }: PatientCardProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatBloodGroup = (bg: string) => {
    return bg.replace('_POS', ' +ve').replace('_NEG', ' -ve').replace('UNKNOWN', 'Unknown');
  };

  return (
    <div className="space-y-4">
      {/* Printable ID Card */}
      <Card
        id="printable-patient-card"
        className="relative w-[340px] h-[210px] bg-gradient-to-br from-primary to-indigo-900 text-white rounded-2xl shadow-xl p-5 overflow-hidden flex flex-col justify-between border-0 mx-auto"
      >
        {/* Decorative Background Circles */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-white/5 pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-secondary rounded flex items-center justify-center font-extrabold text-white text-xs shrink-0">
              S
            </div>
            <div>
              <p className="font-extrabold text-[11px] tracking-wide leading-none">SUGAM GENERAL HOSPITAL</p>
              <p className="text-[7px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">HEALTH CARD</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 rounded px-1.5 py-0.5 text-emerald-300 font-extrabold tracking-wider">
            ACTIVE
          </span>
        </div>

        {/* Card Body */}
        <div className="flex items-center gap-4 my-2.5">
          <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg uppercase shrink-0 border border-white/20 overflow-hidden">
            {patient.photo ? (
              <img src={patient.photo} alt={patient.name} className="h-full w-full object-cover" />
            ) : (
              patient.name.charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate leading-snug">{patient.name}</h4>
            <p className="text-[9px] text-slate-300 font-bold mt-0.5">
              {patient.age} Yrs · {patient.gender.toLowerCase()}
            </p>
            <p className="text-[9px] text-slate-300 font-bold flex items-center gap-1 mt-0.5">
              <Heart className="h-2.5 w-2.5 text-secondary fill-secondary" /> Blood Group: {formatBloodGroup(patient.bloodGroup)}
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-end justify-between border-t border-white/10 pt-2.5">
          <div>
            <p className="text-[6px] text-slate-300 font-bold uppercase tracking-wider">Patient Identification Number</p>
            <p className="text-[11px] font-extrabold font-mono tracking-wider">{patient.patientId}</p>
          </div>
          <div className="text-right">
            <p className="text-[6px] text-slate-300 font-bold uppercase tracking-wider">Emergency Helpline</p>
            <p className="text-[9px] font-bold font-mono">+91 98765 43210</p>
          </div>
        </div>
      </Card>

      {/* Action controls */}
      <div className="flex justify-center">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="text-xs font-bold gap-1.5 h-10 border-slate-200"
        >
          <Printer className="h-4 w-4" /> Print Patient Health Card
        </Button>
      </div>
    </div>
  );
}
