'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Doctor, QueueItem, ConsultationPayload } from '../types/doctor.types';

// Fallback demo queue list when running standalone web dev mode
const DEMO_QUEUE: QueueItem[] = [
  { appointmentId: 'a1', patientId: '1', patientUniqueId: 'P-00001', name: 'Arun Kumar', age: 42, gender: 'MALE', time: '09:30', status: 'PENDING' },
  { appointmentId: 'a2', patientId: '2', patientUniqueId: 'P-00002', name: 'Meena Devi', age: 35, gender: 'FEMALE', time: '10:15', status: 'CONFIRMED' },
];

const DEMO_DOCTORS: Doctor[] = [
  {
    id: 'd1',
    userId: 'u2',
    name: 'Dr. Anjali Verma',
    email: 'doctor@sugamhms.com',
    specialization: 'General Physician',
    license: 'MCI-87391',
    qualification: 'MBBS, MD (Medicine)',
    schedule: '{"Mon":"09:00-14:00","Wed":"09:00-14:00","Fri":"09:00-14:00"}',
  },
];

export function useDoctor() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // The logged-in user's OWN doctor profile, resolved server-side (spec §5/§34).
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);

  // Resolve the caller's own Doctor row — replaces the old client-side
  // `doctors.find(userId) || doctors[0]` fallback that misattributed visits.
  const fetchMe = useCallback(async (): Promise<Doctor | null> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:me');
        if (res?.success) {
          setCurrentDoctor(res.data);
          return res.data as Doctor;
        }
      } catch {
        /* fall through */
      }
      return null;
    }
    setCurrentDoctor(DEMO_DOCTORS[0]);
    return DEMO_DOCTORS[0];
  }, []);

  // Register a NEW patient and immediately start a visit assigned to the
  // logged-in doctor (spec §6/§32). Surfaces duplicate-mobile candidates so the
  // caller can open the existing record instead of creating a duplicate.
  const registerAndStartVisit = async (
    patient: Record<string, unknown>,
    forceNew = false,
    doctorId?: string
  ): Promise<{ success: boolean; data?: any; code?: string; candidates?: any[] }> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        // Forward the acting doctor id. A DOCTOR's is ignored server-side
        // (auto-assigned from the session); an ADMIN has no own Doctor row, so
        // the backend REQUIRES this id to know which doctor's queue to start the
        // visit in — without it the call fails with "not linked to a doctor
        // profile" and the form appears to do nothing on submit.
        const res = await window.electronAPI.invoke('doctor:patient:register-and-visit', { patient, forceNew, doctorId });
        if (res?.success) {
          toast.success('Patient registered and added to your queue.');
          return { success: true, data: res.data };
        }
        if (res?.code === 'DUPLICATE_PHONE') {
          return { success: false, code: 'DUPLICATE_PHONE', candidates: res.data?.candidates ?? [] };
        }
        toast.error(res?.error ?? 'Failed to register patient.');
        return { success: false };
      } catch {
        toast.error('Failed to register patient.');
        return { success: false };
      }
    }
    return { success: false };
  };

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:list');
        if (res?.success) {
          setDoctors(res.data);
        } else {
          toast.error(res?.error ?? 'Failed to load doctors.');
          setDoctors([]);
        }
      } catch {
        toast.error('Failed to load doctors.');
        setDoctors([]);
      }
    } else {
      setDoctors(DEMO_DOCTORS);
    }
    setIsLoading(false);
  }, []);

  const fetchQueue = useCallback(async (doctorId: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:queue', doctorId);
        if (res?.success) {
          setQueue(res.data);
        } else {
          // Real backend error — surface it and show an EMPTY queue. Never fall
          // back to demo patients here: injecting fake people into a live
          // consultation queue would have a clinician act on non-existent
          // patients.
          toast.error(res?.error ?? 'Failed to load patient queue.');
          setQueue([]);
        }
      } catch {
        toast.error('Failed to load patient queue.');
        setQueue([]);
      }
    } else {
      setQueue(DEMO_QUEUE);
    }
    setIsLoading(false);
  }, []);

  const saveConsultation = async (payload: ConsultationPayload) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:consultation:create', payload);
        if (res?.success) {
          toast.success('Consultation record saved successfully!');
          fetchQueue(payload.doctorId);
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to save consultation details.');
          return false;
        }
      } catch {
        toast.error('Failed to save consultation details.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Consultation saved successfully (Demo Mode)!');
    setQueue((prev) => prev.filter((item) => item.appointmentId !== payload.appointmentId));
    setIsLoading(false);
    return true;
  };

  const createWalkInAppointment = async (patientId: string, doctorId: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:appointment:walk-in', { patientId, doctorId });
        if (res?.success) {
          toast.success('Walk-in appointment created successfully!');
          fetchQueue(doctorId);
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to create walk-in appointment.');
          return false;
        }
      } catch {
        toast.error('Local environment save simulation failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Walk-in appointment created (Demo Mode)!');
    setIsLoading(false);
    return true;
  };

  const fetchDoctorDetails = useCallback(async (doctorId: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:get', doctorId);
        if (res?.success) {
          setIsLoading(false);
          return res.data;
        }
      } catch (err) {
        console.error(err);
      }
      // Packaged app: on failure return null rather than a fabricated doctor.
      setIsLoading(false);
      return null;
    }
    setIsLoading(false);
    return DEMO_DOCTORS.find((d) => d.id === doctorId) ?? null;
  }, []);

  const fetchDoctorHistory = useCallback(async (doctorId: string, date: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('doctor:history', { doctorId, date });
        if (res?.success) {
          setIsLoading(false);
          return res.data; // array of history items
        }
      } catch (err) {
        console.error(err);
      }
    }
    setIsLoading(false);
    return []; // fallback for demo
  }, []);

  return {
    doctors,
    queue,
    isLoading,
    currentDoctor,
    fetchMe,
    fetchDoctors,
    fetchQueue,
    fetchDoctorDetails,
    fetchDoctorHistory,
    saveConsultation,
    createWalkInAppointment,
    registerAndStartVisit,
  };
}
