'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { InvoiceForm } from '@/features/billing/components/invoice-form';
import { PaymentModal } from '@/features/billing/components/payment-modal';
import { InvoicePrint } from '@/features/billing/components/invoice-print';
import { useBilling } from '@/features/billing/hooks/use-billing';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { useInventory } from '@/features/inventory/hooks/use-inventory';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, User, Receipt, TrendingUp, MessageCircle, Clock, ListChecks, RefreshCw, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function POSBillingPage() {
  const {
    saveInvoice,
    isLoading: isInvoiceSaving,
    prescribedMedicines,
    consultationDetails,
    fetchPatientPrescriptions,
    shareInvoiceWhatsApp,
    readyQueue,
    fetchReadyQueue,
    loadConsultation,
  } = useBilling();
  const { patients, fetchPatients } = usePatients();
  const { medicines, fetchMedicines } = useInventory();

  // Workspace state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [preCheckoutPayload, setPreCheckoutPayload] = useState<any>(null);
  // The EXACT completed visit being billed (from the Ready-for-Billing queue).
  // '' = manual/walk-in mode (no consultation link).
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [queueDoctor, setQueueDoctor] = useState<string>('');
  // One idempotency key per checkout attempt: a double-click / retry of the SAME
  // cart is deduped by the Host; a genuinely new bill gets a new key (spec §31).
  const [checkoutIdemKey, setCheckoutIdemKey] = useState<string>('');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<any>(null);
  const [waPhone, setWaPhone] = useState<string>('');

  useEffect(() => {
    fetchPatients();
    fetchMedicines();
    fetchReadyQueue();
  }, [fetchPatients, fetchMedicines, fetchReadyQueue]);

  // Live Ready-for-Billing refresh (spec §20): poll every 4s, but only while the
  // window/tab is visible to avoid needless load.
  useEffect(() => {
    const tick = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') fetchReadyQueue();
    };
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [fetchReadyQueue]);

  useEffect(() => {
    // In queue mode the prescription comes from the exact consultation
    // (loadConsultation); do NOT overwrite it with the patient's latest pull.
    if (selectedConsultationId) return;
    if (selectedPatientId) {
      const pat = patients.find((p) => p.id === selectedPatientId);
      setSelectedPatient(pat);
      fetchPatientPrescriptions(selectedPatientId);
    } else {
      setSelectedPatient(null);
      fetchPatientPrescriptions('');
    }
  }, [selectedPatientId, patients, fetchPatientPrescriptions, selectedConsultationId]);

  // Pick a specific completed visit from the queue → load THAT consultation's
  // prescription (not an arbitrary latest one) and bill against it.
  const handleSelectQueueItem = async (row: any) => {
    const loaded = await loadConsultation(row.consultationId);
    if (!loaded) return;
    setSelectedConsultationId(row.consultationId);
    setQueueDoctor(loaded.doctorName || row.doctorName || '');
    const pat = loaded.patient ?? row.patient ?? null;
    setSelectedPatient(pat);
    setSelectedPatientId(pat?.id ?? '');
  };

  // Return to manual/walk-in billing (no consultation link).
  const clearConsultation = () => {
    setSelectedConsultationId('');
    setQueueDoctor('');
    setSelectedPatientId('');
    setSelectedPatient(null);
  };

  // Patient is optional — cashier may bill a walk-in (no patient) or attach one.
  const handleOpenCheckout = (payload: any) => {
    setPreCheckoutPayload(payload);
    // New key for this checkout attempt (crypto.randomUUID is available in the
    // renderer); reused across payment-modal retries of the same cart.
    setCheckoutIdemKey(
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (paymentDetails: any) => {
    // Diagnostic breadcrumb (captured into main.log via the main-process console
    // bridge) so a "checkout does nothing" report can be traced end-to-end.
    console.log('[POS] confirm clicked — items:', preCheckoutPayload?.items?.length, 'total:', preCheckoutPayload?.total, 'mode:', paymentDetails?.paymentMode);
    const finalPayload = {
      patientId: selectedPatientId || null,
      // Walk-in name only when there is neither a patient nor a linked visit.
      walkinName: selectedPatientId || selectedConsultationId ? undefined : 'Walk-in Customer',
      items: preCheckoutPayload.items,
      subtotal: preCheckoutPayload.subtotal,
      gstAmount: preCheckoutPayload.gstAmount,
      discount: preCheckoutPayload.discount,
      total: preCheckoutPayload.total,
      paymentMode: paymentDetails.paymentMode,
      paymentStatus: 'PAID',
      payments: paymentDetails.payments,
      // Durable link to the exact billed visit (+ server dup-billing guard).
      consultationId: selectedConsultationId || null,
      idempotencyKey: checkoutIdemKey || undefined,
    };

    const res = await saveInvoice(finalPayload);
    console.log('[POS] saveInvoice returned — success:', res?.success, 'hasData:', !!res?.data);
    if (res.success && res.data) {
      setPaymentOpen(false);
      setPrintInvoiceData(res.data);
      // Prefill WhatsApp number from the patient (if attached); walk-in stays blank
      // for the cashier to type the customer's number.
      setWaPhone(selectedPatient?.phone ?? '');
      // The billed visit leaves the Ready-for-Billing queue immediately.
      setSelectedConsultationId('');
      setQueueDoctor('');
      fetchReadyQueue();
    }
  };

  const buildWhatsAppMessage = (inv: any, patientName: string, items: any[]) => {
    const lines = [
      '*SUGAM GENERAL HOSPITAL*',
      `Invoice: ${inv.invoiceNo}`,
      `Date: ${new Date(inv.date).toLocaleDateString('en-IN')}`,
      `Billed To: ${patientName}`,
      '--------------------------------',
      ...items.map((it: any, i: number) => `${i + 1}. ${it.name} x${it.quantity} = ₹${((it.quantity || 0) * (it.price || 0)).toFixed(2)}`),
      '--------------------------------',
      `Subtotal: ₹${(inv.subtotal ?? 0).toFixed(2)}`,
      `GST: ₹${(inv.gstAmount ?? 0).toFixed(2)}`,
      ...(inv.discount > 0 ? [`Discount: -₹${inv.discount.toFixed(2)}`] : []),
      `*Total: ₹${(inv.total ?? 0).toFixed(2)}*`,
      `Paid via ${inv.paymentMode}`,
      '',
      'Thank you for choosing Sugam General Hospital.',
    ];
    return lines.join('\n');
  };

  if (printInvoiceData) {
    const billedPatient = selectedPatient ?? { name: 'Walk-in Customer', patientId: '—', phone: '—', address: '—' };
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="POS Invoice Settled"
          description="Print billing invoices or check invoices records feed."
          actions={
            <Link href="/billing/invoices">
              <Button variant="outline" className="h-10 text-xs font-bold border-slate-200">
                <Receipt className="h-4 w-4 mr-1.5" /> View Invoices Logs
              </Button>
            </Link>
          }
        />
        {/* Optional: share the bill on WhatsApp */}
        <Card className="p-5 bg-white border border-slate-100 shadow-md rounded-hms space-y-3 print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Share Bill on WhatsApp <span className="text-slate-400 font-medium normal-case">(optional)</span></h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {selectedPatient
              ? "Number auto-filled from the patient record — edit if needed."
              : "Walk-in customer — enter the customer's WhatsApp number to send the bill."}
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              className="h-11 rounded-xl text-sm flex-1"
            />
            <Button
              type="button"
              disabled={String(waPhone).replace(/\D/g, '').length < 10}
              onClick={() =>
                shareInvoiceWhatsApp(
                  waPhone,
                  buildWhatsAppMessage(printInvoiceData, billedPatient.name, preCheckoutPayload?.items || [])
                )
              }
              className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </Button>
          </div>
        </Card>

        <InvoicePrint
          invoice={printInvoiceData}
          patient={billedPatient}
          items={preCheckoutPayload?.items || []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Billing Counter"
        description="Search hospital patients, create invoice lists, add item discounts, and print bills."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/billing/invoices">
              <Button variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
                <Receipt className="h-4 w-4 mr-1.5 text-slate-500" /> Invoice Logs
              </Button>
            </Link>
            <Link href="/billing/reports">
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <TrendingUp className="h-4 w-4" /> Daily Sales
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Column — Ready-for-Billing queue (primary) + patient select */}
        <div className="xl:col-span-1 space-y-4">
          {/* Ready for Billing — the live queue fed by completed consultations */}
          <Card className="p-4 bg-white border border-slate-100 shadow-md rounded-hms space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <ListChecks className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold">Ready for Billing</h3>
                <span className="text-[10px] font-bold text-white bg-primary rounded-full px-2 py-0.5">{readyQueue.length}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchReadyQueue()}
                className="text-slate-400 hover:text-primary"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {readyQueue.length === 0 && (
                <p className="text-[11px] text-slate-400 font-medium py-6 text-center">
                  No patients waiting to be billed. Completed consultations appear here automatically.
                </p>
              )}
              {readyQueue.map((row: any) => {
                const active = selectedConsultationId === row.consultationId;
                const time = row.completedAt
                  ? new Date(row.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <button
                    key={row.consultationId}
                    type="button"
                    onClick={() => handleSelectQueueItem(row)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition',
                      active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-100 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{row.patient?.name ?? 'Patient'}</span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {time}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {row.patient?.patientId} &bull; {row.patient?.phone}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3 text-primary" /> {row.doctorName}
                      {row.itemCount ? <span className="text-slate-400"> &bull; {row.itemCount} item(s)</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selectedConsultationId && (
            <div className="bg-primary/5 border border-primary/30 p-3 rounded-xl text-[11px] font-semibold text-primary-dark flex items-center justify-between gap-2">
              <span>
                Billing the selected visit
                {queueDoctor ? ` (Dr. ${queueDoctor})` : ''} — prescription loaded from that consultation.
              </span>
              <button type="button" onClick={clearConsultation} className="font-bold underline shrink-0">
                Cancel
              </button>
            </div>
          )}

          <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold">Billing Patient <span className="text-slate-400 font-medium normal-case">(optional)</span></h3>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Patient Directory</Label>
                {selectedPatientId && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatientId('')}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Clear · Walk-in
                  </button>
                )}
              </div>
              <Popover open={patientDropdownOpen} onOpenChange={setPatientDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientDropdownOpen}
                    className="w-full justify-between h-11 rounded-xl text-left font-normal"
                  >
                    {selectedPatientId
                      ? patients.find((p) => p.id === selectedPatientId)?.name + ` (ID: ${patients.find((p) => p.id === selectedPatientId)?.patientId})`
                      : "Search Patient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-75 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search name, ID or phone..." />
                    <CommandList>
                      <CommandEmpty>No patient found.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.patientId} ${p.phone}`}
                            onSelect={() => {
                              setSelectedPatientId(p.id);
                              setPatientDropdownOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPatientId === p.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ID: {p.patientId} &bull; Ph: {p.phone}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedPatient && (
              <div className="bg-slate-50 p-4 border rounded-xl space-y-3 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Residential Address</span>
                  <span className="text-slate-800">{selectedPatient.address}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                  <span className="text-slate-800 font-mono">{selectedPatient.phone}</span>
                </div>
              </div>
            )}

            {!selectedPatient && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] font-semibold text-amber-700 leading-snug">
                Billing as <strong>Walk-in Customer</strong> — no patient attached. Select one above if needed.
              </div>
            )}
          </Card>
        </div>

        {/* Center/Right Column — Billing Form */}
        <div className="xl:col-span-3">
          <InvoiceForm 
            medicines={medicines} 
            prescribedMedicines={prescribedMedicines} 
            consultationDetails={consultationDetails}
            onOpenCheckout={handleOpenCheckout} 
          />
        </div>
      </div>

      {/* Payment checkout modal */}
      {preCheckoutPayload && (
        <PaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          total={preCheckoutPayload.total}
          onConfirm={handlePaymentConfirm}
          isLoading={isInvoiceSaving}
        />
      )}
    </div>
  );
}
