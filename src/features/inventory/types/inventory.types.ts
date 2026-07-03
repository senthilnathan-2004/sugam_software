export interface MedicineCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  gstNo: string;
  isActive: boolean;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  categoryId: string;
  categoryName?: string;
  supplierId: string;
  supplierName?: string;
  barcode?: string | null;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  unit: string;
  reorderLevel: number;
  isActive: boolean;
  totalStock?: number;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  mfgDate: Date;
  expiryDate: Date;
  quantity: number;
  purchasePrice: number;
  supplierId: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName?: string;
  invoiceNo: string;
  date: Date;
  items: string; // JSON List
  subtotal: number;
  gstAmount: number;
  total: number;
  status: 'RECEIVED' | 'CANCELLED';
}
