'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SystemSettingsProps {
  initialValues: Record<string, string>;
  onSubmit: (data: Record<string, string>) => Promise<boolean>;
  isLoading: boolean;
}

export function SystemSettings({ initialValues, onSubmit, isLoading }: SystemSettingsProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      hospital_name: initialValues.hospital_name || '',
      hospital_phone: initialValues.hospital_phone || '',
      hospital_address: initialValues.hospital_address || '',
      gst_number: initialValues.gst_number || '',
    },
  });

  // react-hook-form captures defaultValues once at mount — when the parent's
  // settings state is still the hardcoded demo constant (the async fetch has
  // not resolved yet). Without this reset the form permanently shows demo
  // hospital name/phone/address/GSTIN, and saving overwrites the real persisted
  // values. Re-sync whenever the fetched settings arrive/change.
  React.useEffect(() => {
    reset({
      hospital_name: initialValues.hospital_name || '',
      hospital_phone: initialValues.hospital_phone || '',
      hospital_address: initialValues.hospital_address || '',
      gst_number: initialValues.gst_number || '',
    });
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white p-6 rounded-hms border border-slate-100 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Hospital Name */}
        <div className="space-y-1.5">
          <Label htmlFor="hosp-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Name</Label>
          <Input id="hosp-name" {...register('hospital_name', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Hospital Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="hosp-phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Phone</Label>
          <Input id="hosp-phone" {...register('hospital_phone', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* GST Number */}
        <div className="space-y-1.5">
          <Label htmlFor="hosp-gst" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital GSTIN</Label>
          <Input id="hosp-gst" {...register('gst_number', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Hospital Address */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="hosp-address" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Address</Label>
          <Input id="hosp-address" {...register('hospital_address', { required: true })} className="h-11 rounded-xl" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Settings Profile
      </Button>
    </form>
  );
}
