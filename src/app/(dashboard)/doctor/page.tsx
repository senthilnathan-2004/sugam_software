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
import type { QueueItem } from '@/features/doctors/types/doctor.types';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { queue, doctors, isLoading, fetchQueue, fetchDoctors, saveConsultation, createWalkInAppointment } = useDoctor();
  const { currentPatient, fetchPatientById } = usePatients();

  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const currentDoctor = doctors.find((d) => d.userId === user?.id) || doctors[0];

  useEffect(() => {
    if (currentDoctor) {
      fetchQueue(currentDoctor.id);
    }
  }, [currentDoctor, fetchQueue]);

  useEffect(() => {
    if (selectedItem?.patientId) {
      fetchPatientById(selectedItem.patientId);
    }
  }, [selectedItem?.patientId, fetchPatientById]);

  const handleSubmit = async (payload: any) => {
    const success = await saveConsultation(payload);
    if (success) {
      setSelectedItem(null);
    }
    return success;
  };

  const handleWalkInSelect = async (patientId: string) => {
    if (!currentDoctor) return;
    
    // Check if patient already in queue
    const existing = queue.find(q => q.patientId === patientId);
    if (existing) {
      setSelectedItem(existing);
      return;
    }

    // Create walk in
    const success = await createWalkInAppointment(patientId, currentDoctor.id);
    if (success && window.electronAPI) {
      // Auto-select the newly added patient
      const res = await window.electronAPI.invoke('doctor:queue', currentDoctor.id);
      if (res?.success) {
        const newlyAdded = res.data.find((q: any) => q.patientId === patientId);
        if (newlyAdded) setSelectedItem(newlyAdded);
      }
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
          {selectedItem && currentDoctor ? (
            <ConsultationForm 
              key={selectedItem.appointmentId} 
              queueItem={selectedItem} 
              doctor={currentDoctor} 
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
