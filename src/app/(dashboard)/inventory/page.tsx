'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, Users, Receipt, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { StockAlerts } from '@/features/inventory/components/stock-alerts';
import { useInventory } from '@/features/inventory/hooks/use-inventory';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InventoryDashboardPage() {
  const { alerts, fetchAlerts } = useInventory();
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const quickLinks = [
    { label: 'Medicines Master', href: '/inventory/medicines', icon: Package },
    ...(hasPermission('inventory:write') ? [
      { label: 'Supplier Directory', href: '/inventory/suppliers', icon: Users },
      { label: 'Purchase Order', href: '/inventory/purchases', icon: Receipt },
    ] : []),
    { label: 'Inventory Reports', href: '/inventory/reports', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Inventory Control"
        description="Monitor drug formulations, low stock reorder level warnings, and expiries."
      />

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.label} href={link.href}>
              <Button className="w-full h-14 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all text-sm">
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Expiry warnings */}
      <StockAlerts alerts={alerts} />
    </div>
  );
}
