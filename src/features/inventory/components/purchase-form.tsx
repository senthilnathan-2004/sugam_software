'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Supplier, Medicine } from '../types/inventory.types';

interface PurchaseFormProps {
  suppliers: Supplier[];
  medicines: Medicine[];
  onSubmit: (data: any) => Promise<boolean>;
  isLoading: boolean;
  initialData?: any;
}

export function PurchaseForm({ suppliers, medicines, onSubmit, isLoading, initialData }: PurchaseFormProps) {
  const { register, control, handleSubmit, setValue, watch } = useForm({
    defaultValues: initialData || {
      supplierId: '',
      invoiceNo: '',
      items: [{ medicineId: '', batchNo: '', mfgDate: '', expiryDate: '', quantity: '100', purchasePrice: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const handleSave = async (values: any) => {
    // Basic aggregation
    let subtotal = 0;
    const items = values.items.map((i: any) => {
      const qty = parseInt(i.quantity) || 0;
      const price = parseFloat(i.purchasePrice) || 0;
      subtotal += qty * price;
      return i;
    });

    const gstAmount = subtotal * 0.12; // Flat 12% GST simulation
    const total = subtotal + gstAmount;

    const payload = {
      supplierId: values.supplierId,
      invoiceNo: values.invoiceNo,
      items,
      subtotal,
      gstAmount,
      total,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <div className="bg-white p-6 rounded-hms border border-slate-100 shadow-md grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Supplier */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Vendor Supplier</Label>
          <Select onValueChange={(v) => setValue('supplierId', v)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Choose Supplier" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice Number */}
        <div className="space-y-1.5">
          <Label htmlFor="invoiceNo" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase Invoice Ref #</Label>
          <Input id="invoiceNo" placeholder="e.g. Apollo/IN-982" {...register('invoiceNo', { required: true })} className="h-11 rounded-xl" />
        </div>
      </div>

      {/* Dynamic Item details */}
      <div className="bg-white p-6 rounded-hms border border-slate-100 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-slate-800">Shipment Items (Batches)</h3>
          <Button
            type="button"
            onClick={() => append({ medicineId: '', batchNo: '', mfgDate: '', expiryDate: '', quantity: '100', purchasePrice: '' })}
            variant="outline"
            className="text-xs font-bold gap-1 h-9 border-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add Batch Item
          </Button>
        </div>

        <div className="space-y-4 mt-4">
          {fields.map((field, index) => (
            <div key={field.id} className="relative bg-slate-50/50 border border-slate-100 rounded-xl p-4 group hover:bg-slate-50 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Medicine Dropdown */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Medicine</Label>
                  <Select onValueChange={(v) => setValue(`items.${index}.medicineId`, v)}>
                    <SelectTrigger className="h-10 rounded-lg text-xs bg-white">
                      <SelectValue placeholder="Choose Drug" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border">
                      {medicines.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch No */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Batch No</Label>
                  <Input placeholder="B-9982" {...register(`items.${index}.batchNo`, { required: true })} className="h-10 rounded-lg text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Mfg Date */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Mfg Date</Label>
                  <Input type="date" {...register(`items.${index}.mfgDate`, { required: true })} className="h-10 rounded-lg text-xs bg-white" />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Expiry Date</Label>
                  <Input type="date" {...register(`items.${index}.expiryDate`, { required: true })} className="h-10 rounded-lg text-xs bg-white" />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Qty</Label>
                  <Input type="number" {...register(`items.${index}.quantity`, { required: true })} className="h-10 rounded-lg text-xs bg-white" />
                </div>

                {/* Purchase Price */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Cost (₹)</Label>
                  <Input placeholder="0" {...register(`items.${index}.purchasePrice`, { required: true })} className="h-10 rounded-lg text-xs bg-white" />
                </div>
              </div>

              {/* Remove */}
              <Button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                variant="destructive"
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Log Shipment Purchase
      </Button>
    </form>
  );
}
