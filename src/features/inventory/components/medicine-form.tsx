'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MedicineCategory, Supplier } from '../types/inventory.types';

interface MedicineFormProps {
  categories: MedicineCategory[];
  suppliers: Supplier[];
  onSubmit: (data: any) => Promise<boolean>;
  isLoading: boolean;
  initialData?: any;
}

export function MedicineForm({ categories, suppliers, onSubmit, isLoading, initialData }: MedicineFormProps) {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: initialData || {
      name: '',
      genericName: '',
      categoryId: '',
      supplierId: '',
      barcode: '',
      mrp: '',
      sellingPrice: '',
      gstPercent: '0',
      unit: 'STRIP',
      unitsPerPack: '1',
      reorderLevel: '10',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white p-6 rounded-hms border border-slate-100 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Brand Name */}
        <div className="space-y-1.5">
          <Label htmlFor="med-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Medicine Name (Brand)</Label>
          <Input id="med-name" placeholder="e.g. Paracetamol 650mg" {...register('name', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Generic Name */}
        <div className="space-y-1.5">
          <Label htmlFor="med-generic" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Generic formulation</Label>
          <Input id="med-generic" placeholder="e.g. Acetaminophen" {...register('genericName', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Category Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</Label>
          <Input id="category" placeholder="e.g. Antibiotics" {...register('categoryId', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Supplier Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Supplier</Label>
          <Select onValueChange={(v) => setValue('supplierId', v)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select Supplier" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unit Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Unit Type</Label>
          <Select defaultValue="STRIP" onValueChange={(v) => setValue('unit', v)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select Unit" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              <SelectItem value="TABLET">Tablet</SelectItem>
              <SelectItem value="STRIP">Strip</SelectItem>
              <SelectItem value="BOTTLE">Bottle</SelectItem>
              <SelectItem value="BOX">Box</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Units per Pack */}
        <div className="space-y-1.5">
          <Label htmlFor="unitsPerPack" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Units Per Pack / Strip</Label>
          <Input
            id="unitsPerPack"
            type="number"
            min={1}
            placeholder="e.g. 15 tablets per strip"
            {...register('unitsPerPack', { required: true, min: 1 })}
            className="h-11 rounded-xl"
          />
          <p className="text-[10px] text-slate-400 font-medium">
            Tablets in one strip. Stock and billing count single tablets; selling price below is per full strip. Use 1 for items sold whole (bottle, box).
          </p>
        </div>

        {/* Barcode */}
        <div className="space-y-1.5">
          <Label htmlFor="barcode" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Barcode / EAN</Label>
          <div className="flex gap-2">
            <Input id="barcode" placeholder="e.g. 8901234567890" {...register('barcode')} className="h-11 rounded-xl" />
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4 text-xs font-bold shrink-0 rounded-xl"
              onClick={() => setValue('barcode', Math.floor(1000000000000 + Math.random() * 9000000000000).toString())}
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Prices */}
        <div className="space-y-1.5">
          <Label htmlFor="mrp" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Maximum Retail Price (MRP)</Label>
          <Input id="mrp" placeholder="0.00" {...register('mrp', { required: true })} className="h-11 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sellingPrice" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Selling Price (Per Pack/Strip)</Label>
          <Input id="sellingPrice" placeholder="0.00" {...register('sellingPrice', { required: true })} className="h-11 rounded-xl" />
          <p className="text-[10px] text-slate-400 font-medium">
            Loose tablets are billed pro-rata: strip price ÷ units per pack.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gstPercent" className="text-xs font-bold text-slate-700 uppercase tracking-wider">GST Slab (%)</Label>
          <Select defaultValue="0" onValueChange={(v) => setValue('gstPercent', v)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select GST Slab" />
            </SelectTrigger>
            <SelectContent className="bg-white border">
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reorderLevel" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reorder Warning Threshold (Single Units/Tablets)</Label>
          <Input id="reorderLevel" placeholder="10" {...register('reorderLevel', { required: true })} className="h-11 rounded-xl" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Medicine Item
      </Button>
    </form>
  );
}
