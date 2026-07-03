'use client';

import { toast } from 'sonner';

export function useIpc() {
  const invoke = async <T>(channel: string, payload?: any): Promise<T | null> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const response = await window.electronAPI.invoke(channel, payload);
        if (response?.success === false) {
          toast.error(response?.error || 'System operation failed.');
          return null;
        }
        return response?.data !== undefined ? (response.data as T) : (response as T);
      } catch (error: any) {
        console.error(`[IPC Invoke Error: ${channel}]`, error);
        toast.error(`IPC communication error: ${error.message}`);
        return null;
      }
    }
    console.warn(`[IPC Demo Mode]: Called ${channel} with`, payload);
    return null;
  };

  return { invoke };
}
