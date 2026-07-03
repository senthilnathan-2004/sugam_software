import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function registerDoctorIpc() {
  // ─── List Doctors ──────────────────────────────────────────────────────────
  ipcMain.handle('doctor:list', async (_event: IpcMainInvokeEvent) => {
    try {
      const doctors = await prisma.doctor.findMany({
        include: {
          appointments: true,
        },
      });

      // Join with user table to get name and email
      const userIds = doctors.map((d) => d.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const combined = doctors.map((d) => {
        const u = userMap.get(d.userId);
        return {
          id: d.id,
          userId: d.userId,
          name: u?.name ?? 'Unknown Doctor',
          email: u?.email ?? '',
          specialization: d.specialization,
          license: d.license,
          qualification: d.qualification,
          schedule: d.schedule,
        };
      });

      return { success: true, data: combined };
    } catch (error) {
      console.error('[doctor:list] Error:', error);
      return { success: false, error: 'Failed to retrieve doctors.' };
    }
  });

  // ─── Get Today's Consultation Queue ───────────────────────────────────────
  ipcMain.handle('doctor:queue', async (_event: IpcMainInvokeEvent, doctorId: string) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: {
          patient: { select: { id: true, name: true, age: true, gender: true, patientId: true } },
        },
        orderBy: { time: 'asc' },
      });

      const queue = appointments.map((appt) => ({
        appointmentId: appt.id,
        patientId: appt.patient.id,
        patientUniqueId: appt.patient.patientId,
        name: appt.patient.name,
        age: appt.patient.age,
        gender: appt.patient.gender,
        time: appt.time,
        status: appt.status,
      }));

      return { success: true, data: queue };
    } catch (error) {
      console.error('[doctor:queue] Error:', error);
      return { success: false, error: 'Failed to retrieve today queue.' };
    }
  });

  // ─── Create consultation record (prescriptions & labs) ─────────────────────
  ipcMain.handle('doctor:consultation:create', async (_event: IpcMainInvokeEvent, payload: any) => {
    try {
      const {
        appointmentId,
        doctorId,
        patientId,
        chiefComplaint,
        diagnosis,
        notes,
        nextVisit,
        medicines,
        labTests,
      } = payload;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Consultation
        const consultation = await tx.consultation.create({
          data: {
            appointmentId,
            doctorId,
            chiefComplaint,
            diagnosis,
            notes,
            nextVisit: nextVisit ? new Date(nextVisit) : null,
          },
        });

        // 2. Create Prescription if medicines provided
        let prescription = null;
        if (medicines && medicines.length > 0) {
          prescription = await tx.prescription.create({
            data: {
              consultationId: consultation.id,
              doctorId,
              patientId,
              medicines: JSON.stringify(medicines),
              instructions: notes,
            },
          });
        }

        // 3. Create Lab Request if tests provided
        let labRequest = null;
        if (labTests && labTests.length > 0) {
          labRequest = await tx.labRequest.create({
            data: {
              consultationId: consultation.id,
              tests: JSON.stringify(labTests),
              status: 'PENDING',
            },
          });
        }

        // 4. Update appointment status to COMPLETED
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' },
        });

        // 5. Add PatientVisit log
        await tx.patientVisit.create({
          data: {
            patientId,
            doctorId,
            chiefComplaint,
            diagnosis,
            notes,
            nextVisitDate: nextVisit ? new Date(nextVisit) : null,
          },
        });

        // 6. System Notification
        await tx.notification.create({
          data: {
            title: 'Consultation Completed',
            message: `Consultation for appointment ${appointmentId} was successfully completed.`,
            type: 'SUCCESS',
            priority: 'LOW',
            category: 'DOCTOR',
            relatedEntityId: consultation.id,
            relatedEntityType: 'Consultation',
          }
        });

        return { consultation, prescription, labRequest };
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('[doctor:consultation:create] Error:', error);
      return { success: false, error: 'Failed to save consultation details.' };
    }
  });

  // ─── Create Walk-in Appointment ────────────────────────────────────────────
  ipcMain.handle('doctor:appointment:walk-in', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; patientId: string }) => {
    try {
      const { doctorId, patientId } = payload;
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          date: now,
          time: timeStr,
          status: 'PENDING',
          type: 'EMERGENCY', // Can be classified as walk-in or emergency
        },
      });

      return { success: true, data: appointment };
    } catch (error) {
      console.error('[doctor:appointment:walk-in] Error:', error);
      return { success: false, error: 'Failed to create walk-in appointment.' };
    }
  });
  // ─── Create Returning Patient Appointment (Reception) ──────────────────────
  ipcMain.handle('reception:appointment:create', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; patientId: string; type: string }) => {
    try {
      const { doctorId, patientId, type } = payload;
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          date: now,
          time: timeStr,
          status: 'PENDING',
          type: type || 'FOLLOW_UP', 
        },
      });

      return { success: true, data: appointment };
    } catch (error) {
      console.error('[reception:appointment:create] Error:', error);
      return { success: false, error: 'Failed to create appointment for returning patient.' };
    }
  });

  // ─── Get Single Doctor Details ───────────────────────────────────────────
  ipcMain.handle('doctor:get', async (_event: IpcMainInvokeEvent, doctorId: string) => {
    try {
      const doc = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { user: { select: { name: true, email: true, avatar: true } } }
      });
      if (!doc) throw new Error('Doctor not found');
      
      return { 
        success: true, 
        data: {
          id: doc.id,
          userId: doc.userId,
          name: doc.user?.name ?? 'Unknown Doctor',
          email: doc.user?.email ?? '',
          specialization: doc.specialization,
          license: doc.license,
          qualification: doc.qualification,
          schedule: doc.schedule,
        }
      };
    } catch (error) {
      console.error('[doctor:get] Error:', error);
      return { success: false, error: 'Failed to retrieve doctor details.' };
    }
  });

  // ─── Get Doctor Consultation History ─────────────────────────────────────
  ipcMain.handle('doctor:history', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; date: string }) => {
    try {
      const { doctorId, date } = payload;
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch completed appointments for this doctor on this day
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: startOfDay, lte: endOfDay },
          status: 'COMPLETED'
        },
        include: {
          patient: { select: { id: true, patientId: true, name: true, age: true, gender: true } },
          consultation: { select: { id: true, diagnosis: true, chiefComplaint: true } }
        },
        orderBy: { time: 'asc' }
      });

      const history = appointments.map((appt) => ({
        id: appt.id,
        patientId: appt.patient.id,
        patientUniqueId: appt.patient.patientId,
        patientName: appt.patient.name,
        age: appt.patient.age,
        gender: appt.patient.gender,
        time: appt.time,
        type: appt.type,
        diagnosis: appt.consultation?.diagnosis ?? '-',
        chiefComplaint: appt.consultation?.chiefComplaint ?? '-',
      }));

      return { success: true, data: history };
    } catch (error) {
      console.error('[doctor:history] Error:', error);
      return { success: false, error: 'Failed to retrieve doctor history.' };
    }
  });
}
