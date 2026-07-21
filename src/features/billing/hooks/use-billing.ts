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
      } catch (err) {
        // invoke() itself rejected (channel blocked / main-process fault). Never
        // fail silently — that makes the checkout button look dead to the cashier.
        console.error('[saveInvoice] IPC rejected:', err);
        toast.error('Checkout failed — could not reach the billing service. Please retry.');
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

  // Ready-for-Billing queue: completed consultations awaiting billing, tied to
  // the EXACT visit (spec §8/§28). Never carries the consultation fee.
  const [readyQueue, setReadyQueue] = useState<any[]>([]);

  const fetchReadyQueue = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:ready-queue');
        setReadyQueue(res?.success ? res.data || [] : []);
      } catch {
        setReadyQueue([]);
      }
    }
  }, []);

  // Load ONE exact consultation's prescription (not "the patient's latest").
  const loadConsultation = useCallback(async (consultationId: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:consultation:load', { consultationId });
        if (res?.success) {
          setPrescribedMedicines(res.data.medicines || []);
          setConsultationDetails({ diagnosis: res.data.diagnosis, notes: res.data.notes });
          return res.data; // { consultationId, patient, doctorName, medicines, instructions, ... }
        }
        toast.error(res?.error || 'Could not load the selected visit.');
        return null;
      } catch {
        toast.error('Could not load the selected visit.');
        return null;
      }
    }
    return null;
  }, []);

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

  const shareInvoiceWhatsApp = async (phone: string, message: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('billing:whatsapp:share', { phone, message });
        if (res?.success) {
          toast.success('Opening WhatsApp…');
          return true;
        }
        toast.error(res?.error ?? 'Failed to share on WhatsApp.');
        return false;
      } catch {
        toast.error('Failed to share on WhatsApp.');
        return false;
      }
    }
    // Web/demo fallback — open wa.me directly in a new tab.
    const digits = String(phone).replace(/\D/g, '');
    const num = digits.length === 10 ? '91' + digits : digits;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
    return true;
  };

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
    shareInvoiceWhatsApp,
    exportInvoices,
    importInvoices,
    readyQueue,
    fetchReadyQueue,
    loadConsultation,
  };
}
