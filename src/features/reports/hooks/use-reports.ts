'use client';

import { useState, useCallback, useEffect } from 'react';

// Fallback demo reports data when running standalone web dev mode
const DEMO_REVENUE = {
  chartData: [],
  items: [],
  summary: {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    medicineSales: 0,
    totalDiscount: 0,
    totalGst: 0,
    invoiceCount: 0,
  },
};

const DEMO_PATIENTS = {
  chartData: [],
  summary: {
    newRegistrations: 0,
    totalVisits: 0,
  },
};

const DEMO_INVENTORY = {
  items: [],
  summary: {
    totalValuation: 0,
    totalStockItems: 0,
  },
};

const DEMO_DOCTORS = {
  chartData: [],
  items: [],
  summary: {
    totalDoctors: 0,
    totalConsultations: 0,
    totalRevenue: 0,
  },
};

async function safeInvoke<T>(channel: string, fallback: T, payload?: any): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const res = await window.electronAPI.invoke(channel, payload);
      if (res?.success) return res.data as T;
    } catch {}
  }
  return fallback;
}

export function useReports() {
  const [revenueData, setRevenueData] = useState<typeof DEMO_REVENUE>(DEMO_REVENUE);
  const [patientsData, setPatientsData] = useState<typeof DEMO_PATIENTS>(DEMO_PATIENTS);
  const [inventoryData, setInventoryData] = useState<typeof DEMO_INVENTORY>(DEMO_INVENTORY);
  const [doctorsData, setDoctorsData] = useState<typeof DEMO_DOCTORS>(DEMO_DOCTORS);
  const [isLoading, setIsLoading] = useState(false);

  // Date range states
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchRevenueReport = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke('reports:revenue', DEMO_REVENUE, { startDate, endDate });
    setRevenueData(data);
    setIsLoading(false);
  }, [startDate, endDate]);

  const fetchPatientsReport = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke('reports:patients', DEMO_PATIENTS, { startDate, endDate });
    setPatientsData(data);
    setIsLoading(false);
  }, [startDate, endDate]);

  const fetchInventoryReport = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke('reports:inventory', DEMO_INVENTORY);
    setInventoryData(data);
    setIsLoading(false);
  }, []);

  const fetchDoctorReport = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke('reports:doctors', DEMO_DOCTORS, { startDate, endDate });
    setDoctorsData(data);
    setIsLoading(false);
  }, [startDate, endDate]);

  return {
    revenueData,
    patientsData,
    inventoryData,
    doctorsData,
    isLoading,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    fetchRevenueReport,
    fetchPatientsReport,
    fetchInventoryReport,
    fetchDoctorReport,
  };
}
