'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { useDoctor } from '@/features/doctors/hooks/use-doctor';
import { useReception } from '@/features/patients/hooks/use-reception';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, User, Stethoscope, Send, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReceptionDeskPage() {
  const { patients, fetchPatients } = usePatients();
  const { doctors, fetchDoctors } = useDoctor();
  const { createAppointment, isLoading } = useReception();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('FOLLOW_UP');

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, [fetchPatients, fetchDoctors]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!selectedDoctorId) {
      toast.error('Please select an assigning doctor.');
      return;
    }

    const success = await createAppointment({
      patientId: selectedPatientId,
      doctorId: selectedDoctorId,
      type: appointmentType,
    });

    if (success) {
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setAppointmentType('FOLLOW_UP');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reception Desk" 
        description="Search for returning patients and assign them to a doctor's queue for today." 
      />

      <Card className="p-8 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-6">
          <CalendarPlus className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-bold text-slate-800">Assign Returning Patient</h2>
        </div>

        <div className="space-y-8">
          {/* Patient Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
              <User className="h-4 w-4" /> Select Patient
            </label>
            <Popover open={patientDropdownOpen} onOpenChange={setPatientDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={patientDropdownOpen}
                  className="w-full justify-between h-12 rounded-xl text-left font-normal bg-slate-50 border-slate-200"
                >
                  {selectedPatient
                    ? `${selectedPatient.name} (ID: ${selectedPatient.patientId}) - ${selectedPatient.phone}`
                    : "Search existing patient by Name, ID or Phone..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Type to search patients..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No patient found in records.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.patientId} ${p.phone}`}
                          onSelect={() => {
                            setSelectedPatientId(p.id);
                            setPatientDropdownOpen(false);
                          }}
                          className="py-3 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-3 h-5 w-5 text-primary",
                              selectedPatientId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                            <span className="text-xs text-slate-500 font-medium">
                              Patient ID: {p.patientId} &bull; Phone: {p.phone}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Doctor Selection */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Assign to Doctor
              </label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="Select Doctor..." />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-bold">Dr. {d.name}</span> <span className="text-xs text-slate-400">({d.specialization})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appointment Type */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" /> Visit Type
              </label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="Select Visit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOLLOW_UP">Follow-up Visit</SelectItem>
                  <SelectItem value="EMERGENCY">Walk-in / Emergency</SelectItem>
                  <SelectItem value="FIRST_VISIT">First Visit (New Doctor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-slate-50 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !selectedPatientId || !selectedDoctorId}
              className="h-12 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-2 shadow"
            >
              <Send className="h-4 w-4" />
              Route to Doctor's Queue
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
