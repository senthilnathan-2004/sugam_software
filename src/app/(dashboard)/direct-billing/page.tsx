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

export default function DirectBillingPage() {
  const { saveInvoice, isLoading: isInvoiceSaving } = useBilling();
  const { medicines, fetchMedicines } = useInventory();

  // Workspace state
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [walkinEmail, setWalkinEmail] = useState<string>('');
  const [preCheckoutPayload, setPreCheckoutPayload] = useState<any>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<any>(null);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleOpenCheckout = (payload: any) => {
    setPreCheckoutPayload(payload);
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (paymentDetails: any) => {
    const finalPayload = {
      walkinName: walkinName.trim() || 'Walk-in Customer',
      walkinPhone: walkinPhone.trim() || 'N/A',
      walkinEmail: walkinEmail.trim() || 'N/A',
      patientId: null, // No registered patient
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

  if (printInvoiceData) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="Direct Invoice Settled"
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
          patient={{ name: printInvoiceData.walkinName, patientId: 'WALK-IN', phone: printInvoiceData.walkinPhone, address: 'N/A' }}
          items={preCheckoutPayload?.items || []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Direct Billing"
        description="Quickly generate bills for walk-in customers and over-the-counter medicine sales."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/billing/invoices">
              <Button variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
                <Receipt className="h-4 w-4 mr-1.5 text-slate-500" /> Invoice Logs
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Column — Customer Info bar */}
        <div className="xl:col-span-1">
          <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold">Walk-in Customer</h3>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 font-medium">
                Enter details for over-the-counter sales. Both fields are optional.
              </p>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Name</Label>
                <div className="relative">
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Phone Number</Label>
                <div className="relative">
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Email Address (Optional)</Label>
                <div className="relative">
                  <input
                    type="email"
                    value={walkinEmail}
                    onChange={(e) => setWalkinEmail(e.target.value)}
                    placeholder="e.g. hello@example.com"
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Center/Right Column — Billing Form */}
        <div className="xl:col-span-3">
          <InvoiceForm 
            medicines={medicines} 
            prescribedMedicines={[]} 
            consultationDetails={null}
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
