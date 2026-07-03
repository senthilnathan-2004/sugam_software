'use client';

import React, { useState } from 'react';
import { Activity, Shield, Users, Stethoscope } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/login-form';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

type AuthView = 'login' | 'forgot-password';

const FEATURE_HIGHLIGHTS = [
  { icon: Users, label: 'Patient Management', desc: 'Complete patient records and history' },
  { icon: Stethoscope, label: 'Doctor Workflow', desc: 'Prescriptions, consultations & labs' },
  { icon: Activity, label: 'Real-time Reports', desc: 'Revenue, inventory and analytics' },
  { icon: Shield, label: 'Offline-First & Secure', desc: 'Works without internet, always' },
];

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
      {/* Left Panel — Branding */}
      <div className="hidden md:flex flex-col justify-between bg-sidebar p-10 text-white">
        {/* Logo & App Name */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
            S
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">Sugam HMS</p>
            <p className="text-slate-400 text-xs font-semibold">Hospital Management System</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold leading-tight text-white">
            Healthcare Management,{' '}
            <span className="text-secondary">Simplified.</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            A complete offline-first desktop system for hospitals — patients, doctors, billing,
            inventory, and reports — all in one place.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 gap-3">
          {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="p-2 bg-slate-700/60 rounded-lg shrink-0">
                <Icon className="h-4 w-4 text-secondary stroke-[1.75]" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{label}</p>
                <p className="text-[11px] text-slate-400 font-medium">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-600 font-semibold">
          © {new Date().getFullYear()} Sugam HMS · Offline-First Desktop Application
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="bg-white flex flex-col justify-center p-10">
        {/* Mobile Logo (visible on small screens) */}
        <div className="flex items-center gap-2.5 mb-8 md:hidden">
          <div className="h-8 w-8 bg-secondary rounded-lg flex items-center justify-center font-bold text-white">
            S
          </div>
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

        {/* Default Credentials Hint (Development Only) */}
        <div className="mt-8 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Default Credentials
          </p>
          <div className="space-y-0.5">
            {[
              { role: 'Admin', email: 'admin@sugamhms.com', password: 'Admin@123' },
              { role: 'Doctor', email: 'doctor@sugamhms.com', password: 'Doctor@123' },
              { role: 'Billing', email: 'billing@sugamhms.com', password: 'Billing@123' },
              { role: 'Reception', email: 'reception@sugamhms.com', password: 'Reception@123' },
            ].map((c) => (
              <p key={c.role} className="text-[11px] text-slate-500 font-mono">
                <span className="text-slate-700 font-bold not-italic font-sans">{c.role}:</span>{' '}
                {c.email} · {c.password}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
