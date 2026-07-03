'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useReception() {
  const [isLoading, setIsLoading] = useState(false);

  const createAppointment = async (payload: { patientId: string; doctorId: string; type: string }) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('reception:appointment:create', payload);
        if (res?.success) {
          toast.success('Patient successfully routed to doctor queue!');
          setIsLoading(false);
          return true;
        } else {
          toast.error(res?.error ?? 'Failed to create appointment.');
          setIsLoading(false);
          return false;
        }
      } catch {
        toast.error('Local environment save simulation failed.');
        setIsLoading(false);
        return false;
      }
    }
    toast.success('Patient successfully routed to doctor queue (Demo Mode)!');
    setIsLoading(false);
    return true;
  };

  return {
    isLoading,
    createAppointment,
  };
}
