'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PurchaseTable } from '@/features/inventory/components/purchase-table';
import { PurchaseForm } from '@/features/inventory/components/purchase-form';
import { useInventory } from '@/features/inventory/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function PurchasesPage() {
  const {
    purchases,
    suppliers,
    medicines,
    isLoading,
    fetchPurchases,
    fetchSuppliers,
    fetchMedicines,
    savePurchase,
    deletePurchase,
    updatePurchase,
  } = useInventory();

  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchMedicines();
  }, [fetchPurchases, fetchSuppliers, fetchMedicines]);

  const handleFormSubmit = async (data: any) => {
    let success = false;
    if (editingPurchase) {
      success = await updatePurchase(editingPurchase.id, data);
    } else {
      success = await savePurchase(data);
    }
    if (success) {
      setOpen(false);
      setEditingPurchase(null);
    }
    return success;
  };

  const handleEdit = (po: any) => {
    let parsedItems = [];
    try {
      parsedItems = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;
    } catch (e) {}
    setEditingPurchase({ ...po, items: parsedItems });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders Stock Inward"
        description="Log new batch shipments, monitor cost values, and update inventory units."
        actions={
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setEditingPurchase(null);
          }}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <Plus className="h-4 w-4" /> Log Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl bg-white border rounded-2xl shadow-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> {editingPurchase ? 'Edit Purchase Order' : 'Log Shipment Purchase Order'}
                </DialogTitle>
              </DialogHeader>
              <PurchaseForm
                key={editingPurchase?.id || 'new'}
                suppliers={suppliers}
                medicines={medicines}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                initialData={editingPurchase}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <PurchaseTable data={purchases} isLoading={isLoading} onDelete={deletePurchase} onEdit={handleEdit} />
    </div>
  );
}
