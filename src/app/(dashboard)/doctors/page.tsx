'use client';

import React, { useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { useDoctor } from '@/features/doctors/hooks/use-doctor';
import type { Doctor } from '@/features/doctors/types/doctor.types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DoctorsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { doctors, isLoading, fetchDoctors } = useDoctor();

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const columns: ColumnDef<Doctor>[] = [
    {
      accessorKey: 'name',
      header: 'Doctor Name',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'specialization',
      header: 'Specialization',
      cell: ({ row }) => (
        <span className="text-xs bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold">
          {row.getValue('specialization')}
        </span>
      ),
    },
    {
      accessorKey: 'qualification',
      header: 'Qualifications',
      cell: ({ row }) => <span>{row.getValue('qualification')}</span>,
    },
    {
      accessorKey: 'license',
      header: 'License / Reg No',
      cell: ({ row }) => <span className="font-mono">{row.getValue('license')}</span>,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const doc = row.original;
        const showWorkspace = user?.role === 'ADMIN' || (user?.role === 'DOCTOR' && doc.userId === user.id);

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold gap-1 h-8 border-slate-200"
              onClick={() => router.push(`/doctors/detail?id=${doc.id}`)}
            >
              <Eye className="h-3.5 w-3.5" /> Details
            </Button>
            {showWorkspace && (
              <Button
                size="sm"
                className="text-xs font-bold gap-1 h-8 bg-primary/10 text-primary hover:bg-primary/20 border-0"
                onClick={() => router.push(`/doctors/workspace?id=${doc.id}`)}
              >
                Workspace
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors Directory"
        description="View hospital clinical team, credentials, and consult work schedules."
      />

      <DataTable columns={columns} data={doctors} isLoading={isLoading} />
    </div>
  );
}
