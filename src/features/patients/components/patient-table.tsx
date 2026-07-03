'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import type { Patient } from '../types/patient.types';
import { useAuthStore } from '@/store/auth.store';

interface PatientTableProps {
  data: Patient[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function PatientTable({ data, isLoading, onDelete }: PatientTableProps) {
  const router = useRouter();
  const { hasPermission } = useAuthStore();

  const columns: ColumnDef<Patient>[] = [
    {
      accessorKey: 'patientId',
      header: 'ID',
      cell: ({ row }) => <span className="font-extrabold text-slate-900">{row.getValue('patientId')}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'age',
      header: 'Age',
      cell: ({ row }) => <span>{row.getValue('age')} Yrs</span>,
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => (
        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase">
          {row.getValue('gender')}
        </span>
      ),
    },
    {
      accessorKey: 'bloodGroup',
      header: 'Blood',
      cell: ({ row }) => (
        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
          {(row.getValue('bloodGroup') as string).replace('_POS', '+').replace('_NEG', '-')}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="font-mono">{row.getValue('phone')}</span>,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/patients/${patient.id}`);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {hasPermission('patients:write') && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/patients/new?edit=${patient.id}`);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('patients:delete') && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-danger hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(patient.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={(row) => router.push(`/patients/${row.id}`)}
    />
  );
}
