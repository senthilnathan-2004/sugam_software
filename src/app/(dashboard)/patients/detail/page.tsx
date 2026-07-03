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
  const { id } = React.use(params);
  const { hasPermission } = useAuthStore();
  const { currentPatient, isLoading, fetchPatientById } = usePatients();

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

      {/* Associated widgets grid details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column — Medical Visits + Documents */}
        <div className="xl:col-span-2 space-y-6">
          <VisitHistory visits={currentPatient.visits} />
          <DocumentUpload documents={currentPatient.documents} />
        </div>

        {/* Right Column — Printable ID Badge card */}
        <div className="xl:col-span-1">
          <div className="sticky top-24 bg-white p-6 border border-slate-100 rounded-hms shadow-md">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Print Health Card</h3>
            <PatientCard patient={currentPatient} />
          </div>
        </div>
      </div>
    </div>
  );
}
