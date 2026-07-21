'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function LoginForm() {
  const { handleLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError('');
    setIsSubmitting(true);
    const result = await handleLogin(data as LoginFormValues);
    setIsSubmitting(false);
    if (!result.success && result.error) {
      setServerError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Server Error Banner */}
      {serverError && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">{serverError}</p>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@sugamhms.com"
          {...register('email')}
          className={cn(
            'h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm placeholder-slate-300 focus-visible:ring-primary focus-visible:border-primary transition-colors',
            errors.email && 'border-danger focus-visible:ring-danger'
          )}
        />
        {errors.email && (
          <p className="text-xs text-danger font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className={cn(
              'h-11 pr-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm placeholder-slate-300 focus-visible:ring-primary focus-visible:border-primary transition-colors',
              errors.password && 'border-danger focus-visible:ring-danger'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-danger font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember Me + Forgot Password Row */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="h-4 w-4 rounded border-slate-300 text-primary accent-primary cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
            Remember me
          </span>
        </label>
        <button
          type="button"
          className="text-xs font-bold text-primary hover:text-primary-light transition-colors hover:underline"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-sm tracking-wide transition-all duration-150 shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 mt-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Sign In to Sugam HMS
          </>
        )}
      </Button>

      {/* Multi-PC deployment: configure this computer or connect it to the Main
          computer. Reachable pre-login so a not-yet-paired Client isn't stuck. */}
      <div className="text-center pt-1">
        <Link
          href="/setup"
          className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors hover:underline"
        >
          Multi-PC setup — configure or connect this computer
        </Link>
      </div>
    </form>
  );
}
