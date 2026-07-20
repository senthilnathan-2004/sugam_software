import { IpcMainInvokeEvent, dialog, shell } from 'electron';
import { handle } from './authorize.js';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import type { Session } from '../session.js';

export function registerBillingIpc() {
  // ─── List Invoices ────────────────────────────────────────────────────────
  handle('billing:invoice:list', async () => {
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
  handle('billing:invoice:create', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    console.log(
      `[billing:invoice:create] invoked — items=${Array.isArray(data?.items) ? data.items.length : 'none'} ` +
      `total=${data?.total} session=${session ? session.role : 'NONE'}`
    );
    try {
      const {
        patientId,
        doctorId,
        walkinName,
        walkinPhone,
        walkinEmail,
        items,
        discount, // subtotal/gstAmount/total are recomputed server-side (never trusted)
        paymentMode,
        paymentStatus,
        payments, // Split payments array [{mode, amount}]
      } = data;

      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'Invoice must contain at least one item.' };
      }

      const toNum = (v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
      const toInt = (v: any) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
      const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

      // The whole sale runs in one transaction. We RETRY it on an invoiceNo
      // unique-constraint collision (P2002): the number was derived from the
      // highest existing INV-##### (not a raw row count, which a prior delete or
      // an Excel import of custom numbers could make collide), and on the rare
      // residual clash we simply recompute and try again. Explicit timeout so a
      // large cart on a slow disk isn't aborted by Prisma's 5s interactive
      // default with a misleading "Failed to create invoice".
      const runSale = () =>
        prisma.$transaction(
          async (tx) => {
            // 0. Resolve AUTHORITATIVE unit price + GST% from the DB for every
            //    stocked line. The renderer sends price/gstPercent/total but they
            //    MUST NOT be trusted: a tampered IPC call could set total=0 (or a
            //    slashed GST%) while still deducting real stock. We look up the
            //    Medicine row and recompute every amount server-side; the client
            //    figures are ignored. Non-stock lines (no medicineId) keep their
            //    supplied price (e.g. a manual consultation fee).
            const medIds = Array.from(
              new Set(items.filter((i: any) => i.medicineId).map((i: any) => i.medicineId))
            );
            const medRows = medIds.length
              ? await tx.medicine.findMany({
                  where: { id: { in: medIds } },
                  select: { id: true, sellingPrice: true, gstPercent: true, unitsPerPack: true },
                })
              : [];
            const medMap = new Map(medRows.map((m) => [m.id, m]));

            let subtotalCalc = 0;
            let gstCalc = 0;
            const computedItems = items.map((item: any) => {
              const qty = toInt(item.quantity);
              const med = item.medicineId ? medMap.get(item.medicineId) : undefined;
              // Authoritative price/GST from DB for stocked lines; fall back to
              // the client value only for non-stock (medicine-less) lines.
              // sellingPrice is PER PACK (strip); billing quantity is in base
              // units (single tablets), so the rate is sellingPrice/unitsPerPack.
              // Line total is computed from the exact fraction and rounded once,
              // so 15 loose tablets always cost exactly one 15-tablet strip.
              const packSize = med ? Math.max(1, med.unitsPerPack || 1) : 1;
              const unitPrice = med ? med.sellingPrice / packSize : toNum(item.price);
              const gstPercent = med ? med.gstPercent : toNum(item.gstPercent);
              const lineTotal = r2(unitPrice * Math.max(0, qty));
              const lineGst = r2(lineTotal * (gstPercent / 100));
              subtotalCalc += lineTotal;
              gstCalc += lineGst;
              return { ...item, quantity: qty, price: r2(unitPrice), gstPercent, total: lineTotal };
            });
            subtotalCalc = r2(subtotalCalc);
            gstCalc = r2(gstCalc);
            // Discount is a legitimate manual field, but clamp it to [0, gross]
            // so it can't be used to drive the total negative.
            const discountCalc = Math.min(Math.max(0, toNum(discount)), subtotalCalc + gstCalc);
            const totalCalc = r2(subtotalCalc + gstCalc - discountCalc);

            // 1. Validate + deduct stock FIRST (FEFO). A shortage throws and rolls
            //    back the entire sale instead of silently overselling to zero.
            for (const item of items) {
              if (!item.medicineId) continue; // non-stock line (e.g. consultation fee)
              const qtyNeeded = toInt(item.quantity);
              if (qtyNeeded <= 0) continue;

              const batches = await tx.medicineBatch.findMany({
                where: { medicineId: item.medicineId, quantity: { gt: 0 } },
                orderBy: { expiryDate: 'asc' },
              });
              const available = batches.reduce((s, b) => s + b.quantity, 0);
              if (available < qtyNeeded) {
                throw new Error(`INSUFFICIENT_STOCK:${item.name || item.medicineId}`);
              }
              let remaining = qtyNeeded;
              for (const b of batches) {
                if (remaining <= 0) break;
                const take = Math.min(b.quantity, remaining);
                await tx.medicineBatch.update({
                  where: { id: b.id },
                  data: { quantity: b.quantity - take },
                });
                remaining -= take;
              }
            }

            // 2. Create Invoice. Derive the next number from the HIGHEST existing
            //    INV-##### suffix, not count()+1 — count() repeats a number after
            //    any delete and collides with imported custom numbers, which
            //    (invoiceNo being @unique) would brick every future checkout.
            const rows = await tx.$queryRawUnsafe<{ invoiceNo: string }[]>(
              `SELECT invoiceNo FROM "Invoice" WHERE invoiceNo LIKE 'INV-%'`
            );
            let maxNo = 0;
            for (const r of rows) {
              const n = parseInt(String(r.invoiceNo).replace(/^INV-/, ''), 10);
              if (!isNaN(n) && n > maxNo) maxNo = n;
            }
            const invoiceNo = `INV-${String(maxNo + 1).padStart(5, '0')}`;

            const invoice = await tx.invoice.create({
              data: {
                invoiceNo,
                patientId: patientId || null,
                doctorId: doctorId || null,
                walkinName: walkinName || null,
                walkinPhone: walkinPhone || null,
                walkinEmail: walkinEmail || null,
                date: new Date(),
                items: JSON.stringify(computedItems),
                subtotal: subtotalCalc,
                gstAmount: gstCalc,
                discount: discountCalc,
                total: totalCalc,
                paymentMode,
                paymentStatus,
                isReturn: false,
              },
            });

            // 3. Create associated Payment records
            if (payments && payments.length > 0) {
              for (const pay of payments) {
                await tx.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    mode: pay.mode,
                    amount: toNum(pay.amount),
                    reference: pay.reference || null,
                  },
                });
              }
            } else {
              await tx.payment.create({
                data: {
                  invoiceId: invoice.id,
                  mode: paymentMode,
                  amount: totalCalc,
                },
              });
            }

            // 4. Log audit event
            if (session) {
              await tx.auditLog.create({
                data: {
                  userId: session.userId,
                  action: 'CREATE',
                  entity: 'Invoice',
                  entityId: invoice.id,
                },
              });
            }

            return invoice;
          },
          { timeout: 20000 }
        );

      let result;
      for (let attempt = 0; ; attempt++) {
        try {
          result = await runSale();
          break;
        } catch (e: any) {
          // P2002 = unique constraint (invoiceNo). Recompute + retry a few times.
          if (e?.code === 'P2002' && attempt < 5) continue;
          throw e;
        }
      }

      // System notification — advisory only, OUTSIDE the sale transaction.
      // Previously created inside the tx: any notification failure (e.g. a
      // stale schema missing priority/category) rolled back the entire sale
      // and made every checkout fail. A lost notification must never void a
      // completed payment.
      try {
        await prisma.notification.create({
          data: {
            title: 'Invoice Created',
            message: `Invoice ${result.invoiceNo} generated for total ₹${result.total}.`,
            type: 'SUCCESS',
            priority: 'LOW',
            category: 'BILLING',
            relatedEntityId: result.id,
            relatedEntityType: 'Invoice',
          },
        });
      } catch (notifyErr) {
        console.error('[billing:invoice:create] Notification write failed (sale unaffected):', notifyErr);
      }

      return { success: true, data: result };
    } catch (error: any) {
      if (typeof error?.message === 'string' && error.message.startsWith('INSUFFICIENT_STOCK:')) {
        return { success: false, error: `Insufficient stock for ${error.message.split(':')[1]}.` };
      }
      console.error('[billing:invoice:create] Error:', error);
      return { success: false, error: 'Failed to create invoice.' };
    }
  });

  // ─── Return Invoice Item ──────────────────────────────────────────────────
  handle('billing:invoice:return', async (_event: IpcMainInvokeEvent, payload: any, session: Session | null) => {
    try {
      const { invoiceId, reason, items, refundAmount } = payload;

      if (!invoiceId || typeof invoiceId !== 'string') {
        return { success: false, error: 'A valid invoice is required to process a return.' };
      }
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'Select at least one item to return.' };
      }

      const result = await prisma.$transaction(async (tx) => {
        // Load the original invoice so the return can be validated against what
        // was actually sold. Without this the caller controlled BOTH the refund
        // amount and which medicines/quantities to restock — allowing an
        // arbitrary refund and inflating stock for items never on the invoice.
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw new Error('RETURN_INVOICE_NOT_FOUND');

        // Map the quantities that were actually sold (from the stored line items).
        const soldQty = new Map<string, number>();
        try {
          const sold = JSON.parse(invoice.items || '[]');
          for (const s of sold) {
            if (s?.medicineId) {
              soldQty.set(s.medicineId, (soldQty.get(s.medicineId) || 0) + (parseInt(s.quantity, 10) || 0));
            }
          }
        } catch {
          /* legacy/empty items JSON — soldQty stays empty, returns below are rejected */
        }

        // Keep only lines that were on the invoice, clamping each returned qty to
        // what was sold. Unknown medicines are dropped.
        const validItems = [];
        for (const item of items) {
          if (!item?.medicineId) continue;
          const soldForMed = soldQty.get(item.medicineId) || 0;
          const qty = Math.min(Math.max(0, parseInt(item.quantity, 10) || 0), soldForMed);
          if (qty <= 0) continue;
          validItems.push({ ...item, quantity: qty });
        }
        if (validItems.length === 0) {
          throw new Error('RETURN_NO_VALID_ITEMS');
        }

        // Refund cannot be negative nor exceed the invoice total.
        const requested = parseFloat(refundAmount);
        const safeRefund = Math.min(Math.max(0, isNaN(requested) ? 0 : requested), invoice.total);

        const invReturn = await tx.invoiceReturn.create({
          data: {
            invoiceId,
            reason,
            items: JSON.stringify(validItems),
            refundAmount: safeRefund,
          },
        });

        // Set invoice return flag
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { isReturn: true },
        });

        // Restore medicine stock. Sales deduct FEFO across batches and line
        // items only carry a placeholder batchNo ("B-MAIN"), so we cannot match
        // the exact origin batch — restock the earliest-expiry batch for the
        // medicine (mirrors the create-side FEFO pool so total stock is made
        // whole).
        for (const item of validItems) {
          const batch = await tx.medicineBatch.findFirst({
            where: { medicineId: item.medicineId },
            orderBy: { expiryDate: 'asc' },
          });
          if (batch) {
            await tx.medicineBatch.update({
              where: { id: batch.id },
              data: { quantity: batch.quantity + item.quantity },
            });
          }
        }
        return invReturn;
      });

      await writeAudit(session, 'CREATE', 'InvoiceReturn', result.id);
      return { success: true, data: result };
    } catch (error: any) {
      // InvoiceReturn.invoiceId is @unique — a second return against the same
      // invoice hits P2002. Give the cashier a clear message instead of a raw
      // "Failed to log returned invoice items."
      if (error?.code === 'P2002') {
        return { success: false, error: 'This invoice has already been returned.' };
      }
      if (error?.message === 'RETURN_INVOICE_NOT_FOUND') {
        return { success: false, error: 'Invoice not found for this return.' };
      }
      if (error?.message === 'RETURN_NO_VALID_ITEMS') {
        return { success: false, error: 'None of the selected items match this invoice.' };
      }
      console.error('[billing:invoice:return] Error:', error);
      return { success: false, error: 'Failed to log returned invoice items.' };
    }
  });
  // ─── Fetch Unbilled Prescriptions ──────────────────────────────────────────
  handle('billing:patient:prescriptions', async (_event: IpcMainInvokeEvent, patientId: string) => {
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
  handle('billing:export', async () => {
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
  handle('billing:import', async () => {
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

  // ─── Share Invoice via WhatsApp ─────────────────────────────────────────────
  handle('billing:whatsapp:share', async (_event: IpcMainInvokeEvent, payload: any) => {
    try {
      const { phone, message } = payload || {};
      let digits = String(phone ?? '').replace(/\D/g, '');
      if (!digits) return { success: false, error: 'No phone number provided.' };
      // Default to India country code when a bare 10-digit number is given.
      if (digits.length === 10) digits = '91' + digits;
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(String(message ?? ''))}`;
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      console.error('[billing:whatsapp:share] Error:', error);
      return { success: false, error: 'Failed to open WhatsApp.' };
    }
  });
}
