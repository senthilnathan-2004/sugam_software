'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { TodayQueue } from '@/features/doctors/components/today-queue';
import { ConsultationForm } from '@/features/doctors/components/consultation-form';
import { PatientTimeline } from '@/features/doctors/components/patient-timeline';
import { useDoctor } from '@/features/doctors/hooks/use-doctor';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import type { QueueItem } from '@/features/doctors/types/doctor.types';

// Doctor id comes from the `?id=` query string (read client-side). Path params
// (`/doctors/[id]`) can't work under `output: 'export'`.
function DoctorWorkspaceContent() {
  const doctorId = useSearchParams().get('id') ?? '';
  const { doctors, queue, isLoading: isQueueLoading, fetchDoctors, fetchQueue, saveConsultation } = useDoctor();
  const { currentPatient, fetchPatientById } = usePatients();

  const [activeDoctor, setActiveDoctor] = useState<any>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (doctors && doctors.length > 0) {
      const doc = doctors.find((d) => d.id === doctorId) ?? doctors[0];
      setActiveDoctor(doc);
      fetchQueue(doc.id);
    }
  }, [doctors, doctorId, fetchQueue]);

  useEffect(() => {
    if (selectedQueueItem) {
      fetchPatientById(selectedQueueItem.patientId);
    }
  }, [selectedQueueItem, fetchPatientById]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={activeDoctor ? `${activeDoctor.name}'s Consultation Room` : 'Doctor Consultation Room'}
        description={activeDoctor ? `${activeDoctor.specialization} · Reg: ${activeDoctor.license}` : ''}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Column — Queue sidebar */}
        <div className="xl:col-span-1 space-y-6">
          <TodayQueue
            queue={queue}
            selectedItem={selectedQueueItem}
            onSelect={setSelectedQueueItem}
            isLoading={isQueueLoading}
          />
          {selectedQueueItem && currentPatient && (
            <PatientTimeline visits={currentPatient.visits} />
          )}
        </div>

        {/* Center/Right Column — Active Work Area */}
        <div className="xl:col-span-3 space-y-6">
          {selectedQueueItem && activeDoctor ? (
            <div className="space-y-6">
              {/* Active patient summary bar */}
              <Card className="p-4 bg-primary/5 border border-primary/20 rounded-hms flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Patient</h4>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{selectedQueueItem.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID</span>
                    <span className="font-mono">{selectedQueueItem.patientUniqueId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Age</span>
                    <span>{selectedQueueItem.age} Yrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gender</span>
                    <span className="uppercase text-[10px] bg-white border px-1.5 py-0.5 rounded">{selectedQueueItem.gender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Time Slot</span>
                    <span className="font-mono text-primary font-bold">{selectedQueueItem.time}</span>
                  </div>
                </div>
              </Card>

              {/* Consultation form */}
              <ConsultationForm
                queueItem={selectedQueueItem}
                doctor={activeDoctor}
                onSubmit={saveConsultation}
                isLoading={isQueueLoading}
              />
            </div>
          ) : (
            <Card className="p-12 text-center border border-slate-100 rounded-hms shadow bg-white flex flex-col items-center justify-center min-h-100">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
                <User className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Select a Patient</h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
                Choose a patient from the queue sidebar to begin consultation diagnosis and record
                prescriptions.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DoctorWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-100" />}>
      <DoctorWorkspaceContent />
    </Suspense>
  );
}
