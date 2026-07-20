'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2, Pencil } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import type { Medicine } from '../types/inventory.types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

interface MedicineTableProps {
  data: Medicine[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (medicine: Medicine) => void;
}

export function MedicineTable({ data, isLoading, onDelete, onEdit }: MedicineTableProps) {
  const [viewMed, setViewMed] = useState<Medicine | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: ColumnDef<Medicine>[] = [
    {
      accessorKey: 'name',
      header: 'Medicine / Generic',
      cell: ({ row }) => {
        const med = row.original;
        return (
          <div>
            <p className="font-extrabold text-slate-900 leading-snug">{med.name}</p>
            <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">{med.genericName}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase">
          {row.getValue('categoryName')}
        </span>
      ),
    },
    {
      accessorKey: 'mrp',
      header: 'MRP',
      cell: ({ row }) => <span className="font-mono">{formatCurrency(row.getValue('mrp'))}</span>,
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Sale Price',
      cell: ({ row }) => <span className="font-mono font-bold text-primary">{formatCurrency(row.getValue('sellingPrice'))}</span>,
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{row.getValue('unit')}</span>,
    },
    {
      accessorKey: 'totalStock',
      header: 'Total Stock',
      cell: ({ row }) => {
        const med = row.original;
        const stock = med.totalStock ?? 0;
        const low = stock <= med.reorderLevel;
        const perPack = Math.max(1, med.unitsPerPack || 1);
        const packs = Math.floor(stock / perPack);
        const loose = stock % perPack;
        return (
          <div>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                low ? 'bg-rose-50 text-danger border border-rose-200' : 'bg-slate-50 text-slate-700'
              }`}
            >
              {stock} Units
            </span>
            {perPack > 1 && (
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {packs} strip{packs === 1 ? '' : 's'}{loose > 0 ? ` + ${loose} loose` : ''}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const med = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setViewMed(med)}>
              <Eye className="h-4 w-4 text-blue-500" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(med)}>
                <Pencil className="h-4 w-4 text-emerald-500" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(med.id)}>
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
      
      <Dialog open={!!viewMed} onOpenChange={(open) => !open && setViewMed(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Medicine Details</DialogTitle>
          </DialogHeader>
          {viewMed && (
            <div className="space-y-4 text-sm mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Name</p>
                  <p className="font-medium text-slate-900">{viewMed.name}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Generic Name</p>
                  <p className="text-slate-700">{viewMed.genericName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Category</p>
                  <p className="text-slate-700">{viewMed.categoryName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Supplier</p>
                  <p className="text-slate-700">{viewMed.supplierName || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">MRP</p>
                  <p className="font-mono text-slate-900">{formatCurrency(viewMed.mrp)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Selling Price</p>
                  <p className="font-mono text-primary font-bold">{formatCurrency(viewMed.sellingPrice)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Unit</p>
                  <p className="text-slate-700">{viewMed.unit}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Units Per Pack</p>
                  <p className="font-mono text-slate-700">{Math.max(1, viewMed.unitsPerPack || 1)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">GST Percent</p>
                  <p className="text-slate-700">{viewMed.gstPercent}%</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Barcode</p>
                  <p className="font-mono text-slate-700">{viewMed.barcode || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Reorder Level</p>
                  <p className="font-mono text-slate-700">{viewMed.reorderLevel} Units</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Medicine"
        description="This will permanently remove the medicine from your inventory. This action cannot be undone."
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
