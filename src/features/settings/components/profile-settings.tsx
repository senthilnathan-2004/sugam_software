'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ProfileSettingsProps {
  user: { id: string; name: string; email: string; role: string };
  onSubmit: (data: any) => Promise<boolean>;
  isLoading: boolean;
}

export function ProfileSettings({ user, onSubmit, isLoading }: ProfileSettingsProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="border-b pb-2.5 flex items-center gap-2 text-slate-800">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold">Personal Profile Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="prof-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</Label>
          <Input id="prof-name" {...register('name', { required: true })} className="h-11 rounded-xl" />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <Label htmlFor="prof-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
          <Input id="prof-email" type="email" {...register('email', { required: true })} className="h-11 rounded-xl" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
      </Button>
    </form>
  );
}
