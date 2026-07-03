'use client';

import React, { use, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { PatientForm } from '@/features/patients/components/patient-form';
import { usePatients } from '@/features/patients/hooks/use-patients';

import { Suspense } from 'react';

function NewPatientFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { currentPatient, isLoading, fetchPatientById, savePatient } = usePatients();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (editId) {
      fetchPatientById(editId).then(() => {
        setIsDataLoaded(true);
      });
    } else {
      setIsDataLoaded(true);
    }
  }, [editId, fetchPatientById]);

  const handleSubmit = async (data: any) => {
    const success = await savePatient(data, editId || undefined);
    return success;
  };

  if (editId && (!currentPatient || !isDataLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? 'Edit Patient Details' : 'Register New Patient'}
        description={
          editId
            ? 'Update the profile details and emergency contacts of this patient.'
            : 'Register a new patient and assign a unique Patient Identification Number.'
        }
      />

      <PatientForm
        initialValues={editId ? currentPatient : undefined}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function NewPatientPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <NewPatientFormContent />
    </Suspense>
  );
}
