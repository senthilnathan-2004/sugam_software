'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordChangeProps {
  userId: string;
  onPasswordChange: (userId: string, data: ChangePasswordFormValues) => Promise<boolean>;
  isLoading: boolean;
}

export function PasswordChange({ userId, onPasswordChange, isLoading }: PasswordChangeProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema) as any,
  });

  const onSubmitForm = async (data: ChangePasswordFormValues) => {
    const success = await onPasswordChange(userId, data);
    if (success) {
      reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <div className="border-b pb-2.5 flex items-center gap-2 text-slate-800">
        <KeyRound className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold">Change Password</h3>
      </div>

      <div className="space-y-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword font-bold">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            placeholder="••••••••"
            {...register('currentPassword')}
            className={cn('h-11 rounded-xl', errors.currentPassword && 'border-danger')}
          />
          {errors.currentPassword && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword font-bold">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            {...register('newPassword')}
            className={cn('h-11 rounded-xl', errors.newPassword && 'border-danger')}
          />
          {errors.newPassword && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword font-bold">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            className={cn('h-11 rounded-xl', errors.confirmPassword && 'border-danger')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Security Password
      </Button>
    </form>
  );
}
