'use client';

import React, { useState } from 'react';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RegisterFn = (
  patient: Record<string, unknown>,
  forceNew?: boolean
) => Promise<{ success: boolean; data?: any; code?: string; candidates?: any[] }>;

interface Props {
  /** useDoctor().registerAndStartVisit */
  register: RegisterFn;
  /** Called with the new appointmentId + patientId once a visit is started. */
  onRegistered: (appointmentId: string, patientId: string) => void;
  /** Called when the doctor chooses an existing (duplicate) patient instead. */
  onUseExisting: (patientId: string) => void;
  disabled?: boolean;
}

interface FormState {
  name: string;
  phone: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  address: string;
}

const EMPTY: FormState = { name: '', phone: '', dob: '', gender: 'MALE', bloodGroup: '', address: '' };

export function NewPatientDialog({ register, onRegistered, onUseExisting, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(EMPTY);
    setDuplicates(null);
    setSubmitting(false);
  };

  const submit = async (forceNew: boolean) => {
    if (!form.name.trim() || !form.phone.trim() || !form.dob || !form.gender) return;
    setSubmitting(true);
    const res = await register(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup.trim(),
        address: form.address.trim(),
      },
      forceNew
    );
    setSubmitting(false);
    if (res.success && res.data) {
      onRegistered(res.data.appointmentId, res.data.patient.id);
      setOpen(false);
      reset();
      return;
    }
    if (res.code === 'DUPLICATE_PHONE') {
      setDuplicates(res.candidates ?? []);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className="w-full h-auto min-h-11 py-2.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow whitespace-normal text-sm leading-tight text-center"
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          <span>New Patient / Start Consultation</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register patient &amp; start visit</DialogTitle>
        </DialogHeader>

        {duplicates ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                A patient with this mobile number already exists. Open the existing record (recommended) instead of
                creating a duplicate.
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {duplicates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onUseExisting(c.id);
                    setOpen(false);
                    reset();
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
                >
                  <div className="text-sm font-bold text-slate-800">{c.name}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    {c.patientId} &bull; {c.phone}
                  </div>
                </button>
              ))}
              {duplicates.length === 0 && (
                <p className="text-xs text-slate-400 font-medium">No matching records to show.</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDuplicates(null)}>
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => submit(true)}
                className="border-amber-300 text-amber-700"
              >
                Register a new patient anyway
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Full Name *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Mobile *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                  inputMode="numeric"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Date of Birth *</Label>
                <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Blood Group</Label>
                <Input value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Optional" className="h-11 rounded-xl" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase">Address</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Optional" className="h-11 rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting || !form.name.trim() || !form.phone.trim() || !form.dob}
                className="bg-primary hover:bg-primary-light text-white font-bold rounded-xl"
              >
                {submitting ? 'Starting…' : 'Register & start consultation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
