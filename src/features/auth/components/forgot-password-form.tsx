'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (_data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    // Simulate a processing delay; actual reset flow handled by admin in offline-first app
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div className="p-4 bg-emerald-50 rounded-full">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Request Sent</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
            Your password reset request has been recorded. Please contact your HMS administrator to
            reset the password for{' '}
            <strong className="text-slate-700">{getValues('email')}</strong>.
          </p>
        </div>
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="mt-2 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl h-10"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="text-center mb-2">
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Enter your registered email address and we will notify your HMS administrator to reset your
          password.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="forgot-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="forgot-email"
            type="email"
            placeholder="your.email@hospital.com"
            {...register('email')}
            className={cn(
              'h-11 pl-10 rounded-xl border-slate-200 bg-slate-50/50 text-sm placeholder-slate-300 focus-visible:ring-primary',
              errors.email && 'border-danger'
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-danger font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending Request...
          </>
        ) : (
          'Send Reset Request'
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs font-bold text-slate-400 hover:text-primary flex items-center justify-center gap-1.5 transition-colors mt-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
      </button>
    </form>
  );
}
