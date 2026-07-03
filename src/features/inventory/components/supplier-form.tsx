'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SupplierFormProps {
  onSubmit: (data: any) => Promise<boolean>;
  isLoading: boolean;
  initialData?: any;
}

export function SupplierForm({ onSubmit, isLoading, initialData }: SupplierFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: initialData || {
      name: '',
      contact: '',
      email: '',
      address: '',
      gstNo: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white p-6 rounded-hms border border-slate-100 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Supplier Name */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Supplier Company Name</Label>
          <Input id="sup-name" placeholder="e.g. Apollo Wholesale Pvt Ltd" {...register('name', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Contact Person */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-contact" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Person & Phone</Label>
          <Input id="sup-contact" placeholder="e.g. Suresh Kumar (9876543210)" {...register('contact', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
          <Input id="sup-email" type="email" placeholder="sales@apollo.com" {...register('email', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* GST No */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-gst" className="text-xs font-bold text-slate-700 uppercase tracking-wider">GST Number</Label>
          <Input id="sup-gst" placeholder="e.g. 33AABCU9603R1ZM" {...register('gstNo', { required: true })} className="h-11 rounded-xl" />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="sup-address" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Office Address</Label>
        <Input id="sup-address" placeholder="12, Trade Street, Sector 5..." {...register('address', { required: true })} className="h-11 rounded-xl" />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Supplier Profile
      </Button>
    </form>
  );
}
