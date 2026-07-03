'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MetricCard } from '@/components/common/metric-card';

interface PatientReportProps {
  data: {
    chartData: { date: string; registrations: number; visits: number }[];
    summary: {
      newRegistrations: number;
      totalVisits: number;
    };
  };
}

export function PatientReport({ data }: PatientReportProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard label="New Patient Admissions" value={`${data.summary.newRegistrations} registrations`} variant="primary" subLabel="Added to master registry" />
        <MetricCard label="Total Consultations" value={`${data.summary.totalVisits} visits`} variant="secondary" subLabel="Clinician consultations logged" />
      </div>

      {/* Traffic Chart */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Patient Traffic Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar name="Registrations" dataKey="registrations" fill="#1E40AF" radius={[3, 3, 0, 0]} />
            <Bar name="Visits" dataKey="visits" fill="#F97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
