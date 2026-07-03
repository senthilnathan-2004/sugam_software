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
}

interface RevenueChartProps {
  data: MonthlyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-xl text-xs">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        <p className="text-primary font-bold">
          Revenue: {formatCurrency(payload[0]?.value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">Monthly Revenue</h3>
          <p className="text-xs text-slate-400 font-medium">Last 6 months overview</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">6-Month Total</p>
          <p className="text-lg font-extrabold text-primary">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center gap-1 justify-end text-success text-[11px] font-bold mt-0.5">
            <TrendingUp className="h-3 w-3" />
            <span>+14% vs last period</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
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
            dataKey="revenue"
            stroke="#2563EB"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ fill: '#1E40AF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#1E40AF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
