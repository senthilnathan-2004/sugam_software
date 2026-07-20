import { IpcMainInvokeEvent } from 'electron';
import { handle } from './authorize.js';
import { calculateAge } from '../age.js';
import { prisma } from '../db.js';

export function registerDashboardIpc() {
  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  handle('dashboard:stats', async (_event: IpcMainInvokeEvent) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [
        todayPatients,
        todayInvoices,
        pendingInvoices,
        todayAppointments,
        allBatches,
        lowStockBatches,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { date: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.invoice.findMany({
          where: { date: { gte: todayStart, lte: todayEnd }, isReturn: false },
          select: { total: true },
        }),
        prisma.invoice.count({
          where: { paymentStatus: 'PENDING' },
        }),
        prisma.appointment.count({
          where: { date: { gte: todayStart, lte: todayEnd }, status: 'PENDING' },
        }),
        prisma.medicineBatch.aggregate({ _sum: { quantity: true } }),
        prisma.medicine.findMany({
          where: { isActive: true },
          select: { reorderLevel: true, batches: { select: { quantity: true } } }
        }).then(medicines => 
          medicines.filter(m => {
            const totalQty = m.batches.reduce((sum, b) => sum + b.quantity, 0);
            return totalQty <= m.reorderLevel;
          }).length
        ),
      ]);

      const todayIncome = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

      return {
        success: true,
        data: {
          todayPatients,
          todayIncome,
          pendingBills: pendingInvoices,
          todayAppointments,
          totalStock: allBatches._sum.quantity ?? 0,
          lowStock: lowStockBatches,
        },
      };
    } catch (error) {
      console.error('[dashboard:stats] Error:', error);
      return {
        success: true,
        data: {
          todayPatients: 0,
          todayIncome: 0,
          pendingBills: 0,
          todayAppointments: 0,
          totalStock: 0,
          lowStock: 0,
        },
      };
    }
  });

  // ─── Monthly Revenue (last 6 months) ──────────────────────────────────────
  handle('dashboard:monthly-revenue', async (_event: IpcMainInvokeEvent) => {
    try {
      const months: { month: string; revenue: number; patients: number; medicineSales: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const [invoices, patientCount] = await Promise.all([
          prisma.invoice.findMany({
            where: { date: { gte: start, lte: end }, isReturn: false },
            select: { total: true, items: true },
          }),
          prisma.appointment.count({ where: { date: { gte: start, lte: end } } }),
        ]);

        const revenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
        
        let medicineSales = 0;
        invoices.forEach((inv) => {
          try {
            const parsedItems = JSON.parse(inv.items);
            if (Array.isArray(parsedItems)) {
              parsedItems.forEach((item: any) => {
                if (item.medicineId) {
                  medicineSales += parseFloat(item.total) || 0;
                }
              });
            }
          } catch (e) {}
        });

        months.push({
          month: start.toLocaleString('default', { month: 'short' }),
          revenue,
          patients: patientCount,
          medicineSales,
        });
      }
      return { success: true, data: months };
    } catch (error) {
      console.error('[dashboard:monthly-revenue] Error:', error);
      // NEVER fabricate financial data. On error, degrade to an honest all-zero
      // 6-month series (the chart still renders, but shows no revenue rather
      // than random numbers that could be mistaken for real takings).
      const empty: { month: string; revenue: number; patients: number; medicineSales: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        empty.push({
          month: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleString('default', { month: 'short' }),
          revenue: 0,
          patients: 0,
          medicineSales: 0,
        });
      }
      return { success: true, data: empty };
    }
  });

  // ─── Today's Appointments List ─────────────────────────────────────────────
  handle('dashboard:today-appointments', async (_event: IpcMainInvokeEvent) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        include: {
          patient: { select: { name: true, patientId: true, phone: true } },
          doctor: {
            select: {
              specialization: true,
              user: { select: { name: true } } as any,
            },
          },
        },
        orderBy: { time: 'asc' },
        take: 10,
      });

      return { success: true, data: appointments };
    } catch {
      return { success: true, data: [] };
    }
  });

  // ─── Recent Patients ───────────────────────────────────────────────────────
  handle('dashboard:recent-patients', async (_event: IpcMainInvokeEvent) => {
    try {
      const patients = await prisma.patient.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          patientId: true,
          name: true,
          dob: true,
          gender: true,
          bloodGroup: true,
          phone: true,
          createdAt: true,
        },
      });
      const withAge = patients.map((p) => ({ ...p, age: calculateAge(p.dob) }));
      return { success: true, data: withAge };
    } catch {
      return { success: true, data: [] };
    }
  });

  // ─── Dashboard Notifications ────────────────────────────────────────────────
  handle('dashboard:notifications', async (_event: IpcMainInvokeEvent) => {
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return { success: true, data: notifications };
    } catch {
      return { success: true, data: [] };
    }
  });

  // ─── Recent Activities ─────────────────────────────────────────────────────
  handle('dashboard:activities', async (_event: IpcMainInvokeEvent) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { user: { select: { name: true, role: true } } },
      });
      return { success: true, data: logs };
    } catch {
      return { success: true, data: [] };
    }
  });
}
