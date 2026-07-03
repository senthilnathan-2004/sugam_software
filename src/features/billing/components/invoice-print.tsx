'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Printer, CheckCircle2, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';

interface InvoicePrintProps {
  invoice: {
    invoiceNo: string;
    date: Date | string;
    subtotal: number;
    gstAmount: number;
    discount: number;
    total: number;
    paymentMode: string;
    paymentStatus: string;
  };
  patient: { name: string; patientId: string; phone: string; address: string };
  items: { name: string; batchNo: string; quantity: number; price: number; gstPercent: number; total: number }[];
}

export function InvoicePrint({ invoice, patient, items }: InvoicePrintProps) {
  const [printFormat, setPrintFormat] = React.useState<'A4' | 'THERMAL'>('A4');

  const handlePrint = (format: 'A4' | 'THERMAL') => {
    setPrintFormat(format);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Printable Sheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-sheet, #invoice-print-sheet * {
            visibility: visible;
          }
          #invoice-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: ${printFormat === 'THERMAL' ? '80mm' : '100%'};
            margin: 0;
            padding: ${printFormat === 'THERMAL' ? '0' : 'auto'};
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />
      <Card
        id="invoice-print-sheet"
        className={cn(
          "bg-white shadow-xl text-slate-800 space-y-6 mx-auto",
          printFormat === 'THERMAL' 
            ? "w-[300px] p-4 font-mono text-sm border-0 border-t-4 border-dashed border-slate-300" // Preview wrapper for thermal
            : "w-full max-w-2xl border border-slate-200 p-8 font-sans" // A4 Standard
        )}
      >
        {printFormat === 'A4' ? (
          <>
            {/* Header Branding A4 */}
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-primary leading-tight font-sans">SUGAM GENERAL HOSPITAL</h2>
            <p className="text-xs text-slate-400 font-medium">123, Healthcare Avenue, Chennai, TN 600001</p>
            <p className="text-[10px] text-slate-400 font-bold font-mono">GST No: 33AABCU9603R1ZM</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-black text-slate-900 leading-tight">TAX INVOICE</h3>
            <p className="text-xs text-slate-400 font-bold font-mono mt-1">Inv #: {invoice.invoiceNo}</p>
            <p className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">
              Date: {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs font-semibold">
          <div className="space-y-1">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Billed To</p>
            <p className="text-slate-950 font-bold text-sm">{patient.name}</p>
            <p className="text-slate-500 font-mono">Phone: {patient.phone}</p>
            <p className="text-slate-500">Add: {patient.address}</p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Patient Identification</p>
            <p className="text-slate-950 font-mono text-sm font-bold">{patient.patientId}</p>
            <p className="text-slate-500 uppercase text-[10px] mt-1">
              Payment Mode: <strong className="text-primary font-extrabold">{invoice.paymentMode}</strong>
            </p>
            <p className="text-slate-500 uppercase text-[10px]">
              Status: <strong className="text-success font-extrabold">{invoice.paymentStatus}</strong>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2 w-1/12">#</th>
                <th className="pb-2 w-4/12">Item Description</th>
                <th className="pb-2 w-2/12">Batch</th>
                <th className="pb-2 w-1/12">Qty</th>
                <th className="pb-2 w-2/12">Price</th>
                <th className="pb-2 w-2/12 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-3 text-slate-400 font-bold">{index + 1}</td>
                  <td className="py-3 font-bold text-slate-900">{item.name}</td>
                  <td className="py-3 font-mono">{item.batchNo}</td>
                  <td className="py-3 font-mono">{item.quantity}</td>
                  <td className="py-3 font-mono">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right font-mono font-bold text-slate-950">{formatCurrency(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-64 space-y-2 text-xs font-bold text-slate-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-slate-800">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Amount</span>
              <span className="font-mono text-slate-800">{formatCurrency(invoice.gstAmount)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span className="font-mono">- {formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-sm text-slate-950">
              <span className="font-extrabold text-primary">Net Payable Amount</span>
              <span className="font-mono font-extrabold text-primary">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Print Disclaimer */}
        <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-semibold leading-relaxed">
          <p>Thank you for choosing Sugam General Hospital.</p>
          <p className="mt-0.5">This is a computer-generated tax invoice. No signature required.</p>
        </div>
          </>
        ) : (
          <div className="space-y-4 text-xs font-mono">
            {/* Thermal Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-sm font-black uppercase">Sugam General Hospital</h2>
              <p>123, Healthcare Ave, Chennai</p>
              <p>GST: 33AABCU9603R1ZM</p>
            </div>
            
            <div className="space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between"><span>Inv#:</span> <span>{invoice.invoiceNo}</span></div>
              <div className="flex justify-between"><span>Date:</span> <span>{new Date(invoice.date).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>Patient:</span> <span>{patient.name}</span></div>
              <div className="flex justify-between"><span>Phone:</span> <span>{patient.phone}</span></div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dashed border-slate-300">
                  <th className="pb-1 w-1/2">Item</th>
                  <th className="pb-1 w-1/4 text-center">Qty</th>
                  <th className="pb-1 w-1/4 text-right">Amt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1 truncate pr-1">{item.name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax (GST):</span> <span>{formatCurrency(invoice.gstAmount)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between"><span>Discount:</span> <span>-{formatCurrency(invoice.discount)}</span></div>}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-slate-300">
                <span>Total:</span> <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
              <p>Paid by {invoice.paymentMode}</p>
              <p className="mt-2 text-[10px]">Thank you for your visit!</p>
            </div>
          </div>
        )}
      </Card>

      {/* Trigger control */}
      <div className="flex justify-center gap-3">
        <Button onClick={() => handlePrint('A4')} variant="outline" className="text-xs font-bold gap-1.5 h-10 shadow-sm border-slate-200">
          <Printer className="h-4 w-4" /> Print A4 Invoice
        </Button>
        <Button onClick={() => handlePrint('THERMAL')} className="text-xs font-bold gap-1.5 h-10 shadow">
          <ReceiptText className="h-4 w-4" /> Print Thermal (80mm)
        </Button>
      </div>
    </div>
  );
}
