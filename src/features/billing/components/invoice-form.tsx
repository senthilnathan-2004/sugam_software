'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, IndianRupee, Check, ChevronsUpDown, ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, cn } from '@/lib/utils';
import type { Medicine } from '@/features/inventory/types/inventory.types';

interface InvoiceFormProps {
  medicines: Medicine[];
  prescribedMedicines?: any[];
  consultationDetails?: { diagnosis?: string; notes?: string } | null;
  onOpenCheckout: (payload: { items: any[]; subtotal: number; gstAmount: number; discount: number; total: number }) => void;
}

// Selling price is stored PER PACK (strip); billing quantity counts single
// units (tablets), so every line uses the derived per-unit rate. The server
// recomputes this authoritatively on checkout — this is display-side only.
const perUnitPrice = (m: Medicine) => {
  const pack = Math.max(1, m.unitsPerPack || 1);
  return Math.round((m.sellingPrice / pack + Number.EPSILON) * 100) / 100;
};

export function InvoiceForm({ medicines, prescribedMedicines, consultationDetails, onOpenCheckout }: InvoiceFormProps) {
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});
  
  const [barcodeInput, setBarcodeInput] = useState('');

  const { register, control, handleSubmit, setValue, watch, getValues } = useForm({
    defaultValues: {
      discount: '0',
      items: [{ medicineId: '', batchNo: 'B-MAIN', quantity: 1, price: 0, mrp: 0, gstPercent: 12, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchDiscount = watch('discount');

  // Auto-populate from prescriptions
  React.useEffect(() => {
    if (prescribedMedicines && prescribedMedicines.length > 0) {
      const newItems = prescribedMedicines.map((pm) => {
        // Find best match in inventory by name (case-insensitive)
        const match = medicines.find(
          (m) =>
            m.name.toLowerCase() === pm.name.toLowerCase() ||
            pm.name.toLowerCase().includes(m.name.toLowerCase()) ||
            m.name.toLowerCase().includes(pm.name.toLowerCase())
        );

        if (match) {
          const unitRate = perUnitPrice(match);
          return {
            medicineId: match.id,
            batchNo: 'B-MAIN',
            quantity: 1, // Default to 1, biller can adjust
            price: unitRate,
            mrp: match.mrp,
            gstPercent: match.gstPercent,
            total: unitRate,
          };
        }
        
        // No match found
        return {
          medicineId: '', // They must select manually
          batchNo: 'B-MAIN',
          quantity: 1,
          price: 0,
          mrp: 0,
          gstPercent: 12,
          total: 0,
          // We can't strictly attach a "note" to the field without updating the type, 
          // but we can just leave it blank. The biller will see the blank row.
        };
      });

      // Reset the form with these items if valid, or just replace the field array
      // To properly replace using react-hook-form:
      setValue('items', newItems.length > 0 ? newItems : [{ medicineId: '', batchNo: 'B-MAIN', quantity: 1, price: 0, mrp: 0, gstPercent: 12, total: 0 }]);
    }
  }, [prescribedMedicines, medicines, setValue]);

  // Math Calculations
  let subtotal = 0;
  let gstAmount = 0;

  watchItems.forEach((item) => {
    const qty = item.quantity || 0;
    const price = item.price || 0;
    const gstPercent = item.gstPercent || 0;

    const lineTotal = qty * price;
    const lineGst = lineTotal * (gstPercent / 100);

    subtotal += lineTotal;
    gstAmount += lineGst;
  });

  const discountVal = parseFloat(watchDiscount) || 0;
  const total = Math.max(0, subtotal + gstAmount - discountVal);

  const handleDrugSelect = (index: number, medId: string) => {
    const med = medicines.find((m) => m.id === medId);
    if (med) {
      const unitRate = perUnitPrice(med);
      setValue(`items.${index}.medicineId`, medId);
      setValue(`items.${index}.price`, unitRate);
      setValue(`items.${index}.mrp`, med.mrp);
      setValue(`items.${index}.gstPercent`, med.gstPercent);
      setValue(`items.${index}.total`, unitRate * watchItems[index].quantity);
    }
  };

  const handlePreCheckout = (values: any) => {
    const activeItems = values.items.filter((item: any) => item.medicineId).map((item: any) => {
      const med = medicines.find(m => m.id === item.medicineId);
      return {
        ...item,
        name: med ? med.name : 'Unknown Medicine',
      };
    });
    if (activeItems.length === 0) return;

    onOpenCheckout({
      items: activeItems,
      subtotal,
      gstAmount,
      discount: discountVal,
      total,
    });
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;

      const med = medicines.find(m => m.barcode === code);
      if (med) {
        const unitRate = perUnitPrice(med);
        // Check if already in cart
        const currentItems = getValues('items');
        const existingIdx = currentItems.findIndex(i => i.medicineId === med.id);

        if (existingIdx >= 0) {
          const newQty = (currentItems[existingIdx].quantity || 0) + 1;
          setValue(`items.${existingIdx}.quantity`, newQty);
          setValue(`items.${existingIdx}.total`, newQty * unitRate);
        } else {
          // If the first row is empty, use it. Otherwise append.
          if (currentItems.length === 1 && !currentItems[0].medicineId) {
             setValue('items.0', { medicineId: med.id, batchNo: 'B-MAIN', quantity: 1, price: unitRate, mrp: med.mrp, gstPercent: med.gstPercent, total: unitRate });
          } else {
             append({ medicineId: med.id, batchNo: 'B-MAIN', quantity: 1, price: unitRate, mrp: med.mrp, gstPercent: med.gstPercent, total: unitRate });
          }
        }
      } else {
        alert('Barcode not found in Medicine database.');
      }
      setBarcodeInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit(handlePreCheckout)} className="space-y-6">
      {/* Consultation & Prescription Details */}
      {consultationDetails && (
        <div className="bg-slate-50 p-6 rounded-hms border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Doctor's Consultation Notes & Prescription</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="uppercase font-bold text-slate-400 block mb-1 text-[10px]">Diagnosis</span>
              <p className="text-slate-700 font-medium">{consultationDetails.diagnosis || 'No diagnosis provided.'}</p>
            </div>
            <div>
              <span className="uppercase font-bold text-slate-400 block mb-1 text-[10px]">Notes</span>
              <p className="text-slate-700 italic">{consultationDetails.notes || 'No additional notes.'}</p>
            </div>
          </div>
          
          {prescribedMedicines && prescribedMedicines.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="uppercase font-bold text-slate-400 block mb-2 text-[10px]">Prescribed Medicines & Dosage</span>
              <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="px-3 py-2">Medicine Name</th>
                      <th className="px-3 py-2">Dosage</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {prescribedMedicines.map((med: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-bold">{med.name}</td>
                        <td className="px-3 py-2">{med.dosage || '-'}</td>
                        <td className="px-3 py-2">{med.duration || '-'}</td>
                        <td className="px-3 py-2 italic text-slate-500">{med.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bill Items list */}
      <div className="bg-white p-6 rounded-hms border border-slate-100 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 shrink-0">Bill Invoiced Items</h3>
            <div className="relative">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Scan Barcode & Press Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                className="h-9 w-64 pl-9 rounded-lg text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => append({ medicineId: '', batchNo: 'B-MAIN', quantity: 1, price: 0, mrp: 0, gstPercent: 12, total: 0 })}
            variant="outline"
            className="text-xs font-bold gap-1 h-9 border-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add Drug Row
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1">
                {index === 0 && <Label className="text-[10px] uppercase font-bold text-slate-500">Choose Medicine</Label>}
                <Popover open={openDropdowns[index] || false} onOpenChange={(val) => setOpenDropdowns((prev) => ({ ...prev, [index]: val }))}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openDropdowns[index] || false}
                      className="w-full justify-between h-10 rounded-lg text-xs font-normal px-3"
                    >
                      {watchItems[index]?.medicineId
                        ? (() => {
                            const m = medicines.find((x) => x.id === watchItems[index].medicineId);
                            return m ? `${m.name} (Qty: ${m.totalStock ?? 0})` : 'Select Medicine...';
                          })()
                        : "Select Medicine..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search medicine name..." />
                      <CommandList>
                        <CommandEmpty>No medicine found.</CommandEmpty>
                        <CommandGroup>
                          {medicines.map((m) => (
                            <CommandItem
                              key={m.id}
                              value={m.name}
                              onSelect={() => {
                                handleDrugSelect(index, m.id);
                                setOpenDropdowns((prev) => ({ ...prev, [index]: false }));
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchItems[index]?.medicineId === m.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {m.name} <span className="ml-auto text-[10px] text-slate-500">Qty: {m.totalStock ?? 0}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Batch No */}
              <div className="sm:col-span-2 space-y-1">
                {index === 0 && <Label className="text-[10px] uppercase font-bold text-slate-500">Batch No</Label>}
                <Input placeholder="B-MAIN" {...register(`items.${index}.batchNo`)} className="h-10 rounded-lg text-xs" />
              </div>

              {/* Price */}
              <div className="sm:col-span-2 space-y-1">
                {index === 0 && <Label className="text-[10px] uppercase font-bold text-slate-500">Price / Unit (₹)</Label>}
                <Input type="number" step="any" {...register(`items.${index}.price`)} className="h-10 rounded-lg text-xs" />
              </div>

              {/* Quantity */}
              <div className="sm:col-span-1 space-y-1">
                {index === 0 && <Label className="text-[10px] uppercase font-bold text-slate-500">Qty (Tablets/Units)</Label>}
                <Input type="number" {...register(`items.${index}.quantity`)} className="h-10 rounded-lg text-xs" />
              </div>

              {/* Line total */}
              <div className="sm:col-span-1 space-y-1 text-right">
                {index === 0 && <Label className="text-[10px] uppercase font-bold text-slate-500 block text-right">Total</Label>}
                <span className="text-xs font-mono font-bold leading-10">
                  {formatCurrency((watchItems[index]?.quantity ?? 0) * (watchItems[index]?.price ?? 0))}
                </span>
              </div>

              {/* Remove */}
              <div className="sm:col-span-1 text-right">
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  variant="ghost"
                  className="h-10 w-10 text-slate-400 hover:text-danger hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bill summary side details */}
      <div className="bg-white p-6 rounded-hms border border-slate-100 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-wrap gap-6 text-xs font-semibold text-slate-600">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Subtotal</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(subtotal)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">GST Tax</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(gstAmount)}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="discount" className="text-[10px] text-slate-400 font-bold uppercase block">Discount (₹)</Label>
            <Input id="discount" type="number" placeholder="0" {...register('discount')} className="h-9 w-24 rounded text-xs" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Net Payable Amount</span>
            <span className="font-mono font-extrabold text-primary text-base">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
        >
          <IndianRupee className="h-4 w-4" /> Settle bill checkout
        </Button>
      </div>
    </form>
  );
}
