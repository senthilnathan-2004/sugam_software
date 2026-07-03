'use client';

import React from 'react';
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useInventoryReports } from '@/features/reports/hooks/use-inventory-reports';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function InventoryReportsPage() {
  const { stockData, statusData, movementData, isLoading, exportInventoryReports } = useInventoryReports();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Analytics & Reports"
        description="Visualize stock levels, category distribution, and inventory health."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={exportInventoryReports} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
              <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Export Report
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Stock by Category (Units)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Inventory Health Status</h3>
          <div className="flex-1 min-h-[288px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Recent Inventory Movement</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-bold">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {movementData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No recent inventory movements found.
                  </td>
                </tr>
              ) : (
                movementData.map((mov: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(mov.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                          mov.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{mov.reference}</td>
                    <td className="px-4 py-3 text-slate-600">{mov.items} items</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      ₹{mov.value.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
