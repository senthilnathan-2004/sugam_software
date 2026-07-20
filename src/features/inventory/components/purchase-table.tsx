'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2, Pencil } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import type { PurchaseOrder } from '../types/inventory.types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

interface PurchaseTableProps {
  data: PurchaseOrder[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (po: PurchaseOrder) => void;
}

export function PurchaseTable({ data, isLoading, onDelete, onEdit }: PurchaseTableProps) {
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'invoiceNo',
      header: 'Invoice / PO Ref',
      cell: ({ row }) => <span className="font-extrabold text-slate-900">{row.getValue('invoiceNo')}</span>,
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('supplierName')}</span>,
    },
    {
      accessorKey: 'date',
      header: 'Purchase Date',
      cell: ({ row }) => (
        <span>
          {new Date(row.getValue('date')).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total Paid (INR)',
      cell: ({ row }) => <span className="font-mono font-bold text-primary">{formatCurrency(row.getValue('total'))}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-success border-emerald-200">
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setViewPO(po)}>
              <Eye className="h-4 w-4 text-blue-500" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(po)}>
                <Pencil className="h-4 w-4 text-emerald-500" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(po.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={data} isLoading={isLoading} />
      
      <Dialog open={!!viewPO} onOpenChange={(open) => !open && setViewPO(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Purchase Order Details</DialogTitle>
          </DialogHeader>
          {viewPO && (
            <div className="space-y-4 text-sm mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Invoice / PO Ref</p>
                  <p className="font-medium text-slate-900">{viewPO.invoiceNo}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Supplier</p>
                  <p className="text-slate-700">{viewPO.supplierName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Date</p>
                  <p className="text-slate-700">{new Date(viewPO.date).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Status</p>
                  <p className="text-slate-700">{viewPO.status}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Subtotal</p>
                  <p className="font-mono text-slate-700">{formatCurrency(viewPO.subtotal)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">GST Amount</p>
                  <p className="font-mono text-slate-700">{formatCurrency(viewPO.gstAmount)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Total</p>
                  <p className="font-mono font-bold text-primary">{formatCurrency(viewPO.total)}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider mb-2">Items JSON Preview</p>
                  <div className="bg-slate-50 p-3 rounded-lg border max-h-48 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{viewPO.items}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Purchase Order"
        description="This will permanently remove the purchase order from your records. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteId) onDelete?.(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
}
