'use client';

import React, { useEffect, useState, use } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { PatientProfile } from '@/features/patients/components/patient-profile';
import { PatientCard } from '@/features/patients/components/patient-card';
import { VisitHistory } from '@/features/patients/components/visit-history';
import { DocumentUpload } from '@/features/patients/components/document-upload';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = use(params);
  const { hasPermission } = useAuthStore();
  const { currentPatient, isLoading, fetchPatientById, uploadDocument } = usePatients();

  useEffect(() => {
    fetchPatientById(id);
  }, [fetchPatientById, id]);

  if (isLoading || !currentPatient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentPatient.name}
        description={`Registered: ${new Date(currentPatient.createdAt).toLocaleDateString('en-IN')}`}
        actions={
          hasPermission('patients:write') && (
            <Link href={`/patients/new?edit=${currentPatient.id}`}>
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <Edit className="h-4 w-4" /> Edit Profile
              </Button>
            </Link>
          )
        }
      />

      {/* Profile summary card */}
      <PatientProfile patient={currentPatient} />

      {/* Timeline (Full width) */}
      <div className="w-full">
        <VisitHistory visits={currentPatient.visits} />
      </div>

      {/* Associated widgets grid details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* Left Column — Medical Documents */}
        <div>
          <DocumentUpload 
            documents={currentPatient.documents} 
            onUpload={async (file, type) => {
              return await uploadDocument(currentPatient.id, file, type);
            }}
          />
        </div>

        {/* Right Column — Printable ID Badge card */}
        <div className="h-full">
          <div className="bg-white p-6 border border-slate-100 rounded-hms shadow-md h-full flex flex-col justify-center items-center">
            <h3 className="text-sm font-bold text-slate-800 mb-4 self-start">Print Health Card</h3>
            <PatientCard patient={currentPatient} />
          </div>
        </div>
      </div>
    </div>
  );
}
