'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import { TodayAppointments } from '@/features/dashboard/components/today-appointments';
import { RecentPatients } from '@/features/dashboard/components/recent-patients';
import { QuickActions } from '@/features/dashboard/components/quick-actions';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { NotificationsWidget } from '@/features/dashboard/components/notifications-widget';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';

// Charts pull in recharts (a large charting lib). Load them lazily so the
// dashboard's first paint (KPIs + widgets) isn't blocked on recharts; a
// placeholder holds the layout until each chart's chunk arrives.
const ChartFallback = () => <div className="h-72 w-full animate-pulse rounded-hms bg-slate-100" />;
const RevenueChart = dynamic(
  () => import('@/features/dashboard/components/revenue-chart').then((m) => m.RevenueChart),
  { ssr: false, loading: ChartFallback }
);
const MedicineSalesChart = dynamic(
  () => import('@/features/dashboard/components/medicine-sales-chart').then((m) => m.MedicineSalesChart),
  { ssr: false, loading: ChartFallback }
);
const PatientChart = dynamic(
  () => import('@/features/dashboard/components/patient-chart').then((m) => m.PatientChart),
  { ssr: false, loading: ChartFallback }
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, monthly, appointments, recentPatients, activities, dashboardNotifications, isLoading, refresh } =
    useDashboard();

  const [today, setToday] = useState<string>('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        description={today}
        actions={
          <Button
            onClick={refresh}
            disabled={isLoading}
            variant="outline"
            aria-label="Refresh dashboard data"
            className="h-9 px-4 text-xs font-bold gap-2 border-slate-200 rounded-xl bg-white hover:bg-slate-50 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <section aria-label="Key performance indicators">
        <KpiGrid stats={stats} isLoading={isLoading} />
      </section>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <section aria-label="Revenue and patient charts">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <RevenueChart data={monthly} />
          </div>
          <div>
            <MedicineSalesChart data={monthly} />
          </div>
          <div>
            <PatientChart data={monthly} />
          </div>
        </div>
      </section>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      {user?.role === 'ADMIN' && (
        <section aria-label="Quick action shortcuts">
          <QuickActions />
        </section>
      )}

      {/* ── Detail Widgets ────────────────────────────────────────── */}
      <section aria-label="Appointments, patients and activity feed">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TodayAppointments appointments={appointments} isLoading={isLoading} />
          <RecentPatients patients={recentPatients} isLoading={isLoading} />
          <NotificationsWidget notifications={dashboardNotifications} isLoading={isLoading} />
          <ActivityFeed activities={activities} isLoading={isLoading} />
        </div>
      </section>

    </div>
  );
}
