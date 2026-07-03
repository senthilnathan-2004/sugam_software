'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, User, Search, RefreshCw, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PatientTable } from '@/features/patients/components/patient-table';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuthStore } from '@/store/auth.store';

export default function PatientsPage() {
  const { hasPermission } = useAuthStore();
  const { patients, isLoading, fetchPatients, deletePatient, exportPatients, importPatients } = usePatients();
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('ALL');
  const [bloodGroup, setBloodGroup] = useState('ALL');

  useEffect(() => {
    fetchPatients({ search, gender, bloodGroup });
  }, [fetchPatients, search, gender, bloodGroup]);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <PageHeader
        title="Patients Management"
        description="Search, view, register, and manage patient medical records."
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('patients:write') && (
              <>
                <Button onClick={importPatients} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200">
                  <Upload className="h-4 w-4 mr-1.5 text-slate-500" /> Import Excel
                </Button>
                <Button onClick={exportPatients} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200">
                  <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Export Excel
                </Button>
                <Link href="/patients/new">
                  <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                    <Plus className="h-4 w-4" /> Register Patient
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      {/* Filter Toolbar controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 border border-slate-100 rounded-hms shadow-sm">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID, Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-lg text-xs"
          />
        </div>

        {/* Gender Filter */}
        <div>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-10 rounded-lg text-xs">
              <SelectValue placeholder="Gender Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              <SelectItem value="ALL">All Genders</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Blood Group Filter */}
        <div>
          <Select value={bloodGroup} onValueChange={setBloodGroup}>
            <SelectTrigger className="h-10 rounded-lg text-xs">
              <SelectValue placeholder="Blood Group Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              <SelectItem value="ALL">All Blood Groups</SelectItem>
              <SelectItem value="A_POS">A +ve</SelectItem>
              <SelectItem value="A_NEG">A -ve</SelectItem>
              <SelectItem value="B_POS">B +ve</SelectItem>
              <SelectItem value="B_NEG">B -ve</SelectItem>
              <SelectItem value="O_POS">O +ve</SelectItem>
              <SelectItem value="O_NEG">O -ve</SelectItem>
              <SelectItem value="AB_POS">AB +ve</SelectItem>
              <SelectItem value="AB_NEG">AB -ve</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table view */}
      <PatientTable
        data={patients}
        isLoading={isLoading}
        onDelete={(id) => {
          if (confirm('Are you sure you want to delete this patient record?')) {
            startTransition(async () => {
              await deletePatient(id);
            });
          }
        }}
      />
    </div>
  );
}
