'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Save, Loader2, Camera, User } from 'lucide-react';
import { patientSchema, type PatientFormValues } from '../schemas/patient.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PatientFormProps {
  initialValues?: any;
  onSubmit: (data: PatientFormValues) => Promise<boolean>;
  isLoading: boolean;
}

export function PatientForm({ initialValues, onSubmit, isLoading }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          dob: new Date(initialValues.dob).toISOString().split('T')[0],
          gender: initialValues.gender,
          bloodGroup: initialValues.bloodGroup,
          phone: initialValues.phone,
          email: initialValues.email ?? '',
          address: initialValues.address,
          emergencyContactName: initialValues.emergencyContactName,
          emergencyContactPhone: initialValues.emergencyContactPhone,
          photo: initialValues.photo ?? '',
        }
      : {
          name: '',
          dob: '',
          gender: 'MALE',
          bloodGroup: 'UNKNOWN',
          phone: '',
          email: '',
          address: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          photo: '',
        },
  });

  const photoValue = watch('photo');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('photo', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-hms border border-slate-100 shadow-md">
      
      {/* Photo Upload */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
        <div className="relative group">
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
            {photoValue ? (
              <img src={photoValue} alt="Patient" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-slate-300" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Patient Photo</h3>
          <p className="text-xs text-slate-500 mt-1">Upload a clear front-facing photo of the patient.<br/>Recommended size: 256x256px.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            {...register('name')}
            className={cn('h-11 rounded-xl', errors.name && 'border-danger')}
          />
          {errors.name && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.name.message}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <Label htmlFor="dob" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            {...register('dob')}
            className={cn('h-11 rounded-xl', errors.dob && 'border-danger')}
          />
          {errors.dob && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.dob.message}
            </p>
          )}
        </div>

        {/* Gender Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gender</Label>
          <Select
            defaultValue={initialValues?.gender ?? 'MALE'}
            onValueChange={(v) => setValue('gender', v as any)}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-150">
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Blood Group Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Blood Group</Label>
          <Select
            defaultValue={initialValues?.bloodGroup ?? 'UNKNOWN'}
            onValueChange={(v) => setValue('bloodGroup', v as any)}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select Blood Group" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-150">
              <SelectItem value="A_POS">A +ve</SelectItem>
              <SelectItem value="A_NEG">A -ve</SelectItem>
              <SelectItem value="B_POS">B +ve</SelectItem>
              <SelectItem value="B_NEG">B -ve</SelectItem>
              <SelectItem value="O_POS">O +ve</SelectItem>
              <SelectItem value="O_NEG">O -ve</SelectItem>
              <SelectItem value="AB_POS">AB +ve</SelectItem>
              <SelectItem value="AB_NEG">AB -ve</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Phone</Label>
          <Input
            id="phone"
            placeholder="9876543210"
            {...register('phone')}
            className={cn('h-11 rounded-xl', errors.phone && 'border-danger')}
          />
          {errors.phone && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.phone.message}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john.doe@example.com"
            {...register('email')}
            className={cn('h-11 rounded-xl', errors.email && 'border-danger')}
          />
          {errors.email && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.email.message}
            </p>
          )}
        </div>

        {/* Emergency Contact Name */}
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Emergency Contact Person <span className="text-slate-400 font-medium normal-case">(optional)</span></Label>
          <Input
            id="emergencyContactName"
            placeholder="Jane Doe"
            {...register('emergencyContactName')}
            className={cn('h-11 rounded-xl', errors.emergencyContactName && 'border-danger')}
          />
          {errors.emergencyContactName && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.emergencyContactName.message}
            </p>
          )}
        </div>

        {/* Emergency Contact Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactPhone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Emergency Phone Number <span className="text-slate-400 font-medium normal-case">(optional)</span></Label>
          <Input
            id="emergencyContactPhone"
            placeholder="9876543219"
            {...register('emergencyContactPhone')}
            className={cn('h-11 rounded-xl', errors.emergencyContactPhone && 'border-danger')}
          />
          {errors.emergencyContactPhone && (
            <p className="text-xs text-danger font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.emergencyContactPhone.message}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Residential Address</Label>
        <Input
          id="address"
          placeholder="12, Gandhi Street, Sector 4..."
          {...register('address')}
          className={cn('h-11 rounded-xl', errors.address && 'border-danger')}
        />
        {errors.address && (
          <p className="text-xs text-danger font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.address.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving Record...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> Save Patient Profile
          </>
        )}
      </Button>
    </form>
  );
}
