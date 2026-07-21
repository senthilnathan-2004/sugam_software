'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { TodayQueue } from '@/features/doctors/components/today-queue';
import { ConsultationForm } from '@/features/doctors/components/consultation-form';
import { PatientTimeline } from '@/features/doctors/components/patient-timeline';
import { useDoctor } from '@/features/doctors/hooks/use-doctor';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { PatientSearchWalkin } from '@/features/doctors/components/patient-search-walkin';
import { NewPatientDialog } from '@/features/doctors/components/new-patient-dialog';
import type { QueueItem } from '@/features/doctors/types/doctor.types';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const {
    queue,
    doctors,
    isLoading,
    currentDoctor,
    fetchMe,
    fetchQueue,
    fetchDoctors,
    saveConsultation,
    createWalkInAppointment,
    registerAndStartVisit,
  } = useDoctor();
  const { currentPatient, fetchPatientById } = usePatients();

  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  // Resolve the logged-in doctor server-side (spec §5/§34). ADMIN has no own
  // Doctor row, so an admin viewing this panel falls back to the doctor list.
  useEffect(() => {
    fetchMe();
    fetchDoctors();
  }, [fetchMe, fetchDoctors]);

  const effectiveDoctor = currentDoctor ?? (user?.role === 'ADMIN' ? doctors[0] : undefined);

  useEffect(() => {
    if (effectiveDoctor) fetchQueue(effectiveDoctor.id);
  }, [effectiveDoctor, fetchQueue]);

  // Live queue refresh (spec §20) — visibility-aware, every 4s.
  useEffect(() => {
    if (!effectiveDoctor) return;
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchQueue(effectiveDoctor.id);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [effectiveDoctor, fetchQueue]);

  useEffect(() => {
    if (selectedItem?.patientId) fetchPatientById(selectedItem.patientId);
  }, [selectedItem?.patientId, fetchPatientById]);

  const handleSubmit = async (payload: any) => {
    const success = await saveConsultation(payload);
    if (success) setSelectedItem(null);
    return success;
  };

  const handleWalkInSelect = async (patientId: string) => {
    if (!effectiveDoctor) return;

    // Already queued today → just select it.
    const existing = queue.find((q) => q.patientId === patientId);
    if (existing) {
      setSelectedItem(existing);
      return;
    }

    const success = await createWalkInAppointment(patientId, effectiveDoctor.id);
    if (success && window.electronAPI) {
      const res = await window.electronAPI.invoke('doctor:queue', effectiveDoctor.id);
      if (res?.success) {
        const newlyAdded = res.data.find((q: any) => q.patientId === patientId);
        if (newlyAdded) setSelectedItem(newlyAdded);
      }
    }
  };

  // After a brand-new patient is registered + a visit started, refresh the queue
  // and auto-select the new appointment so the doctor can begin immediately.
  const handleRegistered = async (appointmentId: string, patientId: string) => {
    if (!effectiveDoctor || !window.electronAPI) return;
    const res = await window.electronAPI.invoke('doctor:queue', effectiveDoctor.id);
    if (res?.success) {
      const found =
        res.data.find((q: any) => q.appointmentId === appointmentId) ??
        res.data.find((q: any) => q.patientId === patientId);
      if (found) setSelectedItem(found);
    }
  };

  const currentTimeline = currentPatient?.visits || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Doctor Dashboard" 
        description="Manage your consultations and patient records efficiently." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        {/* Left Column: Queue (3 columns) */}
        <div className="lg:col-span-3 h-full flex flex-col gap-4">
          <NewPatientDialog
            register={(patient, forceNew) => registerAndStartVisit(patient, forceNew, effectiveDoctor?.id)}
            onRegistered={handleRegistered}
            onUseExisting={handleWalkInSelect}
            disabled={!effectiveDoctor}
          />
          <PatientSearchWalkin onSelect={handleWalkInSelect} />
          <div className="flex-1 overflow-hidden">
            <TodayQueue 
              queue={queue} 
              selectedItem={selectedItem} 
              onSelect={setSelectedItem} 
              isLoading={isLoading} 
            />
          </div>
        </div>

        {/* Center Column: Consultation Form (6 columns) */}
        <div className="lg:col-span-6 h-full overflow-y-auto pr-2">
          {selectedItem && effectiveDoctor ? (
            <ConsultationForm
              key={selectedItem.appointmentId}
              queueItem={selectedItem}
              doctor={effectiveDoctor}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          ) : (
            <div className="bg-white rounded-hms border border-slate-100 shadow-md p-12 text-center h-full flex flex-col items-center justify-center">
              <p className="text-slate-400 font-medium">Select a patient from the queue to start consultation.</p>
            </div>
          )}
        </div>

        {/* Right Column: Timeline (3 columns) */}
        <div className="lg:col-span-3 h-full">
          {selectedItem ? (
            <PatientTimeline visits={currentTimeline} />
          ) : (
            <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 text-center text-sm text-slate-400 font-medium h-full flex flex-col items-center justify-center">
              Patient timeline will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
