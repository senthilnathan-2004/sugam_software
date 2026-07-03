'use client';

import React, { useEffect, useState, use } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { useDoctor } from '@/features/doctors/hooks/use-doctor';
import { Card } from '@/components/ui/card';
import { User, Calendar, FileText, Phone, ArrowLeft, HeartPulse, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface DoctorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorDetailPage({ params }: DoctorDetailPageProps) {
  const router = useRouter();
  const { id: doctorId } = use(params);
  
  const { fetchDoctorDetails, fetchDoctorHistory } = useDoctor();
  
  const [doctor, setDoctor] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Format today's date as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);

  useEffect(() => {
    async function loadDoctor() {
      setIsLoading(true);
      const doc = await fetchDoctorDetails(doctorId);
      setDoctor(doc);
      if (doc) {
        const hist = await fetchDoctorHistory(doctorId, filterDate);
        setHistory(hist);
      }
      setIsLoading(false);
    }
    loadDoctor();
  }, [doctorId, fetchDoctorDetails, fetchDoctorHistory, filterDate]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'patientUniqueId',
      header: 'Patient ID',
      cell: ({ row }) => <span className="font-mono text-slate-500 font-bold">{row.getValue('patientUniqueId')}</span>,
    },
    {
      accessorKey: 'patientName',
      header: 'Patient Name',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('patientName')}</span>,
    },
    {
      accessorKey: 'time',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold flex items-center w-fit gap-1">
          <Clock className="h-3 w-3" /> {row.getValue('time')}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const t = row.getValue('type') as string;
        let color = 'bg-slate-100 text-slate-600';
        if (t === 'EMERGENCY') color = 'bg-red-50 text-red-600 border border-red-200';
        else if (t === 'FIRST_VISIT') color = 'bg-blue-50 text-blue-600 border border-blue-200';
        else color = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
        
        return (
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${color}`}>
            {t.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'chiefComplaint',
      header: 'Chief Complaint',
      cell: ({ row }) => <span className="truncate max-w-[200px] block">{row.getValue('chiefComplaint')}</span>,
    },
    {
      accessorKey: 'diagnosis',
      header: 'Diagnosis',
      cell: ({ row }) => <span className="font-semibold text-slate-700">{row.getValue('diagnosis')}</span>,
    },
  ];

  if (!doctor && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Doctor Not Found</h2>
        <Button variant="outline" onClick={() => router.push('/doctors')}>Back to Directory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PageHeader
          title={doctor ? doctor.name : 'Loading Profile...'}
          description={doctor ? doctor.specialization : ''}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Profile Section */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-hms text-center relative">
            <div className="absolute top-4 left-4">
              <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 rounded px-2.5 py-1">
                Active
              </span>
            </div>
            
            <div className="h-24 w-24 mx-auto rounded-full bg-slate-100 border-4 border-white shadow flex items-center justify-center overflow-hidden mb-4 mt-6">
              <User className="h-10 w-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{doctor?.name}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">{doctor?.specialization}</p>
            
            <div className="mt-6 flex flex-col gap-3 text-left">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">License / Reg No</p>
                  <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{doctor?.license}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <HeartPulse className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualifications</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{doctor?.qualification}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-hms">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" /> Availability Schedule
            </h3>
            
            <div className="space-y-3">
              {doctor?.schedule && Object.entries(JSON.parse(doctor.schedule)).map(([day, time]) => (
                <div key={day} className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-600">{day}</span>
                  <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">{time as string}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Details / History Section */}
        <div className="xl:col-span-3 space-y-6">
          <Card className="bg-white border border-slate-100 shadow-sm rounded-hms overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Patient Consultation History</h3>
                <p className="text-sm text-slate-500">View patients attended on the selected date.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-9 px-3 py-1 rounded-md border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-700 bg-white"
                />
              </div>
            </div>
            <div className="p-0">
              <DataTable columns={columns} data={history} isLoading={isLoading} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
