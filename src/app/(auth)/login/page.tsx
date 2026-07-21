'use client';

import React, { useState } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

type AuthView = 'login' | 'forgot-password';

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
      {/* Left Panel — Branding (simple: centered logo + name) */}
      <div className="hidden md:flex flex-col items-center justify-center gap-6 bg-sidebar p-10 text-white text-center">
        <div className="h-32 w-32 bg-white rounded-3xl flex items-center justify-center shadow-xl p-4">
          <img src="/logo.png" alt="Sugam HMS" className="h-full w-full object-contain" />
        </div>
        <div className="space-y-1.5">
          <p className="font-extrabold text-white text-3xl leading-tight tracking-tight">Sugam HMS</p>
          <p className="text-slate-400 text-sm font-semibold">Hospital Management System</p>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="bg-white flex flex-col justify-center p-10">
        {/* Mobile Logo (visible on small screens) */}
        <div className="flex items-center gap-2.5 mb-8 md:hidden">
          <img src="/logo.png" alt="Sugam HMS" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-extrabold text-slate-900">Sugam HMS</span>
        </div>

        {/* Form Header */}
        <div className="mb-8">
          {view === 'login' ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign In
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Enter your credentials to access the HMS dashboard.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Reset Password
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1">
                We&apos;ll help you get back in.
              </p>
            </>
          )}
        </div>

        {/* Dynamic Form Content */}
        {view === 'login' ? (
          <LoginForm />
        ) : (
          <ForgotPasswordForm onBack={() => setView('login')} />
        )}
      </div>
    </div>
  );
}
