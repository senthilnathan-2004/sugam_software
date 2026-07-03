'use client';

import React from 'react';
import {
  Users, IndianRupee, Package, AlertTriangle, CalendarCheck, ReceiptText,
} from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import { formatCurrency } from '@/lib/utils';

interface KpiGridProps {
  stats: {
    todayPatients: number;
    todayIncome: number;
    pendingBills: number;
    todayAppointments: number;
    totalStock: number;
    lowStock: number;
  };
  isLoading: boolean;
}

export function KpiGrid({ stats, isLoading }: KpiGridProps) {
  const cards = [
    {
      title: "Today's Patients",
      value: isLoading ? '...' : stats.todayPatients.toString(),
      icon: Users,
      description: 'Appointments scheduled for today',
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Today's Income",
      value: isLoading ? '...' : formatCurrency(stats.todayIncome),
      icon: IndianRupee,
      description: 'Revenue collected today',
      trend: { value: 8, isPositive: true },
    },
    {
      title: 'Medicine Stock',
      value: isLoading ? '...' : stats.totalStock.toLocaleString('en-IN'),
      icon: Package,
      description: 'Total units across all batches',
    },
    {
      title: 'Low Stock Alerts',
      value: isLoading ? '...' : stats.lowStock.toString(),
      icon: AlertTriangle,
      description: 'Items below reorder level',
      trend: stats.lowStock > 0 ? { value: stats.lowStock, isPositive: false } : undefined,
    },
    {
      title: "Today's Appointments",
      value: isLoading ? '...' : stats.todayAppointments.toString(),
      icon: CalendarCheck,
      description: 'Pending appointments for today',
    },
    {
      title: 'Pending Bills',
      value: isLoading ? '...' : stats.pendingBills.toString(),
      icon: ReceiptText,
      description: 'Unpaid invoices requiring action',
      trend: stats.pendingBills > 0 ? { value: stats.pendingBills, isPositive: false } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          description={card.description}
          icon={card.icon}
          trend={card.trend}
        />
      ))}
    </div>
  );
}
