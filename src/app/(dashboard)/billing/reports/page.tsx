'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useBilling } from '@/features/billing/hooks/use-billing';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, TrendingUp, IndianRupee, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function BillingReportsPage() {
  const { invoices, fetchInvoices, isLoading, exportInvoices } = useBilling();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalReturns: 0,
    netRevenue: 0,
    totalInvoices: 0,
  });

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (!invoices.length) return;

    // Calculate metrics
    let rev = 0;
    let ret = 0;
    let count = 0;
    
    // Payments grouping
    const payMap: Record<string, number> = {
      'CASH': 0,
      'UPI': 0,
      'CARD': 0,
      'SPLIT': 0
    };

    // Sales by date (dummy for last 7 days + today)
    const recentDates: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      recentDates[d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })] = 0;
    }

    invoices.forEach(inv => {
      if (inv.isReturn) {
        ret += inv.total;
      } else {
        rev += inv.total;
        count++;
        
        if (payMap[inv.paymentMode] !== undefined) {
          payMap[inv.paymentMode] += inv.total;
        }

        const dateStr = new Date(inv.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (recentDates[dateStr] !== undefined) {
          recentDates[dateStr] += inv.total;
        }
      }
    });

    setMetrics({
      totalRevenue: rev,
      totalReturns: ret,
      netRevenue: rev - ret,
      totalInvoices: count
    });

    const pData = [
      { name: 'CASH', value: payMap['CASH'], color: '#10b981' },
      { name: 'UPI', value: payMap['UPI'], color: '#3b82f6' },
      { name: 'CARD', value: payMap['CARD'], color: '#f59e0b' },
      { name: 'SPLIT', value: payMap['SPLIT'], color: '#8b5cf6' },
    ].filter(p => p.value > 0);
    setPaymentData(pData);

    const sData = Object.keys(recentDates).map(key => ({
      date: key,
      revenue: recentDates[key]
    }));
    setSalesData(sData);

  }, [invoices]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Sales Analytics"
        description="Monitor daily revenue, payment methods, and return billing metrics."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={exportInvoices} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
              <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Export Sales
            </Button>
            <Link href="/billing">
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <ArrowLeft className="h-4 w-4" /> Back to POS
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Revenue</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalRevenue)}</h3>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Revenue</p>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(metrics.netRevenue)}</h3>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Return Write-offs</p>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalReturns)}</h3>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoices Settled</p>
          <h3 className="text-2xl font-black text-slate-800">{metrics.totalInvoices} <span className="text-sm font-medium text-slate-400">Bills</span></h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-2xl lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-6">7-Day Revenue Trend</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-2xl flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Revenue by Payment Mode</h3>
          <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="text-sm text-slate-400 font-medium">No payment data available</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
