'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Medicine, Supplier, PurchaseOrder, MedicineCategory } from '../types/inventory.types';

// Fallback demo inventory data when running standalone web dev mode
const DEMO_CATEGORIES: MedicineCategory[] = [];
const DEMO_SUPPLIERS: Supplier[] = [];
const DEMO_MEDICINES: Medicine[] = [];
const DEMO_PURCHASES: PurchaseOrder[] = [];
const DEMO_ALERTS = {
  lowStock: [],
  expiring: [],
};

async function safeInvoke<T>(channel: string, fallback: T, payload?: any): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const res = await window.electronAPI.invoke(channel, payload);
      if (res?.success) return res.data as T;
    } catch {}
  }
  return fallback;
}

export function useInventory() {
  const [categories, setCategories] = useState<MedicineCategory[]>(DEMO_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    const data = await safeInvoke<MedicineCategory[]>('inventory:categories:list', DEMO_CATEGORIES);
    setCategories(data);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const data = await safeInvoke<Supplier[]>('inventory:suppliers:list', DEMO_SUPPLIERS);
    setSuppliers(data);
  }, []);

  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke<Medicine[]>('inventory:medicines:list', DEMO_MEDICINES);
    setMedicines(data);
    setIsLoading(false);
  }, []);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    const data = await safeInvoke<PurchaseOrder[]>('inventory:purchases:list', DEMO_PURCHASES);
    setPurchases(data);
    setIsLoading(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const data = await safeInvoke('inventory:alerts', DEMO_ALERTS);
    setAlerts(data);
  }, []);

  const saveSupplier = async (data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:suppliers:create', data);
        if (res?.success) {
          toast.success('Supplier registered successfully!');
          fetchSuppliers();
          return true;
        }
        toast.error(res?.error ?? 'Failed to create supplier.');
        return false;
      } catch {
        toast.error('Failed to create supplier.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Supplier created (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const saveMedicine = async (data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:medicines:create', data);
        if (res?.success) {
          toast.success('Medicine created successfully!');
          fetchMedicines();
          return true;
        }
        toast.error(res?.error ?? 'Failed to create medicine.');
        return false;
      } catch {
        toast.error('Failed to create medicine.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Medicine created (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const saveMedicinesBulk = async (dataArray: any[]) => {
    setIsLoading(true);
    let successCount = 0;
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        for (const data of dataArray) {
          const res = await window.electronAPI.invoke('inventory:medicines:create', data);
          if (res?.success) successCount++;
        }
        if (successCount === dataArray.length) {
          toast.success(`Imported ${successCount} medicines!`);
        } else {
          toast.error(`Imported ${successCount} of ${dataArray.length} medicines; ${dataArray.length - successCount} failed.`);
        }
        fetchMedicines();
        return successCount > 0;
      } catch (e) {
        toast.error('Error importing medicines.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success(`Imported ${dataArray.length} medicines (Demo Mode)`);
    setIsLoading(false);
    return true;
  };

  const savePurchase = async (data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:purchases:create', data);
        if (res?.success) {
          toast.success('Purchase logged successfully!');
          fetchPurchases();
          return true;
        }
        toast.error(res?.error ?? 'Failed to log purchase order.');
        return false;
      } catch {
        toast.error('Failed to log purchase order.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success('Purchase logged successfully (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const savePurchasesBulk = async (dataArray: any[]) => {
    setIsLoading(true);
    let successCount = 0;
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        for (const data of dataArray) {
          const res = await window.electronAPI.invoke('inventory:purchases:create', data);
          if (res?.success) successCount++;
        }
        if (successCount === dataArray.length) {
          toast.success(`Imported ${successCount} purchases!`);
        } else {
          toast.error(`Imported ${successCount} of ${dataArray.length} purchases; ${dataArray.length - successCount} failed.`);
        }
        fetchPurchases();
        return successCount > 0;
      } catch (e) {
        toast.error('Error importing purchases.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    toast.success(`Imported ${dataArray.length} purchases (Demo Mode)`);
    setIsLoading(false);
    return true;
  };

  const deleteSupplier = async (id: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:suppliers:delete', id);
        if (res?.success) {
          toast.success('Supplier deleted successfully!');
          fetchSuppliers();
          return true;
        }
        toast.error(res?.error || 'Failed to delete supplier');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    toast.success('Supplier deleted (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const deleteMedicine = async (id: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:medicines:delete', id);
        if (res?.success) {
          toast.success('Medicine deleted successfully!');
          fetchMedicines();
          return true;
        }
        toast.error(res?.error || 'Failed to delete medicine');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setMedicines(prev => prev.filter(m => m.id !== id));
    toast.success('Medicine deleted (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const deletePurchase = async (id: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:purchases:delete', id);
        if (res?.success) {
          toast.success('Purchase order deleted successfully!');
          fetchPurchases();
          return true;
        }
        toast.error(res?.error || 'Failed to delete purchase order');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setPurchases(prev => prev.filter(p => p.id !== id));
    toast.success('Purchase order deleted (Demo Mode)');
    setIsLoading(false);
    return true;
  };

  const updateSupplier = async (id: string, data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:suppliers:update', { id, data });
        if (res?.success) {
          toast.success('Supplier updated successfully!');
          fetchSuppliers();
          return true;
        }
        toast.error(res?.error || 'Failed to update supplier');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(false);
    return false;
  };

  const updateMedicine = async (id: string, data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:medicines:update', { id, data });
        if (res?.success) {
          toast.success('Medicine updated successfully!');
          fetchMedicines();
          return true;
        }
        toast.error(res?.error || 'Failed to update medicine');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(false);
    return false;
  };

  const updatePurchase = async (id: string, data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('inventory:purchases:update', { id, data });
        if (res?.success) {
          toast.success('Purchase order updated successfully!');
          fetchPurchases();
          return true;
        }
        toast.error(res?.error || 'Failed to update purchase order');
        return false;
      } catch {
        toast.error('Error connecting to backend');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(false);
    return false;
  };

  return {
    categories,
    suppliers,
    medicines,
    purchases,
    alerts,
    isLoading,
    fetchCategories,
    fetchSuppliers,
    fetchMedicines,
    fetchPurchases,
    fetchAlerts,
    saveSupplier,
    saveMedicine,
    saveMedicinesBulk,
    savePurchase,
    savePurchasesBulk,
    deleteSupplier,
    deleteMedicine,
    deletePurchase,
    updateSupplier,
    updateMedicine,
    updatePurchase,
  };
}
