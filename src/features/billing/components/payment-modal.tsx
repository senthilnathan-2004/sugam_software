'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Coins, CreditCard, QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payload: { paymentMode: string; payments: { mode: string; amount: number; reference?: string }[] }) => void;
  isLoading: boolean;
}

export function PaymentModal({ open, onOpenChange, total, onConfirm, isLoading }: PaymentModalProps) {
  const [cash, setCash] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [upi, setUpi] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');

  const cashVal = parseFloat(cash) || 0;
  const cardVal = parseFloat(card) || 0;
  const upiVal = parseFloat(upi) || 0;
  const sumPaid = cashVal + cardVal + upiVal;
  const balance = total - sumPaid;

  // Auto-fill cash with total when opening modal
  useEffect(() => {
    if (open) {
      setCash(total.toString());
      setCard('');
      setUpi('');
      setUpiRef('');
    }
  }, [open, total]);

  const handleConfirmCheckout = () => {
    if (Math.abs(balance) > 0.05) return; // Must match total amount

    const payments = [];
    if (cashVal > 0) payments.push({ mode: 'CASH', amount: cashVal });
    if (cardVal > 0) payments.push({ mode: 'CARD', amount: cardVal });
    if (upiVal > 0) payments.push({ mode: 'UPI', amount: upiVal, reference: upiRef || undefined });

    const paymentMode = payments.length > 1 ? 'SPLIT' : payments[0]?.mode || 'CASH';

    onConfirm({ paymentMode, payments });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            Collect Payment Settlement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Total display */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Amount Payable</span>
            <span className="text-lg font-extrabold text-primary">{formatCurrency(total)}</span>
          </div>

          {/* Payment input splits */}
          <div className="space-y-3.5">
            {/* Cash */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-500" /> Cash Received (₹)
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="h-10 rounded-lg text-xs"
              />
            </div>

            {/* UPI */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <QrCode className="h-4 w-4 text-emerald-500" /> UPI Paid (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  className="h-10 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI Ref / Txn ID</Label>
                <Input
                  placeholder="Txn reference"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="h-10 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Card */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-blue-500" /> Card Settlement (₹)
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                className="h-10 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Validation Banner */}
          {Math.abs(balance) > 0.05 ? (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-danger text-xs font-bold leading-tight">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Remaining Balance: {formatCurrency(balance)} (Must settle complete amount)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-success text-xs font-bold leading-tight">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Checkout collection complete. Settle payments.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirmCheckout}
            disabled={Math.abs(balance) > 0.05 || isLoading}
            className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            Confirm checkout payment receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
