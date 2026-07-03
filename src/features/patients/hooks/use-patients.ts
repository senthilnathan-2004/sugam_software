'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Patient, PatientDetail } from '../types/patient.types';

// Fallback demo patients list when running standalone web dev mode
const DEMO_PATIENTS: Patient[] = [
  {
    id: '1',
    patientId: 'P-00001',
    name: 'Arun Kumar',
    dob: new Date('1984-05-12'),
    age: 42,
    gender: 'MALE',
    bloodGroup: 'A_POS',
    phone: '9876543210',
    email: 'arun@example.com',
    address: '12, Gandhi Nagar, Chennai',
    emergencyContactName: 'Ramesh Kumar',
    emergencyContactPhone: '9876543219',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    patientId: 'P-00002',
    name: 'Meena Devi',
    dob: new Date('1991-08-23'),
    age: 35,
    gender: 'FEMALE',
    bloodGroup: 'B_POS',
    phone: '9876543211',
    email: '',
    address: '45, Mount Road, Chennai',
    emergencyContactName: 'Suresh Devi',
    emergencyContactPhone: '9876543218',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function usePatients() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<PatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPatients = useCallback(async (filters?: { search?: string; gender?: string; bloodGroup?: string }) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('patient:list', filters);
        if (res?.success) {
          setPatients(res.data);
        } else {
          toast.error(res?.error ?? 'Failed to load patients.');
        }
      } catch {
        setPatients(DEMO_PATIENTS);
      }
    } else {
      setPatients(DEMO_PATIENTS);
    }
    setIsLoading(false);
  }, []);

  const fetchPatientById = useCallback(async (id: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('patient:get', id);
        if (res?.success) {
          setCurrentPatient(res.data);
        } else {
          toast.error(res?.error ?? 'Failed to get patient details.');
          router.push('/patients');
        }
      } catch {
        const demoDetail = DEMO_PATIENTS.find((p) => p.id === id);
        if (demoDetail) {
          setCurrentPatient({
            ...demoDetail,
            visits: [
              {
                id: '101',
                patientId: id,
                doctorId: 'doc1',
                doctorName: 'Dr. Anjali Verma',
                date: new Date(),
                chiefComplaint: 'Acute headache and slight fever',
                diagnosis: 'Mild Migraine',
                notes: 'Advised rest and plenty of fluids.',
                nextVisitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            ],
            documents: [],
          });
        }
      }
    } else {
      const demoDetail = DEMO_PATIENTS.find((p) => p.id === id);
      if (demoDetail) {
        setCurrentPatient({
          ...demoDetail,
          visits: [],
          documents: [],
        });
      }
    }
    setIsLoading(false);
  }, [router]);

  const savePatient = async (data: any, id?: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const channel = id ? 'patient:update' : 'patient:create';
        const payload = id ? { id, data } : data;
        const res = await window.electronAPI.invoke(channel, payload);

        if (res?.success) {
          toast.success(id ? 'Patient updated successfully!' : 'Patient registered successfully!');
          router.push('/patients');
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to save patient.');
          return false;
        }
      } catch {
        toast.error('Local environment save simulation failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Patient saved successfully (Demo Mode)!');
    router.push('/patients');
    setIsLoading(false);
    return true;
  };

  const deletePatient = async (id: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('patient:delete', id);
        if (res?.success) {
          toast.success('Patient record deleted successfully.');
          fetchPatients();
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to delete patient.');
          return false;
        }
      } catch {
        return false;
      }
    }
    toast.success('Patient deleted (Demo Mode).');
    return true;
  };

  const exportPatients = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('patient:export');
        if (res?.success) {
          toast.success(`Patients exported successfully to ${res.data}`);
        } else {
          toast.error(res?.error ?? 'Failed to export patients.');
        }
      } catch (err: any) {
        toast.error('Failed to export patients.');
      }
    }
    setIsLoading(false);
  };

  const importPatients = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('patient:import');
        if (res?.success) {
          toast.success(`Imported ${res.data.importedCount} patients. Skipped ${res.data.skippedCount} rows.`);
          fetchPatients(); // refresh list
        } else {
          toast.error(res?.error ?? 'Failed to import patients.');
        }
      } catch (err: any) {
        toast.error('Failed to import patients.');
      }
    }
    setIsLoading(false);
  };

  const uploadDocument = async (patientId: string, file: File, type: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Array.from(new Uint8Array(arrayBuffer));

        const payload = {
          patientId,
          type,
          fileName: file.name,
          buffer,
        };
        const res = await window.electronAPI.invoke('patient:document:upload', payload);
        
        if (res?.success) {
          toast.success('Document uploaded successfully.');
          fetchPatientById(patientId);
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to upload document.');
          return false;
        }
      } catch (err: any) {
        toast.error('Failed to upload document.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    
    setIsLoading(false);
    return false;
  };

  return {
    patients,
    currentPatient,
    isLoading,
    fetchPatients,
    fetchPatientById,
    savePatient,
    deletePatient,
    exportPatients,
    importPatients,
    uploadDocument,
  };
}
