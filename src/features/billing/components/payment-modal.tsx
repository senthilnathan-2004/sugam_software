'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Coins, QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payload: { paymentMode: string; payments: { mode: string; amount: number; reference?: string }[] }) => void;
  isLoading: boolean;
}

type Mode = 'CASH' | 'UPI';

export function PaymentModal({ open, onOpenChange, total, onConfirm, isLoading }: PaymentModalProps) {
  const [mode, setMode] = useState<Mode>('CASH');
  const [upiRef, setUpiRef] = useState<string>('');

  // Reset to default (cash) each time the modal opens
  useEffect(() => {
    if (open) {
      setMode('CASH');
      setUpiRef('');
    }
  }, [open]);

  const handleConfirmCheckout = () => {
    // Cashier picks a single mode; the full amount is collected via that mode.
    const payments = [
      { mode, amount: total, reference: mode === 'UPI' ? (upiRef || undefined) : undefined },
    ];
    onConfirm({ paymentMode: mode, payments });
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

          {/* Payment mode selector — Cash OR UPI */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('CASH')}
                className={cn(
                  'flex items-center justify-center gap-2 h-12 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all',
                  mode === 'CASH'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                )}
              >
                <Coins className="h-4 w-4 text-amber-500" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setMode('UPI')}
                className={cn(
                  'flex items-center justify-center gap-2 h-12 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all',
                  mode === 'UPI'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                )}
              >
                <QrCode className="h-4 w-4 text-emerald-500" /> UPI
              </button>
            </div>
          </div>

          {/* UPI reference — only when UPI selected */}
          {mode === 'UPI' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI Ref / Txn ID</Label>
              <Input
                placeholder="Txn reference"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="h-10 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Confirmation banner */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-success text-xs font-bold leading-tight">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Collecting {formatCurrency(total)} via {mode === 'CASH' ? 'Cash' : 'UPI'}.</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirmCheckout}
            disabled={isLoading}
            className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            Confirm checkout payment receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
