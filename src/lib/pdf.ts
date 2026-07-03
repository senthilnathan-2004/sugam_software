import { jsPDF } from 'jspdf';

interface InvoiceData {
  invoiceNo: string;
  date: Date | string;
  subtotal: number;
  gstAmount: number;
  discount: number;
  total: number;
  paymentMode: string;
  paymentStatus: string;
  items: { name: string; batchNo: string; quantity: number; price: number; total: number }[];
}

interface PatientData {
  name: string;
  patientId: string;
  phone: string;
  address: string;
}

/**
 * Generates an A4 Tax Invoice PDF client-side and triggers a download.
 */
export function generateInvoicePDF(invoice: InvoiceData, patient: PatientData) {
  const doc = new jsPDF();

  // 1. Title Header Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175); // Royal Blue
  doc.text('SUGAM GENERAL HOSPITAL', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('123, Healthcare Avenue, Chennai, TN 600001', 20, 31);
  doc.text('GST No: 33AABCU9603R1ZM', 20, 36);

  // 2. Tax Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('TAX INVOICE', 140, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 140, 31);
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 140, 36);

  // Divider Line
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(20, 42, 190, 42);

  // 3. Billing details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BILLED TO:', 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Patient Name: ${patient.name}`, 20, 56);
  doc.text(`Patient ID: ${patient.patientId}`, 20, 62);
  doc.text(`Contact Phone: ${patient.phone}`, 20, 68);
  doc.text(`Address: ${patient.address}`, 20, 74);

  // Payment info
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS:', 130, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Mode: ${invoice.paymentMode}`, 130, 56);
  doc.text(`Status: ${invoice.paymentStatus}`, 130, 62);

  // 4. Items Table
  let currentY = 85;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(20, currentY, 170, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('#', 22, currentY + 6);
  doc.text('Item Description', 32, currentY + 6);
  doc.text('Batch', 95, currentY + 6);
  doc.text('Qty', 125, currentY + 6);
  doc.text('Price (INR)', 140, currentY + 6);
  doc.text('Total (INR)', 170, currentY + 6);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  invoice.items.forEach((item, index) => {
    doc.text(String(index + 1), 22, currentY + 6);
    doc.text(item.name, 32, currentY + 6);
    doc.text(item.batchNo, 95, currentY + 6);
    doc.text(String(item.quantity), 125, currentY + 6);
    doc.text(item.price.toFixed(2), 140, currentY + 6);
    doc.text(item.total.toFixed(2), 170, currentY + 6);

    currentY += 8;
  });

  // 5. Totals
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 130, currentY + 6);
  doc.text(invoice.subtotal.toFixed(2), 170, currentY + 6);

  currentY += 6;
  doc.text('GST Tax Amount:', 130, currentY + 6);
  doc.text(invoice.gstAmount.toFixed(2), 170, currentY + 6);

  if (invoice.discount > 0) {
    currentY += 6;
    doc.setTextColor(220, 38, 38);
    doc.text('Discount:', 130, currentY + 6);
    doc.text(`- ${invoice.discount.toFixed(2)}`, 170, currentY + 6);
    doc.setTextColor(15, 23, 42);
  }

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET TOTAL PAYABLE:', 130, currentY + 6);
  doc.text(invoice.total.toFixed(2), 170, currentY + 6);

  // Footer Disclaimer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer generated invoice. No signature required.', 65, 280);

  // Save the PDF
  doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
}
