'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2, Pencil } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import type { Supplier } from '../types/inventory.types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

interface SupplierTableProps {
  data: Supplier[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (supplier: Supplier) => void;
}

export function SupplierTable({ data, isLoading, onDelete, onEdit }: SupplierTableProps) {
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'name',
      header: 'Supplier Name',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'contact',
      header: 'Contact Person',
      cell: ({ row }) => <span>{row.getValue('contact')}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email Address',
      cell: ({ row }) => <span>{row.getValue('email') || <span className="text-slate-400">—</span>}</span>,
    },
    {
      accessorKey: 'gstNo',
      header: 'GST Number',
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('gstNo')}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setViewSupplier(supplier)}>
              <Eye className="h-4 w-4 text-blue-500" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)}>
                <Pencil className="h-4 w-4 text-emerald-500" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(supplier.id)}>
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
      
      <Dialog open={!!viewSupplier} onOpenChange={(open) => !open && setViewSupplier(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Supplier Details</DialogTitle>
          </DialogHeader>
          {viewSupplier && (
            <div className="space-y-4 text-sm mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Name</p>
                  <p className="font-medium text-slate-900">{viewSupplier.name}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Contact</p>
                  <p className="text-slate-700">{viewSupplier.contact}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Email</p>
                  <p className="text-slate-700">{viewSupplier.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">GST Number</p>
                  <p className="font-mono text-slate-900">{viewSupplier.gstNo}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-slate-500 uppercase text-xs tracking-wider">Address</p>
                  <p className="text-slate-700">{viewSupplier.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Supplier"
        description="This will permanently remove the supplier from your records. This action cannot be undone."
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
