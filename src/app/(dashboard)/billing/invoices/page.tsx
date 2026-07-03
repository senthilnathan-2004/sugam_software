'use client';

import React, { useEffect, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { useBilling } from '@/features/billing/hooks/use-billing';
import type { Invoice } from '@/features/billing/types/billing.types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Printer, ArrowLeft, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InvoicePrint } from '@/features/billing/components/invoice-print';
import { useInventory } from '@/features/inventory/hooks/use-inventory';

export default function InvoicesPage() {
  const { invoices, isLoading, fetchInvoices, returnInvoice, exportInvoices, importInvoices } = useBilling();
  const { medicines, fetchMedicines } = useInventory();
  const [isPending, startTransition] = useTransition();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchMedicines();
  }, [fetchInvoices, fetchMedicines]);

  const getItemsWithNames = (itemsStr: string) => {
    try {
      const parsed = JSON.parse(itemsStr || '[]');
      return parsed.map((item: any) => {
        if (!item.name && item.medicineId) {
          const med = medicines.find((m) => m.id === item.medicineId);
          return { ...item, name: med ? med.name : 'Unknown Medicine' };
        }
        return item;
      });
    } catch {
      return [];
    }
  };

  const handleReturn = (invoice: Invoice) => {
    if (invoice.isReturn) return;
    if (confirm(`Log return refund for Invoice ${invoice.invoiceNo}?`)) {
      startTransition(async () => {
        const payload = {
          invoiceId: invoice.id,
          reason: 'Customer return refund request',
          items: JSON.parse(invoice.items || '[]'),
          refundAmount: invoice.total,
        };
        await returnInvoice(payload);
      });
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNo',
      header: 'Invoice No',
      cell: ({ row }) => <span className="font-extrabold text-slate-900">{row.getValue('invoiceNo')}</span>,
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue('patientName')}</span>,
    },
    {
      accessorKey: 'date',
      header: 'Bill Date',
      cell: ({ row }) => (
        <span>
          {new Date(row.getValue('date')).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'paymentMode',
      header: 'Mode',
      cell: ({ row }) => (
        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase text-slate-600">
          {row.getValue('paymentMode')}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Net Total',
      cell: ({ row }) => <span className="font-mono font-bold text-primary">{formatCurrency(row.getValue('total'))}</span>,
    },
    {
      accessorKey: 'isReturn',
      header: 'Status',
      cell: ({ row }) => {
        const returned = row.getValue('isReturn') as boolean;
        return (
          <Badge
            className={`text-[9px] font-bold px-1.5 py-0 rounded border uppercase ${
              returned
                ? 'bg-rose-50 text-danger border-rose-200'
                : 'bg-emerald-50 text-success border-emerald-200'
            }`}
          >
            {returned ? 'Returned' : 'Settled'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-500 hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInvoice(inv);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-500 hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                // Simple browser print trigger
                window.print();
              }}
            >
              <Printer className="h-4 w-4" />
            </Button>
            {!inv.isReturn && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-danger hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReturn(inv);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices Logs"
        description="View previously settled transactions, refund invoice items, and reprint bills."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={importInvoices} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
              <Upload className="h-4 w-4 mr-1.5 text-slate-500" /> Import Sales
            </Button>
            <Button onClick={exportInvoices} disabled={isLoading} variant="outline" className="h-10 text-xs font-bold border-slate-200 bg-white">
              <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Export Sales
            </Button>
            <Link href="/billing">
              <Button className="h-10 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-1.5 shadow">
                <ArrowLeft className="h-4 w-4" /> POS Billing Counter
              </Button>
            </Link>
          </div>
        }
      />

      <DataTable columns={columns} data={invoices} isLoading={isLoading} />

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Bill</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoicePrint
              invoice={selectedInvoice}
              patient={{
                name: selectedInvoice.patientName || (selectedInvoice as any).walkinName || 'Walk-in Customer',
                patientId: selectedInvoice.patientId || 'WALK-IN',
                phone: (selectedInvoice as any).walkinPhone || 'N/A',
                address: 'N/A',
              }}
              items={getItemsWithNames(selectedInvoice.items)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
