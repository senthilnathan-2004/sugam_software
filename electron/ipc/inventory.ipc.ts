import { IpcMainInvokeEvent, dialog } from 'electron';
import { handle } from './authorize.js';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import type { Session } from '../session.js';
import { SupplierCreateSchema, SupplierUpdateSchema } from './schemas/inventory.js';

export function registerInventoryIpc() {
  // ─── Categories ───────────────────────────────────────────────────────────
  handle('inventory:categories:list', async () => {
    try {
      return { success: true, data: await prisma.medicineCategory.findMany() };
    } catch {
      return { success: false, error: 'Failed to fetch categories.' };
    }
  });

  // ─── Suppliers CRUD ───────────────────────────────────────────────────────
  handle('inventory:suppliers:list', async () => {
    try {
      const suppliers = await prisma.supplier.findMany({ where: { isActive: true } });
      return { success: true, data: suppliers };
    } catch {
      return { success: false, error: 'Failed to fetch suppliers.' };
    }
  });

  handle('inventory:suppliers:create', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    // Whitelist + validate: zod strips any extra keys, killing mass-assignment.
    const parsed = SupplierCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid supplier data.' };
    }
    try {
      const s = await prisma.supplier.create({ data: parsed.data });
      await writeAudit(session, 'CREATE', 'Supplier', s.id);
      return { success: true, data: s };
    } catch {
      return { success: false, error: 'Failed to create supplier.' };
    }
  });

  handle('inventory:suppliers:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }, session: Session | null) => {
    const id = payload?.id;
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Supplier id is required.' };
    }
    const parsed = SupplierUpdateSchema.safeParse(payload?.data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid supplier data.' };
    }
    try {
      const s = await prisma.supplier.update({ where: { id }, data: parsed.data });
      await writeAudit(session, 'UPDATE', 'Supplier', id);
      return { success: true, data: s };
    } catch {
      return { success: false, error: 'Failed to update supplier.' };
    }
  });

  handle('inventory:suppliers:delete', async (_event: IpcMainInvokeEvent, id: string, session: Session | null) => {
    try {
      await prisma.supplier.delete({ where: { id } });
      await writeAudit(session, 'DELETE', 'Supplier', id);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to delete supplier.' };
    }
  });

  // ─── Medicine CRUD ────────────────────────────────────────────────────────
  handle('inventory:medicines:list', async () => {
    try {
      const medicines = await prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
          batches: { select: { quantity: true } },
        },
      });

      const mapped = medicines.map((m) => {
        const totalStock = m.batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          ...m,
          categoryName: m.category.name,
          supplierName: m.supplier.name,
          totalStock,
        };
      });

      return { success: true, data: mapped };
    } catch (error) {
      console.error('[inventory:medicines:list] Error:', error);
      return { success: false, error: 'Failed to fetch medicines.' };
    }
  });

  handle('inventory:medicines:create', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    try {
      // Map keys to support both Form submissions and the Excel Upload structure
      const name = data.name || data.MedicineName || data.ItemName;
      const genericName = data.genericName || data.GenericName || 'N/A';
      let categoryName = (data.categoryId || data.Category)?.trim();
      const supplierId = data.supplierId || data.Supplier || null;
      const barcode = data.barcode || data.ItemCode || data.Barcode || null;
      
      const mrp = parseFloat(data.mrp || data.MRP || 0);
      const sellingPrice = parseFloat(data.sellingPrice || data.RetailPrice || data.SellingPrice || mrp);
      const gstPercent = parseFloat(data.gstPercent || data.TaxPercentage || data.GST || 0);
      const unit = data.unit || data.UnitOfMeasure || data.Unit || 'STRIP';
      // Tablets per strip/pack. Stock + billing count single tablets; selling
      // price stays per pack, so this must never be 0 (it is a divisor).
      const unitsPerPack = Math.max(1, parseInt(data.unitsPerPack || data.UnitsPerPack || data.TabletsPerStrip || 1) || 1);
      const reorderLevel = parseInt(data.reorderLevel || data.ReorderLevel || 10);

      if (!name) {
        throw new Error('Medicine name is required.');
      }

      let category;
      if (categoryName) {
        category = await prisma.medicineCategory.findFirst({
          // On create the form sends a category NAME; on edit it sends the
          // existing category's id (UUID). Match either so editing a medicine
          // never spawns a junk category named after the id.
          where: { OR: [{ id: categoryName }, { name: categoryName }] }
        });
        if (!category) {
          category = await prisma.medicineCategory.create({
            data: { name: categoryName, description: 'Added manually' }
          });
        }
      } else {
        category = await prisma.medicineCategory.findFirst();
        if (!category) {
          category = await prisma.medicineCategory.create({
            data: { name: 'General', description: 'Default medicine category' },
          });
        }
      }

      // We need a supplier. If none provided, find first or create one
      let actualSupplierId = supplierId;
      if (!actualSupplierId) {
        let defaultSupplier = await prisma.supplier.findFirst();
        if (!defaultSupplier) {
           defaultSupplier = await prisma.supplier.create({
             data: { 
               name: 'Default Supplier', 
               contact: 'N/A',
               email: 'default@example.com',
               address: 'N/A',
               gstNo: 'N/A'
             }
           });
        }
        actualSupplierId = defaultSupplier.id;
      }

      const m = await prisma.medicine.create({
        data: {
          name,
          genericName,
          categoryId: category.id,
          supplierId: actualSupplierId,
          barcode: barcode,
          mrp: isNaN(mrp) ? 0 : mrp,
          sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
          gstPercent: isNaN(gstPercent) ? 0 : gstPercent,
          unit,
          unitsPerPack,
          reorderLevel: isNaN(reorderLevel) ? 10 : reorderLevel,
          isActive: true,
        },
      });
      await writeAudit(session, 'CREATE', 'Medicine', m.id);
      return { success: true, data: m };
    } catch (error) {
      console.error('[inventory:medicines:create] Error:', error);
      return { success: false, error: 'Failed to create medicine.' };
    }
  });

  handle('inventory:medicines:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }, session: Session | null) => {
    try {
      const { id, data } = payload;
      let categoryName = data.categoryId?.trim();
      let category;

      if (categoryName) {
        category = await prisma.medicineCategory.findFirst({
          // On create the form sends a category NAME; on edit it sends the
          // existing category's id (UUID). Match either so editing a medicine
          // never spawns a junk category named after the id.
          where: { OR: [{ id: categoryName }, { name: categoryName }] }
        });
        if (!category) {
          category = await prisma.medicineCategory.create({
            data: { name: categoryName, description: 'Added manually' }
          });
        }
      }

      // Guard every numeric coercion: an omitted/blank field must not write NaN
      // into a Float/Int column (mirrors the create handler's isNaN checks).
      const num = (v: any, fallback: number) => {
        const n = parseFloat(v);
        return isNaN(n) ? fallback : n;
      };
      const int = (v: any, fallback: number) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? fallback : n;
      };

      const m = await prisma.medicine.update({
        where: { id },
        data: {
          name: data.name,
          genericName: data.genericName,
          ...(category && { categoryId: category.id }),
          supplierId: data.supplierId,
          barcode: data.barcode || null,
          mrp: num(data.mrp, 0),
          sellingPrice: num(data.sellingPrice, 0),
          gstPercent: num(data.gstPercent, 0),
          unit: data.unit,
          unitsPerPack: Math.max(1, int(data.unitsPerPack, 1)),
          reorderLevel: int(data.reorderLevel, 10),
        },
      });
      await writeAudit(session, 'UPDATE', 'Medicine', payload.id);
      return { success: true, data: m };
    } catch (error) {
      console.error('[inventory:medicines:update] Error:', error);
      return { success: false, error: 'Failed to update medicine.' };
    }
  });

  handle('inventory:medicines:delete', async (_event: IpcMainInvokeEvent, id: string, session: Session | null) => {
    try {
      await prisma.medicine.delete({ where: { id } });
      await writeAudit(session, 'DELETE', 'Medicine', id);
      return { success: true };
    } catch (error) {
      console.error('[inventory:medicines:delete] Error:', error);
      return { success: false, error: 'Failed to delete medicine.' };
    }
  });

  // ─── Purchase Orders CRUD ─────────────────────────────────────────────────
  handle('inventory:purchases:list', async () => {
    try {
      const purchases = await prisma.purchaseOrder.findMany({
        include: { supplier: { select: { name: true } } },
        orderBy: { date: 'desc' },
      });
      const mapped = purchases.map((p) => ({
        ...p,
        supplierName: p.supplier.name,
      }));
      return { success: true, data: mapped };
    } catch {
      return { success: false, error: 'Failed to fetch purchases.' };
    }
  });

  handle('inventory:purchases:create', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    try {
      const { supplierId, invoiceNo, items, subtotal, gstAmount, total } = data;

      const result = await prisma.$transaction(async (tx) => {
        // Create Purchase Order record
        const po = await tx.purchaseOrder.create({
          data: {
            supplierId,
            invoiceNo,
            date: new Date(),
            items: JSON.stringify(items),
            subtotal: parseFloat(subtotal),
            gstAmount: parseFloat(gstAmount),
            total: parseFloat(total),
            status: 'RECEIVED',
          },
        });

        // Add/update batches for items
        for (const item of items) {
          await tx.medicineBatch.create({
            data: {
              medicineId: item.medicineId,
              batchNo: item.batchNo,
              mfgDate: new Date(item.mfgDate),
              expiryDate: new Date(item.expiryDate),
              quantity: parseInt(item.quantity),
              purchasePrice: parseFloat(item.purchasePrice),
              supplierId,
            },
          });
        }
        return po;
      });

      await writeAudit(session, 'CREATE', 'PurchaseOrder', result.id);
      return { success: true, data: result };
    } catch (error) {
      console.error('[inventory:purchases:create] Error:', error);
      return { success: false, error: 'Failed to log purchase order.' };
    }
  });

  handle('inventory:purchases:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }, session: Session | null) => {
    try {
      const { id, data } = payload;
      const { supplierId, invoiceNo, subtotal, gstAmount, total } = data;
      
      const po = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          invoiceNo,
          subtotal: parseFloat(subtotal),
          gstAmount: parseFloat(gstAmount),
          total: parseFloat(total),
        },
      });
      await writeAudit(session, 'UPDATE', 'PurchaseOrder', payload.id);
      return { success: true, data: po };
    } catch (error) {
      console.error('[inventory:purchases:update] Error:', error);
      return { success: false, error: 'Failed to update purchase order.' };
    }
  });

  handle('inventory:purchases:delete', async (_event: IpcMainInvokeEvent, id: string, session: Session | null) => {
    try {
      await prisma.purchaseOrder.delete({ where: { id } });
      await writeAudit(session, 'DELETE', 'PurchaseOrder', id);
      return { success: true };
    } catch (error) {
      console.error('[inventory:purchases:delete] Error:', error);
      return { success: false, error: 'Failed to delete purchase order.' };
    }
  });

  // ─── Expiry & Stock Level Alerts ──────────────────────────────────────────
  handle('inventory:alerts', async () => {
    try {
      const [lowStock, expiring] = await Promise.all([
        // Medicines where total stock is below reorderLevel
        prisma.medicine.findMany({
          where: { isActive: true },
          include: { batches: { select: { quantity: true } } },
        }),
        // Batches expiring within next 90 days
        prisma.medicineBatch.findMany({
          where: {
            expiryDate: {
              lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
          },
          include: { medicine: { select: { name: true } } },
          orderBy: { expiryDate: 'asc' },
        }),
      ]);

      const lowStockAlerts = lowStock
        .map((m) => {
          const totalStock = m.batches.reduce((sum, b) => sum + b.quantity, 0);
          return {
            id: m.id,
            name: m.name,
            totalStock,
            reorderLevel: m.reorderLevel,
          };
        })
        .filter((m) => m.totalStock <= m.reorderLevel);

      const expiryAlerts = expiring.map((b) => ({
        id: b.id,
        name: b.medicine.name,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
      }));

      return {
        success: true,
        data: {
          lowStock: lowStockAlerts,
          expiring: expiryAlerts,
        },
      };
    } catch (error) {
      console.error('[inventory:alerts] Error:', error);
      return { success: false, error: 'Failed to fetch inventory warnings.' };
    }
  });

  // ─── Inventory Analytics for Reports Page ─────────────────────────────────
  handle('inventory:reports:analytics', async () => {
    try {
      // 1. Stock by Category
      const categories = await prisma.medicineCategory.findMany({
        include: {
          medicines: {
            include: {
              batches: { select: { quantity: true } },
            },
          },
        },
      });

      const stockData = categories.map((cat) => {
        let catStock = 0;
        cat.medicines.forEach((m) => {
          m.batches.forEach((b) => {
            catStock += b.quantity;
          });
        });
        return { name: cat.name, stock: catStock };
      });

      // 2. Inventory Health (In Stock, Low Stock, Out of Stock)
      const medicines = await prisma.medicine.findMany({
        where: { isActive: true },
        include: { batches: { select: { quantity: true } } },
      });

      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;

      medicines.forEach((m) => {
        const totalStock = m.batches.reduce((sum, b) => sum + b.quantity, 0);
        if (totalStock === 0) outOfStock++;
        else if (totalStock <= m.reorderLevel) lowStock++;
        else inStock++;
      });

      const statusData = [
        { name: 'In Stock', value: inStock, color: '#10b981' },
        { name: 'Low Stock', value: lowStock, color: '#f59e0b' },
        { name: 'Out of Stock', value: outOfStock, color: '#ef4444' },
      ].filter((s) => s.value > 0);

      // 3. Recent Movements (combine POs and Invoices)
      const recentPOs = await prisma.purchaseOrder.findMany({
        orderBy: { date: 'desc' },
        take: 5,
      });

      const recentInvoices = await prisma.invoice.findMany({
        orderBy: { date: 'desc' },
        take: 5,
      });

      const movements = [
        ...recentPOs.map((po) => {
          let itemsCount = 0;
          try {
            const parsed = JSON.parse(po.items);
            itemsCount = parsed.length;
          } catch {}
          return {
            date: po.date,
            type: 'IN',
            reference: po.invoiceNo,
            items: itemsCount,
            value: po.total,
          };
        }),
        ...recentInvoices.map((inv) => {
          let itemsCount = 0;
          try {
            const parsed = JSON.parse(inv.items);
            itemsCount = parsed.length;
          } catch {}
          return {
            date: inv.date,
            type: 'OUT',
            reference: inv.invoiceNo,
            items: itemsCount,
            value: inv.total,
          };
        }),
      ];

      movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const movementData = movements.slice(0, 10);

      return {
        success: true,
        data: {
          stockData,
          statusData,
          movementData,
        },
      };
    } catch (error) {
      console.error('[inventory:reports:analytics] Error:', error);
      return { success: false, error: 'Failed to generate inventory analytics.' };
    }
  });

  // ─── Export Inventory Reports to Excel ────────────────────────────────────
  handle('inventory:reports:export', async () => {
    try {
      // Re-use logic from analytics for stock by category
      const categories = await prisma.medicineCategory.findMany({
        include: {
          medicines: {
            include: {
              batches: { select: { quantity: true } },
            },
          },
        },
      });

      const stockData = categories.map((cat) => {
        let catStock = 0;
        cat.medicines.forEach((m) => {
          m.batches.forEach((b) => {
            catStock += b.quantity;
          });
        });
        return { Category: cat.name, 'Total Stock (Units)': catStock };
      });

      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Inventory Analytics',
        defaultPath: `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      });

      if (!filePath) {
        return { success: false, error: 'Export cancelled.' };
      }

      const worksheet = xlsx.utils.json_to_sheet(stockData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Stock Analytics');

      xlsx.writeFile(workbook, filePath);

      return { success: true, data: filePath };
    } catch (error: any) {
      console.error('[inventory:reports:export] Error:', error);
      return { success: false, error: error.message || 'Failed to export inventory reports.' };
    }
  });
}
