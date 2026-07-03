'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CalendarRange } from 'lucide-react';

interface StockAlertsProps {
  alerts: {
    lowStock: { id: string; name: string; totalStock: number; reorderLevel: number }[];
    expiring: { id: string; name: string; batchNo: string; expiryDate: Date; quantity: number }[];
  };
}

export function StockAlerts({ alerts }: StockAlertsProps) {
  const now = new Date().getTime();
  const days30 = now + 30 * 24 * 60 * 60 * 1000;
  const days60 = now + 60 * 24 * 60 * 60 * 1000;
  
  const expiring30 = alerts.expiring.filter(b => new Date(b.expiryDate).getTime() <= days30);
  const expiring60 = alerts.expiring.filter(b => {
    const t = new Date(b.expiryDate).getTime();
    return t > days30 && t <= days60;
  });
  const expiring90 = alerts.expiring.filter(b => {
    const t = new Date(b.expiryDate).getTime();
    return t > days60;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Low Stock Alerts */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-2 text-rose-600 mb-4 border-b border-slate-50 pb-2">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-bold">Low Stock Warning</h3>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {alerts.lowStock.length > 0 ? (
            alerts.lowStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{item.name}</p>
                  <p className="text-slate-400 font-bold mt-0.5">Reorder level: {item.reorderLevel} units</p>
                </div>
                <span className="px-2.5 py-1 bg-danger/10 text-danger rounded font-extrabold font-mono">
                  {item.totalStock} left
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              All stocks are within safe levels.
            </p>
          )}
        </div>
      </Card>

      {/* Batches Expiring (Next 30 Days) */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-2 text-rose-600 mb-4 border-b border-slate-50 pb-2">
          <CalendarRange className="h-5 w-5" />
          <h3 className="text-sm font-bold">Batches Expiring (Next 30 Days)</h3>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {expiring30.length > 0 ? (
            expiring30.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{batch.name}</p>
                  <p className="text-slate-400 font-bold mt-0.5">Batch: {batch.batchNo} · {batch.quantity} units</p>
                </div>
                <span className="px-2.5 py-1 bg-danger/10 text-danger rounded font-extrabold font-mono shrink-0">
                  {new Date(batch.expiryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              No batches are nearing expiry in next 30 days.
            </p>
          )}
        </div>
      </Card>

      {/* Batches Expiring (Next 60 Days) */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-2 text-orange-600 mb-4 border-b border-slate-50 pb-2">
          <CalendarRange className="h-5 w-5" />
          <h3 className="text-sm font-bold">Batches Expiring (Next 60 Days)</h3>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {expiring60.length > 0 ? (
            expiring60.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{batch.name}</p>
                  <p className="text-slate-400 font-bold mt-0.5">Batch: {batch.batchNo} · {batch.quantity} units</p>
                </div>
                <span className="px-2.5 py-1 bg-orange-100 text-orange-600 rounded font-extrabold font-mono shrink-0">
                  {new Date(batch.expiryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              No batches are nearing expiry in next 31-60 days.
            </p>
          )}
        </div>
      </Card>

      {/* Near Expiry Alerts (61-90 Days) */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-2 text-amber-600 mb-4 border-b border-slate-50 pb-2">
          <CalendarRange className="h-5 w-5" />
          <h3 className="text-sm font-bold">Batches Expiring (Next 90 Days)</h3>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {expiring90.length > 0 ? (
            expiring90.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{batch.name}</p>
                  <p className="text-slate-400 font-bold mt-0.5">Batch: {batch.batchNo} · {batch.quantity} units</p>
                </div>
                <span className="px-2.5 py-1 bg-warning/10 text-warning rounded font-extrabold font-mono shrink-0">
                  {new Date(batch.expiryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              No batches are nearing expiry in next 61-90 days.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
