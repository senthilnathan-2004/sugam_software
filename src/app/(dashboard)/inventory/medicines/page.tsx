'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { MedicineTable } from '@/features/inventory/components/medicine-table';
import { MedicineForm } from '@/features/inventory/components/medicine-form';
import { useInventory } from '@/features/inventory/hooks/use-inventory';
import { ExcelImportExport } from '@/features/inventory/components/excel-import-export';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';

export default function MedicinesPage() {
  const { hasPermission } = useAuthStore();
  const {
    medicines,
    categories,
    suppliers,
    isLoading,
    fetchMedicines,
    fetchCategories,
    fetchSuppliers,
    saveMedicine,
    saveMedicinesBulk,
    deleteMedicine,
    updateMedicine,
  } = useInventory();

  const [open, setOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
    fetchSuppliers();
  }, [fetchMedicines, fetchCategories, fetchSuppliers]);

  const handleFormSubmit = async (data: any) => {
    let success = false;
    if (editingMedicine) {
      success = await updateMedicine(editingMedicine.id, data);
    } else {
      success = await saveMedicine(data);
    }
    if (success) {
      setOpen(false);
      setEditingMedicine(null);
    }
    return success;
  };

  const handleEdit = (medicine: any) => {
    setEditingMedicine(medicine);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines Master List"
        description="Maintain pharmacy catalog, unit metrics, retail prices and reorder levels."
        actions={
          <div className="flex items-center gap-3">
            {hasPermission('inventory:write') && (
              <>
                <ExcelImportExport 
                  dataToExport={medicines}
                  exportFileName="Medicines_Master"
                  onImport={saveMedicinesBulk}
                />
                <Dialog open={open} onOpenChange={(val) => {
                  setOpen(val);
                  if (!val) setEditingMedicine(null);
                }}>
                  <DialogTrigger asChild>
                    <Button className="h-9 bg-primary hover:bg-primary-light text-white font-bold rounded-lg flex items-center gap-1.5 shadow">
                      <Plus className="h-4 w-4" /> Add Medicine
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border rounded-2xl shadow-2xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" /> {editingMedicine ? 'Edit Medicine Item' : 'Register New Medicine Item'}
                      </DialogTitle>
                    </DialogHeader>
                    <MedicineForm
                      key={editingMedicine?.id || 'new'}
                      categories={categories}
                      suppliers={suppliers}
                      onSubmit={handleFormSubmit}
                      isLoading={isLoading}
                      initialData={editingMedicine}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        }
      />

      <MedicineTable data={medicines} isLoading={isLoading} onDelete={deleteMedicine} onEdit={handleEdit} />
    </div>
  );
}
