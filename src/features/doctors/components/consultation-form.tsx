'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save, FileText, CheckCircle2, ChevronRight, Stethoscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PrescriptionPrint } from './prescription-print';
import { calcPrescriptionQuantity } from '@/lib/prescription-qty';
import type { QueueItem } from '../types/doctor.types';

interface ConsultationFormProps {
  queueItem: QueueItem;
  doctor: { id: string; name: string; specialization: string; license: string };
  onSubmit: (payload: any) => Promise<boolean>;
  isLoading: boolean;
}

export function ConsultationForm({ queueItem, doctor, onSubmit, isLoading }: ConsultationFormProps) {
  const [stage, setStage] = useState<'edit' | 'print'>('edit');
  const [savedData, setSavedData] = useState<any>(null);

  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      chiefComplaint: '',
      diagnosis: '',
      notes: '',
      nextVisit: '',
      consultationFee: '',
      medicines: [{ name: '', dosage: '1-0-1', duration: '5 days', instructions: '' }],
      labTests: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medicines',
  });

  const watchedMeds = watch('medicines');

  const handleSave = async (values: any) => {
    const labTestsArray = values.labTests
      ? values.labTests.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      appointmentId: queueItem.appointmentId,
      doctorId: doctor.id,
      patientId: queueItem.patientId,
      chiefComplaint: values.chiefComplaint,
      diagnosis: values.diagnosis,
      notes: values.notes,
      nextVisit: values.nextVisit || undefined,
      // Doctor-reference-only — stored on the consultation, never sent to billing.
      consultationFee: values.consultationFee ? Number(values.consultationFee) : 0,
      medicines: values.medicines.filter((m: any) => m.name),
      labTests: labTestsArray,
    };

    const success = await onSubmit(payload);
    if (success) {
      setSavedData(payload);
      setStage('print');
    }
  };

  if (stage === 'print' && savedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-success max-w-2xl mx-auto text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="font-bold">Consultation completed and sent to Billing.</p>
        </div>
        {Number(savedData.consultationFee) > 0 && (
          <div className="max-w-2xl mx-auto text-[11px] text-slate-500 font-semibold px-1">
            Consultation fee recorded for your reference: ₹{savedData.consultationFee} — not added to the patient&apos;s pharmacy bill.
          </div>
        )}
        <PrescriptionPrint
          doctor={doctor}
          patient={queueItem}
          chiefComplaint={savedData.chiefComplaint}
          diagnosis={savedData.diagnosis}
          medicines={savedData.medicines}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-5">
        <div className="border-b border-slate-50 pb-3 flex items-center gap-2 text-slate-800">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">Consultation Diagnostics</h3>
        </div>

        {/* Complaints + Diagnosis */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="complaints" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chief Complaints
            </Label>
            <Input
              id="complaints"
              placeholder="e.g. Cough and cold, mild fever for 3 days"
              {...register('chiefComplaint')}
              className="h-12 rounded-xl text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diagnosis" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Diagnosis / Clinical Impression
            </Label>
            <Input
              id="diagnosis"
              placeholder="e.g. Acute Viral Bronchitis"
              {...register('diagnosis')}
              className="h-12 rounded-xl text-base"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="notes" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Clinical Notes & Lifestyle Advise
          </Label>
          <Input
            id="notes"
            placeholder="e.g. Rest, drink plenty of warm fluids, steam inhalation twice daily."
            {...register('notes')}
            className="h-12 rounded-xl text-base"
          />
        </div>

        {/* Labs + Next Visit */}
        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="labs" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Requested Lab Tests (Comma separated)
            </Label>
            <Input
              id="labs"
              placeholder="e.g. CBC, ESR, Chest X-Ray"
              {...register('labTests')}
              className="h-12 rounded-xl text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nextVisit" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recommended Next Follow-up
            </Label>
            <Input id="nextVisit" type="date" {...register('nextVisit')} className="h-12 rounded-xl text-base max-w-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="consultationFee" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Consultation Fee (₹) <span className="text-slate-400 normal-case font-medium">— clinical record only</span>
            </Label>
            <Input
              id="consultationFee"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 500"
              {...register('consultationFee')}
              className="h-12 rounded-xl text-base max-w-sm"
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Saved to this patient&apos;s consultation history for your reference. It is <b>not</b> added to the
              pharmacy bill, invoice, or any total.
            </p>
          </div>
        </div>
      </Card>

      {/* Dynamic Prescription list */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold">Medicines (Rₓ)</h3>
          </div>
          <Button
            type="button"
            onClick={() => append({ name: '', dosage: '1-0-1', duration: '5 days', instructions: '' })}
            variant="outline"
            className="text-xs font-bold gap-1 h-9 border-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add Medicine
          </Button>
        </div>

        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative">
              <div className="absolute top-4 right-4">
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-danger hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4 pr-10">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-slate-600">Medicine Name</Label>
                  <Input placeholder="e.g. Paracetamol 650mg" {...register(`medicines.${index}.name`)} className="h-11 rounded-lg text-sm bg-white" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs uppercase font-bold text-slate-600">Dosage</Label>
                    <Input placeholder="e.g. 1-0-1" {...register(`medicines.${index}.dosage`)} className="h-11 rounded-lg text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs uppercase font-bold text-slate-600">Duration</Label>
                    <Input placeholder="e.g. 5 days" {...register(`medicines.${index}.duration`)} className="h-11 rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-slate-600">Instructions</Label>
                  <Input placeholder="e.g. Post food" {...register(`medicines.${index}.instructions`)} className="h-11 rounded-lg text-sm bg-white" />
                </div>

                {/* Live quantity calculation from dosage x duration. */}
                {(() => {
                  const d = watchedMeds?.[index];
                  if (!d?.name) return null;
                  const calc = calcPrescriptionQuantity(d.dosage || '', d.duration || '');
                  return (
                    <p
                      className={
                        'text-[11px] font-semibold ' + (calc.supported ? 'text-primary' : 'text-amber-600')
                      }
                    >
                      {calc.supported
                        ? `Auto quantity: ${calc.quantity} tablet(s) — ${d.dosage} × ${d.duration}. Suggested to Billing; adjust there if needed.`
                        : "⚠ Can't auto-calculate quantity from this dosage/duration — Billing will enter it manually."}
                    </p>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
      >
        <Save className="h-4 w-4" /> Save Consultation details
      </Button>
    </form>
  );
}
