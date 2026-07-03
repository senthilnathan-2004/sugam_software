'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MonthlyData {
  month: string;
  revenue: number;
  patients: number;
  medicineSales: number;
}

interface MedicineSalesChartProps {
  data: MonthlyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-slate-100 rounded-lg p-3.5 shadow-card text-xs">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        <p className="text-secondary font-bold">
          Sales: {formatCurrency(payload[0]?.value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
}

export function MedicineSalesChart({ data }: MedicineSalesChartProps) {
  const totalSales = data.reduce((sum, d) => sum + (d.medicineSales || 0), 0);

  return (
    <div className="bg-card rounded-lg border border-slate-100 shadow-md p-6 h-full transition-colors duration-150">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">Medicine Sales</h3>
          <p className="text-xs text-slate-400 font-medium">Last 6 months overview</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">6-Month Total</p>
          <p className="text-lg font-extrabold text-secondary">{formatCurrency(totalSales)}</p>
          <div className="flex items-center gap-1 justify-end text-success text-[11px] font-bold mt-0.5">
            <TrendingUp className="h-3 w-3" />
            <span>+8% vs last period</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="medicineSales"
            stroke="#F97316"
            strokeWidth={2.5}
            fill="url(#salesGradient)"
            dot={{ fill: '#C2410C', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#C2410C' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
