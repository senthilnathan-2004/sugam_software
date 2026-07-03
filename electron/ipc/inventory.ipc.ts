import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

export function registerInventoryIpc() {
  // ─── Categories ───────────────────────────────────────────────────────────
  ipcMain.handle('inventory:categories:list', async () => {
    try {
      return { success: true, data: await prisma.medicineCategory.findMany() };
    } catch {
      return { success: false, error: 'Failed to fetch categories.' };
    }
  });

  // ─── Suppliers CRUD ───────────────────────────────────────────────────────
  ipcMain.handle('inventory:suppliers:list', async () => {
    try {
      const suppliers = await prisma.supplier.findMany({ where: { isActive: true } });
      return { success: true, data: suppliers };
    } catch {
      return { success: false, error: 'Failed to fetch suppliers.' };
    }
  });

  ipcMain.handle('inventory:suppliers:create', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      const s = await prisma.supplier.create({ data });
      return { success: true, data: s };
    } catch {
      return { success: false, error: 'Failed to create supplier.' };
    }
  });

  ipcMain.handle('inventory:suppliers:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }) => {
    try {
      const { id, data } = payload;
      const s = await prisma.supplier.update({ where: { id }, data });
      return { success: true, data: s };
    } catch {
      return { success: false, error: 'Failed to update supplier.' };
    }
  });

  ipcMain.handle('inventory:suppliers:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      await prisma.supplier.delete({ where: { id } });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to delete supplier.' };
    }
  });

  // ─── Medicine CRUD ────────────────────────────────────────────────────────
  ipcMain.handle('inventory:medicines:list', async () => {
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

  ipcMain.handle('inventory:medicines:create', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      let categoryName = data.categoryId?.trim();
      let category;

      if (categoryName) {
        category = await prisma.medicineCategory.findFirst({
          where: { name: categoryName }
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

      const m = await prisma.medicine.create({
        data: {
          name: data.name,
          genericName: data.genericName,
          categoryId: category.id,
          supplierId: data.supplierId,
          barcode: data.barcode || null,
          mrp: parseFloat(data.mrp),
          sellingPrice: parseFloat(data.sellingPrice),
          gstPercent: parseFloat(data.gstPercent),
          unit: data.unit,
          reorderLevel: parseInt(data.reorderLevel),
          isActive: true,
        },
      });
      return { success: true, data: m };
    } catch (error) {
      console.error('[inventory:medicines:create] Error:', error);
      return { success: false, error: 'Failed to create medicine.' };
    }
  });

  ipcMain.handle('inventory:medicines:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }) => {
    try {
      const { id, data } = payload;
      let categoryName = data.categoryId?.trim();
      let category;

      if (categoryName) {
        category = await prisma.medicineCategory.findFirst({
          where: { name: categoryName }
        });
        if (!category) {
          category = await prisma.medicineCategory.create({
            data: { name: categoryName, description: 'Added manually' }
          });
        }
      }

      const m = await prisma.medicine.update({
        where: { id },
        data: {
          name: data.name,
          genericName: data.genericName,
          ...(category && { categoryId: category.id }),
          supplierId: data.supplierId,
          barcode: data.barcode || null,
          mrp: parseFloat(data.mrp),
          sellingPrice: parseFloat(data.sellingPrice),
          gstPercent: parseFloat(data.gstPercent),
          unit: data.unit,
          reorderLevel: parseInt(data.reorderLevel),
        },
      });
      return { success: true, data: m };
    } catch (error) {
      console.error('[inventory:medicines:update] Error:', error);
      return { success: false, error: 'Failed to update medicine.' };
    }
  });

  ipcMain.handle('inventory:medicines:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      await prisma.medicine.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('[inventory:medicines:delete] Error:', error);
      return { success: false, error: 'Failed to delete medicine.' };
    }
  });

  // ─── Purchase Orders CRUD ─────────────────────────────────────────────────
  ipcMain.handle('inventory:purchases:list', async () => {
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

  ipcMain.handle('inventory:purchases:create', async (_event: IpcMainInvokeEvent, data: any) => {
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

      return { success: true, data: result };
    } catch (error) {
      console.error('[inventory:purchases:create] Error:', error);
      return { success: false, error: 'Failed to log purchase order.' };
    }
  });

  ipcMain.handle('inventory:purchases:update', async (_event: IpcMainInvokeEvent, payload: { id: string, data: any }) => {
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
      return { success: true, data: po };
    } catch (error) {
      console.error('[inventory:purchases:update] Error:', error);
      return { success: false, error: 'Failed to update purchase order.' };
    }
  });

  ipcMain.handle('inventory:purchases:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      await prisma.purchaseOrder.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('[inventory:purchases:delete] Error:', error);
      return { success: false, error: 'Failed to delete purchase order.' };
    }
  });

  // ─── Expiry & Stock Level Alerts ──────────────────────────────────────────
  ipcMain.handle('inventory:alerts', async () => {
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
  ipcMain.handle('inventory:reports:analytics', async () => {
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
  ipcMain.handle('inventory:reports:export', async () => {
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
