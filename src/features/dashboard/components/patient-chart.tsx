'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyData {
  month: string;
  revenue: number;
  patients: number;
}

interface PatientChartProps {
  data: MonthlyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-xl text-xs">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        <p className="text-secondary font-bold">
          Patients: {payload[0]?.value}
        </p>
      </div>
    );
  }
  return null;
};

export function PatientChart({ data }: PatientChartProps) {
  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-0.5">Patient Traffic</h3>
        <p className="text-xs text-slate-400 font-medium">Monthly admissions & visits count</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="patients"
            fill="#F97316"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
