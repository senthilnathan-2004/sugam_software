'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { formatCurrency } from '@/lib/utils';

interface InventoryReportProps {
  data: {
    items: { id: string; name: string; categoryName: string; quantity: number; valuation: number }[];
    summary: {
      totalValuation: number;
      totalStockItems: number;
    };
  };
}

export function InventoryReport({ data }: InventoryReportProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard label="Inventory Asset Valuation" value={formatCurrency(data.summary.totalValuation)} variant="primary" subLabel="Estimated total stock value (Cost price)" />
        <MetricCard label="Total Stock Units" value={`${data.summary.totalStockItems.toLocaleString()} Units`} variant="secondary" subLabel="Aggregate medicine units" />
      </div>

      {/* Stock catalog valuation */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Inventory Valuation Catalog</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2.5">Medicine</th>
                <th className="pb-2.5">Category</th>
                <th className="pb-2.5">Quantity (Units)</th>
                <th className="pb-2.5 text-right">Asset Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">{item.name}</td>
                  <td className="py-2.5">
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{item.categoryName}</span>
                  </td>
                  <td className="py-2.5 font-mono">{item.quantity}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.valuation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
