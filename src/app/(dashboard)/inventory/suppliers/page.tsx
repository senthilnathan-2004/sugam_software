'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SupplierTable } from '@/features/inventory/components/supplier-table';
import { SupplierForm } from '@/features/inventory/components/supplier-form';
import { useInventory } from '@/features/inventory/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function SuppliersPage() {
  const { suppliers, isLoading, fetchSuppliers, saveSupplier, deleteSupplier, updateSupplier } = useInventory();
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleFormSubmit = async (data: any) => {
    let success = false;
    if (editingSupplier) {
      success = await updateSupplier(editingSupplier.id, data);
    } else {
      success = await saveSupplier(data);
    }
    if (success) {
      setOpen(false);
      setEditingSupplier(null);
    }
    return success;
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers Directory"
        description="Maintain authorized wholesale drug distributors and company contact details."
        actions={
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setEditingSupplier(null);
          }}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <Plus className="h-4 w-4" /> Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl bg-white border rounded-2xl shadow-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> {editingSupplier ? 'Edit Supplier Vendor' : 'Register New Supplier Vendor'}
                </DialogTitle>
              </DialogHeader>
              <SupplierForm 
                key={editingSupplier?.id || 'new'} 
                onSubmit={handleFormSubmit} 
                isLoading={isLoading} 
                initialData={editingSupplier} 
              />
            </DialogContent>
          </Dialog>
        }
      />

      <SupplierTable data={suppliers} isLoading={isLoading} onDelete={deleteSupplier} onEdit={handleEdit} />
    </div>
  );
}
