import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

export function registerBillingIpc() {
  // ─── List Invoices ────────────────────────────────────────────────────────
  ipcMain.handle('billing:invoice:list', async () => {
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          patient: { select: { name: true, patientId: true } },
        },
        orderBy: { date: 'desc' },
      });

      const mapped = invoices.map((inv) => ({
        ...inv,
        patientName: inv.patient ? inv.patient.name : (inv.walkinName || 'Walk-in Customer'),
        patientUniqueId: inv.patient ? inv.patient.patientId : (inv.walkinPhone || 'N/A'),
      }));

      return { success: true, data: mapped };
    } catch {
      return { success: false, error: 'Failed to fetch invoices.' };
    }
  });

  // ─── Create Invoice POS ───────────────────────────────────────────────────
  ipcMain.handle('billing:invoice:create', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      const {
        patientId,
        doctorId,
        walkinName,
        walkinPhone,
        walkinEmail,
        items,
        subtotal,
        gstAmount,
        discount,
        total,
        paymentMode,
        paymentStatus,
        payments, // Split payments array [{mode, amount}]
      } = data;

      // Generate invoice number (INV-XXXXX format)
      const count = await prisma.invoice.count();
      const invoiceNo = `INV-${String(count + 1).padStart(5, '0')}`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Invoice record
        const invoice = await tx.invoice.create({
          data: {
            invoiceNo,
            patientId: patientId || null,
            doctorId: doctorId || null,
            walkinName: walkinName || null,
            walkinPhone: walkinPhone || null,
            walkinEmail: walkinEmail || null,
            date: new Date(),
            items: JSON.stringify(items),
            subtotal: parseFloat(subtotal),
            gstAmount: parseFloat(gstAmount),
            discount: parseFloat(discount),
            total: parseFloat(total),
            paymentMode,
            paymentStatus,
            isReturn: false,
          },
        });

        // 2. Create associated Payments records
        if (payments && payments.length > 0) {
          for (const pay of payments) {
            await tx.payment.create({
              data: {
                invoiceId: invoice.id,
                mode: pay.mode,
                amount: parseFloat(pay.amount),
                reference: pay.reference || null,
              },
            });
          }
        } else {
          // Single payment mode logging
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              mode: paymentMode,
              amount: parseFloat(total),
            },
          });
        }

        // 3. Deduct stock quantities from medicine batches
        for (const item of items) {
          // Find batch with enough stock
          const batch = await tx.medicineBatch.findFirst({
            where: {
              medicineId: item.medicineId,
              batchNo: item.batchNo,
              quantity: { gte: parseInt(item.quantity) },
            },
          });

          if (batch) {
            await tx.medicineBatch.update({
              where: { id: batch.id },
              data: { quantity: batch.quantity - parseInt(item.quantity) },
            });
          } else {
            // If specific batch not found, deduct from first available batch of that medicine
            const fallbackBatch = await tx.medicineBatch.findFirst({
              where: { medicineId: item.medicineId },
            });
            if (fallbackBatch) {
              await tx.medicineBatch.update({
                where: { id: fallbackBatch.id },
                data: { quantity: Math.max(0, fallbackBatch.quantity - parseInt(item.quantity)) },
              });
            }
          }
        }

        // 4. Log audit event
        const adminUser = await tx.user.findFirst({ where: { role: 'ADMIN' } });
        if (adminUser) {
          await tx.auditLog.create({
            data: {
              userId: adminUser.id,
              action: 'CREATE',
              entity: 'Invoice',
              entityId: invoice.id,
            },
          });
        }

        // 5. System Notification
        await tx.notification.create({
          data: {
            title: 'Invoice Created',
            message: `Invoice ${invoiceNo} generated for total ₹${total}.`,
            type: 'SUCCESS',
            priority: 'LOW',
            category: 'BILLING',
            relatedEntityId: invoice.id,
            relatedEntityType: 'Invoice',
          } as any
        });

        return invoice;
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('[billing:invoice:create] Error:', error);
      return { success: false, error: 'Failed to create invoice.' };
    }
  });

  // ─── Return Invoice Item ──────────────────────────────────────────────────
  ipcMain.handle('billing:invoice:return', async (_event: IpcMainInvokeEvent, payload: any) => {
    try {
      const { invoiceId, reason, items, refundAmount } = payload;

      const result = await prisma.$transaction(async (tx) => {
        // Create invoice return record
        const invReturn = await tx.invoiceReturn.create({
          data: {
            invoiceId,
            reason,
            items: JSON.stringify(items),
            refundAmount: parseFloat(refundAmount),
          },
        });

        // Set invoice return flag
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { isReturn: true },
        });

        // Restore medicine stock quantities
        for (const item of items) {
          const batch = await tx.medicineBatch.findFirst({
            where: { medicineId: item.medicineId, batchNo: item.batchNo },
          });

          if (batch) {
            await tx.medicineBatch.update({
              where: { id: batch.id },
              data: { quantity: batch.quantity + parseInt(item.quantity) },
            });
          }
        }
        return invReturn;
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('[billing:invoice:return] Error:', error);
      return { success: false, error: 'Failed to log returned invoice items.' };
    }
  });
  // ─── Fetch Unbilled Prescriptions ──────────────────────────────────────────
  ipcMain.handle('billing:patient:prescriptions', async (_event: IpcMainInvokeEvent, patientId: string) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Find the latest appointment for this patient today
      const latestAppointment = await prisma.appointment.findFirst({
        where: {
          patientId,
          date: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { date: 'desc' }, // Order by date desc, though time might be a string. 
        // Wait, date field includes time in appointment? It says date DateTime, time String. Let's just rely on the latest created if we could, but we can't order by createdAt.
        // Prisma will order by the `date` field.
        include: {
          consultation: {
            include: {
              prescription: true,
            },
          },
        },
      });

      if (!latestAppointment || latestAppointment.status !== 'COMPLETED') {
        return { success: false, error: 'No prescription available for this visit.' };
      }

      if (!latestAppointment.consultation || !latestAppointment.consultation.prescription) {
        return { success: false, error: 'No prescription available for this visit.' };
      }

      // Parse medicines JSON
      let medicines = [];
      try {
        medicines = JSON.parse(latestAppointment.consultation.prescription.medicines);
      } catch (e) {
        console.error('Failed to parse prescription medicines');
      }

      return { 
        success: true, 
        data: {
          medicines,
          diagnosis: latestAppointment.consultation.diagnosis,
          notes: latestAppointment.consultation.notes
        } 
      };
    } catch (error) {
      console.error('[billing:patient:prescriptions] Error:', error);
      return { success: false, error: 'Failed to fetch prescriptions.' };
    }
  });

  // ─── Export Invoices to Excel ───────────────────────────────────────────────
  ipcMain.handle('billing:export', async () => {
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          patient: { select: { name: true, patientId: true } },
        },
        orderBy: { date: 'desc' },
      });

      const exportData = invoices.map((inv) => ({
        'Invoice No': inv.invoiceNo,
        Date: new Date(inv.date).toLocaleDateString('en-IN'),
        'Patient Name': inv.patient ? inv.patient.name : (inv.walkinName || 'Walk-in Customer'),
        'Patient ID/Phone': inv.patient ? inv.patient.patientId : (inv.walkinPhone || 'N/A'),
        Subtotal: inv.subtotal,
        'GST Amount': inv.gstAmount,
        Discount: inv.discount,
        Total: inv.total,
        'Payment Mode': inv.paymentMode,
        Status: inv.isReturn ? 'RETURNED' : inv.paymentStatus,
      }));

      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Sales / Invoice Log',
        defaultPath: `Sales_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      });

      if (!filePath) {
        return { success: false, error: 'Export cancelled.' };
      }

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales');

      xlsx.writeFile(workbook, filePath);

      return { success: true, data: filePath };
    } catch (error: any) {
      console.error('[billing:export] Error:', error);
      return { success: false, error: error.message || 'Failed to export sales.' };
    }
  });

  // ─── Import Invoices from Excel ─────────────────────────────────────────────
  ipcMain.handle('billing:import', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Import Sales / Invoice Log',
        properties: ['openFile'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, error: 'Import cancelled.' };
      }

      const filePath = filePaths[0];
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return { success: false, error: 'No data found in the selected file.' };
      }

      const results = await prisma.$transaction(async (tx) => {
        let importedCount = 0;
        let skippedCount = 0;

        for (const row of data) {
          const total = parseFloat(row['Total'] || row['total']);
          if (isNaN(total)) {
            skippedCount++;
            continue; // Skip invalid rows
          }

          const count = await tx.invoice.count();
          const invoiceNo = row['Invoice No'] || row['invoiceNo'] || `INV-${String(count + 1).padStart(5, '0')}`;
          
          let date = new Date();
          const rowDate = row['Date'] || row['date'];
          if (rowDate) {
            const parsed = new Date(rowDate);
            if (!isNaN(parsed.getTime())) date = parsed;
          }

          const invoice = await tx.invoice.create({
            data: {
              invoiceNo: String(invoiceNo),
              walkinName: String(row['Patient Name'] || row['patientName'] || 'Walk-in Customer'),
              walkinPhone: String(row['Patient ID/Phone'] || row['patientId'] || 'N/A'),
              date,
              items: JSON.stringify([]), // Items are not strictly required for historic sales
              subtotal: parseFloat(row['Subtotal'] || row['subtotal'] || String(total)),
              gstAmount: parseFloat(row['GST Amount'] || row['gstAmount'] || '0'),
              discount: parseFloat(row['Discount'] || row['discount'] || '0'),
              total,
              paymentMode: String(row['Payment Mode'] || row['paymentMode'] || 'CASH'),
              paymentStatus: String(row['Status'] || row['status'] || 'PAID'),
              isReturn: String(row['Status'] || '').toUpperCase() === 'RETURNED',
            },
          });

          // Log payment
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              mode: String(row['Payment Mode'] || row['paymentMode'] || 'CASH'),
              amount: total,
            },
          });

          importedCount++;
        }
        return { importedCount, skippedCount };
      });

      return { success: true, data: results };
    } catch (error: any) {
      console.error('[billing:import] Error:', error);
      return { success: false, error: error.message || 'Failed to import sales.' };
    }
  });
}
