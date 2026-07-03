'use client';

import { useEffect, useState, useCallback } from 'react';

interface DashboardStats {
  todayPatients: number;
  todayIncome: number;
  pendingBills: number;
  todayAppointments: number;
  totalStock: number;
  lowStock: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  patients: number;
  medicineSales: number;
}

interface RecentPatient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  createdAt: string;
}

interface TodayAppointment {
  id: string;
  time: string;
  status: string;
  type: string;
  patient: { name: string; patientId: string; phone: string };
}

interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  timestamp: string;
  user: { name: string; role: string };
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS';
  createdAt: string;
}

// Demo fallback data when Electron IPC is unavailable (web browser dev mode)
const DEMO_STATS: DashboardStats = {
  todayPatients: 0,
  todayIncome: 0,
  pendingBills: 0,
  todayAppointments: 0,
  totalStock: 0,
  lowStock: 0,
};

const DEMO_MONTHLY: MonthlyData[] = [];
const DEMO_APPOINTMENTS: TodayAppointment[] = [];
const DEMO_PATIENTS: RecentPatient[] = [];
const DEMO_ACTIVITIES: ActivityLog[] = [];
const DEMO_NOTIFICATIONS: DashboardNotification[] = [];

async function ipcInvoke<T>(channel: string, fallback: T): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const res = await window.electronAPI.invoke(channel);
      if (res?.success) return res.data as T;
    } catch {}
  }
  return fallback;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>(DEMO_STATS);
  const [monthly, setMonthly] = useState<MonthlyData[]>(DEMO_MONTHLY);
  const [appointments, setAppointments] = useState<TodayAppointment[]>(DEMO_APPOINTMENTS);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>(DEMO_PATIENTS);
  const [activities, setActivities] = useState<ActivityLog[]>(DEMO_ACTIVITIES);
  const [dashboardNotifications, setDashboardNotifications] = useState<DashboardNotification[]>(DEMO_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [s, m, a, p, act, notifs] = await Promise.all([
      ipcInvoke<DashboardStats>('dashboard:stats', DEMO_STATS),
      ipcInvoke<MonthlyData[]>('dashboard:monthly-revenue', DEMO_MONTHLY),
      ipcInvoke<TodayAppointment[]>('dashboard:today-appointments', DEMO_APPOINTMENTS),
      ipcInvoke<RecentPatient[]>('dashboard:recent-patients', DEMO_PATIENTS),
      ipcInvoke<ActivityLog[]>('dashboard:activities', DEMO_ACTIVITIES),
      ipcInvoke<DashboardNotification[]>('dashboard:notifications', DEMO_NOTIFICATIONS),
    ]);
    setStats(s);
    setMonthly(m);
    setAppointments(a);
    setRecentPatients(p);
    setActivities(act);
    setDashboardNotifications(notifs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, monthly, appointments, recentPatients, activities, dashboardNotifications, isLoading, refresh };
}
