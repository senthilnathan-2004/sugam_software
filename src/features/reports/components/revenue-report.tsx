'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { IndianRupee, Tag, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MetricCard } from '@/components/common/metric-card';

interface RevenueReportProps {
  data: {
    chartData: { date: string; amount: number }[];
    items: { id: string; invoiceNo: string; date: Date | string; patientName: string; paymentMode: string; total: number }[];
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
      medicineSales: number;
      totalDiscount: number;
      totalGst: number;
      invoiceCount: number;
    };
  };
}

export function RevenueReport({ data }: RevenueReportProps) {
  return (
    <div className="space-y-6">
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={formatCurrency(data.summary.totalRevenue)} variant="primary" subLabel="Gross collections" />
        <MetricCard label="Total Expenses" value={formatCurrency(data.summary.totalExpenses)} variant="danger" subLabel="Estimated operational costs" />
        <MetricCard label="Net Profit" value={formatCurrency(data.summary.netProfit)} variant="success" subLabel="Revenue minus expenses" />
        <MetricCard label="Medicine Sales" value={formatCurrency(data.summary.medicineSales)} variant="secondary" subLabel="From pharmacy invoices" />
      </div>

      {/* Revenue Area Chart */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Financial Progression</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.chartData}>
            <defs>
              <linearGradient id="reportsRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip />
            <Area type="monotone" dataKey="amount" stroke="#1E40AF" strokeWidth={2} fill="url(#reportsRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Transaction Log */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Transactions Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2.5">Invoice No</th>
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Mode</th>
                <th className="pb-2.5 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">{item.invoiceNo}</td>
                  <td className="py-2.5">
                    {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2.5">{item.patientName}</td>
                  <td className="py-2.5">
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{item.paymentMode}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
