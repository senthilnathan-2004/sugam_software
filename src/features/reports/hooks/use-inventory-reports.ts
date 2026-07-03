'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const DEMO_DATA: {
  stockData: { name: string; stock: number }[];
  statusData: { name: string; value: number; color: string }[];
  movementData: { date: Date; type: string; reference: string; items: number; value: number }[];
} = {
  stockData: [],
  statusData: [],
  movementData: [],
};

export function useInventoryReports() {
  const [data, setData] = useState<typeof DEMO_DATA>(DEMO_DATA);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:reports:analytics');
        if (res?.success) {
          setData(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportInventoryReports = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:reports:export');
        if (res?.success) {
          toast.success(`Inventory Analytics exported to ${res.data}`);
        } else {
          toast.error(res?.error ?? 'Failed to export inventory analytics.');
        }
      } catch (e: any) {
        toast.error('Failed to export inventory analytics.');
      }
    }
    setIsLoading(false);
  };

  return {
    ...data,
    isLoading,
    refresh: fetchAnalytics,
    exportInventoryReports,
  };
}
