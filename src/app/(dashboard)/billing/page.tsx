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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, User, Receipt, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function POSBillingPage() {
  const { saveInvoice, isLoading: isInvoiceSaving, prescribedMedicines, consultationDetails, fetchPatientPrescriptions } = useBilling();
  const { patients, fetchPatients } = usePatients();
  const { medicines, fetchMedicines } = useInventory();

  // Workspace state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [preCheckoutPayload, setPreCheckoutPayload] = useState<any>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<any>(null);

  useEffect(() => {
    fetchPatients();
    fetchMedicines();
  }, [fetchPatients, fetchMedicines]);

  useEffect(() => {
    if (selectedPatientId) {
      const pat = patients.find((p) => p.id === selectedPatientId);
      setSelectedPatient(pat);
      fetchPatientPrescriptions(selectedPatientId);
    } else {
      setSelectedPatient(null);
      fetchPatientPrescriptions('');
    }
  }, [selectedPatientId, patients, fetchPatientPrescriptions]);

  const handleOpenCheckout = (payload: any) => {
    if (!selectedPatientId) {
      alert('Please select a patient before settling checkout bill.');
      return;
    }
    setPreCheckoutPayload(payload);
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (paymentDetails: any) => {
    const finalPayload = {
      patientId: selectedPatientId,
      items: preCheckoutPayload.items,
      subtotal: preCheckoutPayload.subtotal,
      gstAmount: preCheckoutPayload.gstAmount,
      discount: preCheckoutPayload.discount,
      total: preCheckoutPayload.total,
      paymentMode: paymentDetails.paymentMode,
      paymentStatus: 'PAID',
      payments: paymentDetails.payments,
    };

    const res = await saveInvoice(finalPayload);
    if (res.success && res.data) {
      setPaymentOpen(false);
      setPrintInvoiceData(res.data);
    }
  };

  if (printInvoiceData && selectedPatient) {
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
        <InvoicePrint
          invoice={printInvoiceData}
          patient={selectedPatient}
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
        {/* Left Column — Patient select bar */}
        <div className="xl:col-span-1">
          <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold">Select Billing Patient</h3>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Patient Directory</Label>
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
                <PopoverContent className="w-[300px] p-0" align="start">
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
