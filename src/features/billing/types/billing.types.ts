export interface InvoiceItem {
  medicineId: string;
  name: string;
  batchNo: string;
  quantity: number;
  price: number; // Selling price
  mrp: number;
  gstPercent: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string;
  patientName?: string;
  patientUniqueId?: string;
  doctorId?: string | null;
  doctorName?: string | null;
  date: Date;
  items: string; // JSON List
  subtotal: number;
  gstAmount: number;
  discount: number;
  total: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  paymentStatus: 'PAID' | 'PENDING';
  isReturn: boolean;
}

export interface Payment {
  id: string;
  invoiceId: string;
  mode: 'CASH' | 'UPI' | 'CARD';
  amount: number;
  reference?: string | null;
  paidAt: Date;
}
