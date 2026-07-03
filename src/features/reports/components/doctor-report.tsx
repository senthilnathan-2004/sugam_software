'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { MetricCard } from '@/components/common/metric-card';

interface DoctorReportProps {
  data: {
    chartData: { name: string; consultations: number }[];
    items: { id: string; doctorName: string; department: string; consultations: number; revenue: number }[];
    summary: {
      totalDoctors: number;
      totalConsultations: number;
      totalRevenue: number;
    };
  };
}

export function DoctorReport({ data }: DoctorReportProps) {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Active Doctors" value={data.summary.totalDoctors.toString()} variant="primary" subLabel="Currently seeing patients" />
        <MetricCard label="Total Consultations" value={data.summary.totalConsultations.toString()} variant="secondary" subLabel="Across all departments" />
        <MetricCard label="Consultation Revenue" value={formatCurrency(data.summary.totalRevenue)} variant="success" subLabel="Total fees collected" />
      </div>

      {/* Consultations Bar Chart */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Consultations by Doctor</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="consultations" fill="#1E40AF" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Data Table */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Doctor Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2.5">Doctor Name</th>
                <th className="pb-2.5">Department</th>
                <th className="pb-2.5 text-center">Consultations</th>
                <th className="pb-2.5 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">{item.doctorName}</td>
                  <td className="py-2.5 text-slate-500">{item.department}</td>
                  <td className="py-2.5 text-center">{item.consultations}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-600">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
