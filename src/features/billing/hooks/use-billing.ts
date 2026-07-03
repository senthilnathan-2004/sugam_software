'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Invoice } from '../types/billing.types';

// Fallback demo billing data when running standalone web dev mode
const DEMO_INVOICES: Invoice[] = [];

export function useBilling() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:invoice:list');
        if (res?.success) {
          setInvoices(res.data);
        }
      } catch {
        setInvoices(DEMO_INVOICES);
      }
    } else {
      setInvoices(DEMO_INVOICES);
    }
    setIsLoading(false);
  }, []);

  const saveInvoice = async (data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:invoice:create', data);
        if (res?.success) {
          toast.success('Invoice generated successfully!');
          fetchInvoices();
          return { success: true, data: res.data };
        } else {
          toast.error(res?.error ?? 'Failed to create invoice.');
          return { success: false };
        }
      } catch {
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Invoice created successfully (Demo Mode)!');
    setIsLoading(false);
    return { success: true, data: DEMO_INVOICES[0] };
  };

  const returnInvoice = async (payload: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:invoice:return', payload);
        if (res?.success) {
          toast.success('Invoice items returned successfully.');
          fetchInvoices();
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to return invoice items.');
          return false;
        }
      } catch {
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Invoice items returned (Demo Mode).');
    setIsLoading(false);
    return true;
  };

  const [prescribedMedicines, setPrescribedMedicines] = useState<any[]>([]);
  const [consultationDetails, setConsultationDetails] = useState<{ diagnosis?: string; notes?: string } | null>(null);

  const fetchPatientPrescriptions = useCallback(async (patientId: string) => {
    if (!patientId) {
      setPrescribedMedicines([]);
      setConsultationDetails(null);
      return;
    }
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:patient:prescriptions', patientId);
        if (res?.success) {
          setPrescribedMedicines(res.data.medicines || []);
          setConsultationDetails({ diagnosis: res.data.diagnosis, notes: res.data.notes });
        } else {
          toast.info(res?.error || 'No prescription available for this visit.');
          setPrescribedMedicines([]);
          setConsultationDetails(null);
        }
      } catch {
        setPrescribedMedicines([]);
        setConsultationDetails(null);
      }
    }
    setIsLoading(false);
  }, []);

  const exportInvoices = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:export');
        if (res?.success) {
          toast.success(`Sales logs exported successfully to ${res.data}`);
        } else {
          toast.error(res?.error ?? 'Failed to export sales.');
        }
      } catch (err: any) {
        toast.error('Failed to export sales.');
      }
    }
    setIsLoading(false);
  };

  const importInvoices = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:import');
        if (res?.success) {
          toast.success(`Imported ${res.data.importedCount} invoices. Skipped ${res.data.skippedCount} invalid rows.`);
          fetchInvoices();
        } else {
          toast.error(res?.error ?? 'Failed to import sales.');
        }
      } catch (err: any) {
        toast.error('Failed to import sales.');
      }
    }
    setIsLoading(false);
  };

  return {
    invoices,
    isLoading,
    fetchInvoices,
    saveInvoice,
    returnInvoice,
    prescribedMedicines,
    consultationDetails,
    fetchPatientPrescriptions,
    exportInvoices,
    importInvoices,
  };
}
