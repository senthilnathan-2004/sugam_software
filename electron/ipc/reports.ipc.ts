import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function registerReportsIpc() {
  // ─── Revenue & Invoices Report ─────────────────────────────────────────────
  ipcMain.handle(
    'reports:revenue',
    async (_event: IpcMainInvokeEvent, payload: { startDate: string; endDate: string }) => {
      try {
        const start = new Date(payload.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(payload.endDate);
        end.setHours(23, 59, 59, 999);

        const invoices = await prisma.invoice.findMany({
          where: {
            date: { gte: start, lte: end },
            isReturn: false,
          },
          include: { patient: { select: { name: true } } },
          orderBy: { date: 'asc' },
        });

        // Fetch Purchase Orders for expenses
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          where: {
            date: { gte: start, lte: end },
          },
        });

        let totalExpenses = 0;
        purchaseOrders.forEach((po) => {
          totalExpenses += po.total;
        });

        // Group by day for charting
        const grouped: Record<string, number> = {};
        let totalRevenue = 0;
        let totalDiscount = 0;
        let totalGst = 0;
        let medicineSales = 0;

        invoices.forEach((inv) => {
          const dateStr = new Date(inv.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          });
          grouped[dateStr] = (grouped[dateStr] || 0) + inv.total;
          totalRevenue += inv.total;
          totalDiscount += inv.discount;
          totalGst += inv.gstAmount;

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

        const chartData = Object.entries(grouped).map(([date, amount]) => ({
          date,
          amount,
        }));

        const items = invoices.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          patientName: inv.patient ? inv.patient.name : (inv.walkinName || 'Walk-in Customer'),
          paymentMode: inv.paymentMode,
          total: inv.total,
        }));

        return {
          success: true,
          data: {
            chartData,
            items,
            summary: {
              totalRevenue,
              totalExpenses,
              netProfit: totalRevenue - totalExpenses,
              medicineSales,
              totalDiscount,
              totalGst,
              invoiceCount: invoices.length,
            },
          },
        };
      } catch (error) {
        console.error('[reports:revenue] Error:', error);
        return { success: false, error: 'Failed to generate revenue report.' };
      }
    }
  );

  // ─── Patient Traffic & Registrations Report ────────────────────────────────
  ipcMain.handle(
    'reports:patients',
    async (_event: IpcMainInvokeEvent, payload: { startDate: string; endDate: string }) => {
      try {
        const start = new Date(payload.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(payload.endDate);
        end.setHours(23, 59, 59, 999);

        const [patients, visits] = await Promise.all([
          prisma.patient.findMany({
            where: { createdAt: { gte: start, lte: end }, isDeleted: false },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.patientVisit.findMany({
            where: { date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
          }),
        ]);

        // Group registrations by day
        const groupedRegs: Record<string, number> = {};
        patients.forEach((p) => {
          const dateStr = new Date(p.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          });
          groupedRegs[dateStr] = (groupedRegs[dateStr] || 0) + 1;
        });

        // Group visits by day
        const groupedVisits: Record<string, number> = {};
        visits.forEach((v) => {
          const dateStr = new Date(v.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          });
          groupedVisits[dateStr] = (groupedVisits[dateStr] || 0) + 1;
        });

        // Create unified chart dataset
        const datesSet = new Set([...Object.keys(groupedRegs), ...Object.keys(groupedVisits)]);
        const chartData = Array.from(datesSet).map((date) => ({
          date,
          registrations: groupedRegs[date] || 0,
          visits: groupedVisits[date] || 0,
        }));

        return {
          success: true,
          data: {
            chartData,
            summary: {
              newRegistrations: patients.length,
              totalVisits: visits.length,
            },
          },
        };
      } catch (error) {
        console.error('[reports:patients] Error:', error);
        return { success: false, error: 'Failed to generate patient traffic report.' };
      }
    }
  );

  // ─── Inventory Stock Level Valuation Report ────────────────────────────────
  ipcMain.handle('reports:inventory', async () => {
    try {
      const medicines = await prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          category: { select: { name: true } },
          batches: { select: { quantity: true, purchasePrice: true } },
        },
      });

      let totalValuation = 0;
      let totalStockItems = 0;

      const items = medicines.map((m) => {
        const qty = m.batches.reduce((sum, b) => sum + b.quantity, 0);
        // Average purchase price or selling price fallback
        const avgCost =
          m.batches.length > 0
            ? m.batches.reduce((sum, b) => sum + b.purchasePrice, 0) / m.batches.length
            : m.mrp * 0.7; // default estimation

        const valuation = qty * avgCost;

        totalValuation += valuation;
        totalStockItems += qty;

        return {
          id: m.id,
          name: m.name,
          categoryName: m.category.name,
          quantity: qty,
          valuation,
        };
      });

      return {
        success: true,
        data: {
          items,
          summary: {
            totalValuation,
            totalStockItems,
          },
        },
      };
    } catch (error) {
      console.error('[reports:inventory] Error:', error);
      return { success: false, error: 'Failed to generate inventory valuation report.' };
    }
  });
  // ─── Doctor Performance Report ───────────────────────────────────────────────
  ipcMain.handle(
    'reports:doctors',
    async (_event: IpcMainInvokeEvent, payload: { startDate: string; endDate: string }) => {
      try {
        const start = new Date(payload.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(payload.endDate);
        end.setHours(23, 59, 59, 999);

        // Fetch all doctors with their user info
        const doctors = await prisma.doctor.findMany({
          include: {
            user: { select: { name: true } },
          },
        });

        // Fetch all appointments in range to count consultations
        const appointments = await prisma.appointment.findMany({
          where: { date: { gte: start, lte: end } },
        });

        // Fetch all invoices in range to count revenue per doctor
        const invoices = await prisma.invoice.findMany({
          where: { date: { gte: start, lte: end }, isReturn: false },
        });

        // Group appointments by date for chart
        const groupedChart: Record<string, number> = {};
        let totalConsultations = 0;
        let totalRevenue = 0;

        appointments.forEach((apt) => {
          const dateStr = new Date(apt.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          });
          groupedChart[dateStr] = (groupedChart[dateStr] || 0) + 1;
          totalConsultations++;
        });

        const chartData = Object.entries(groupedChart).map(([date, consultations]) => ({
          date,
          consultations,
        }));

        // Calculate per-doctor stats
        const items = doctors.map((doc) => {
          const docAppointments = appointments.filter((a) => a.doctorId === doc.id).length;
          const docRevenue = invoices
            .filter((i) => i.doctorId === doc.id)
            .reduce((sum, inv) => sum + inv.total, 0);
            
          totalRevenue += docRevenue;

          return {
            id: doc.id,
            doctorName: doc.user.name,
            department: doc.specialization,
            consultations: docAppointments,
            revenue: docRevenue,
          };
        });

        // Sort items by revenue descending
        items.sort((a, b) => b.revenue - a.revenue);

        return {
          success: true,
          data: {
            chartData,
            items,
            summary: {
              totalDoctors: doctors.length,
              totalConsultations,
              totalRevenue,
            },
          },
        };
      } catch (error) {
        console.error('[reports:doctors] Error:', error);
        return { success: false, error: 'Failed to generate doctor performance report.' };
      }
    }
  );
}
