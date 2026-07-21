import { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { handle } from './authorize.js';
import { calculateAge } from '../age.js';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import { calcPrescriptionQuantity } from '../prescription-qty.js';
import type { Session } from '../session.js';

/** Resolve the Doctor row linked to a user account (server-side identity). */
async function getDoctorForUser(userId: string) {
  return prisma.doctor.findUnique({ where: { userId } });
}

function safeParseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Fast doctor-facing registration (spec §6): only the essentials are required;
// the rest default to '' (the columns are NOT NULL but accept empty strings).
const QuickPatientSchema = z.object({
  name: z.string().trim().min(1, 'Patient name is required.'),
  phone: z.string().trim().min(1, 'Mobile number is required.'),
  dob: z
    .union([z.string(), z.date()])
    .refine((v) => !Number.isNaN(new Date(v as string | Date).getTime()), 'A valid date of birth is required.'),
  gender: z.string().trim().min(1, 'Gender is required.'),
  bloodGroup: z.string().trim().optional(),
  address: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email.').or(z.literal('')).optional(),
});

export function registerDoctorIpc() {
  // ─── List Doctors ──────────────────────────────────────────────────────────
  handle('doctor:list', async (_event: IpcMainInvokeEvent) => {
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
  handle('doctor:queue', async (_event: IpcMainInvokeEvent, doctorId: string, session: Session | null) => {
    try {
      // Doctor isolation (spec §34): a DOCTOR only ever sees their OWN queue —
      // the requested doctorId is ignored and forced to the caller's own. ADMIN
      // may inspect any doctor's queue via the passed doctorId.
      let effectiveDoctorId = doctorId;
      if (session && session.role === 'DOCTOR') {
        const own = await getDoctorForUser(session.userId);
        if (!own) return { success: true, data: [] };
        effectiveDoctorId = own.id;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId: effectiveDoctorId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: {
          patient: { select: { id: true, name: true, dob: true, gender: true, patientId: true } },
        },
        orderBy: { time: 'asc' },
      });

      const queue = appointments.map((appt) => ({
        appointmentId: appt.id,
        patientId: appt.patient.id,
        patientUniqueId: appt.patient.patientId,
        name: appt.patient.name,
        age: calculateAge(appt.patient.dob),
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

  // ─── Complete consultation (prescriptions, labs) → Ready for Billing ───────
  handle('doctor:consultation:create', async (_event: IpcMainInvokeEvent, payload: any, session: Session | null) => {
    try {
      if (!session) return { success: false, error: 'Not authenticated.' };
      const { appointmentId, chiefComplaint, diagnosis, notes, nextVisit, medicines, labTests, consultationFee } =
        payload ?? {};
      if (!appointmentId) return { success: false, error: 'Missing appointment.' };

      // Server-side doctor auto-assignment (spec §5/§34): a DOCTOR always acts as
      // themselves; the client-supplied doctorId is ignored. Only ADMIN may
      // record on behalf of another doctor (explicit override).
      const ownDoctor = await getDoctorForUser(session.userId);
      let doctorId: string | undefined;
      if (session.role === 'ADMIN') {
        doctorId = (typeof payload?.doctorId === 'string' && payload.doctorId) || ownDoctor?.id;
      } else {
        if (!ownDoctor) return { success: false, error: 'Your account is not linked to a doctor profile.' };
        doctorId = ownDoctor.id;
      }
      if (!doctorId) return { success: false, error: 'No doctor could be resolved for this consultation.' };

      // Consultation fee is a DOCTOR-REFERENCE-ONLY clinical value.
      const feeNum = Number(consultationFee);
      const fee = Number.isFinite(feeNum) && feeNum >= 0 ? feeNum : 0;

      // Compute the total dispense quantity per medicine from dosage x duration
      // and store it WITH the prescription (authoritative). Unsupported/free-text
      // dosage → quantity:null (billing must then set it manually — never guessed).
      const augmentedMedicines = Array.isArray(medicines)
        ? medicines.map((mm: any) => ({
            ...mm,
            quantity: calcPrescriptionQuantity(String(mm?.dosage ?? ''), String(mm?.duration ?? '')).quantity,
          }))
        : [];

      const result = await prisma.$transaction(async (tx) => {
        const appt = await tx.appointment.findUnique({ where: { id: appointmentId } });
        if (!appt) throw new Error('APPT_NOT_FOUND');
        // Ownership (spec §34): cannot complete another doctor's appointment.
        if (session.role !== 'ADMIN' && appt.doctorId !== doctorId) {
          throw new Error('NOT_YOUR_APPOINTMENT');
        }
        // Patient/doctor are taken from the authoritative appointment, never the
        // client payload.
        const patientId = appt.patientId;
        const now = new Date();

        const consultation = await tx.consultation.create({
          data: {
            appointmentId,
            doctorId,
            chiefComplaint,
            diagnosis,
            notes,
            nextVisit: nextVisit ? new Date(nextVisit) : null,
            // Explicit doctor completion is the ONLY transition into the billing
            // queue (spec §10). Historical rows stay 'CLOSED'.
            billingStatus: 'READY_FOR_BILLING',
            completedAt: now,
            consultationFee: fee,
          },
        });

        let prescription = null;
        if (augmentedMedicines.length > 0) {
          prescription = await tx.prescription.create({
            data: {
              consultationId: consultation.id,
              doctorId,
              patientId,
              // Stores name/dosage/duration/instructions + the calculated quantity.
              medicines: JSON.stringify(augmentedMedicines),
              instructions: notes,
            },
          });
        }

        let labRequest = null;
        if (labTests && labTests.length > 0) {
          labRequest = await tx.labRequest.create({
            data: { consultationId: consultation.id, tests: JSON.stringify(labTests), status: 'PENDING' },
          });
        }

        await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'COMPLETED' } });

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

        await tx.notification.create({
          data: {
            title: 'Consultation Completed',
            message: 'A consultation was completed and sent to Billing.',
            type: 'SUCCESS',
            priority: 'LOW',
            category: 'DOCTOR',
            relatedEntityId: consultation.id,
            relatedEntityType: 'Consultation',
          },
        });

        return { consultation, prescription, labRequest };
      });

      await writeAudit(session, 'CREATE', 'Consultation', result.consultation.id);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[doctor:consultation:create] Error:', error);
      if (error?.message === 'APPT_NOT_FOUND') return { success: false, error: 'That appointment no longer exists.' };
      if (error?.message === 'NOT_YOUR_APPOINTMENT')
        return { success: false, error: 'You can only complete your own consultations.' };
      // Consultation is 1:1 with an appointment (@unique) — a double-click/retry
      // hits P2002; report it clearly instead of looking like a lost save.
      if (error?.code === 'P2002') {
        return { success: false, error: 'A consultation has already been recorded for this appointment.' };
      }
      return { success: false, error: 'Failed to save consultation details.' };
    }
  });

  // ─── Resolve the caller's own Doctor profile (replaces client `doctors[0]`) ─
  handle('doctor:me', async (_event: IpcMainInvokeEvent, _data: unknown, session: Session | null) => {
    if (!session) return { success: false, error: 'Not authenticated.' };
    const doc = await getDoctorForUser(session.userId);
    if (!doc) return { success: false, error: 'Your account is not linked to a doctor profile.' };
    return {
      success: true,
      data: {
        id: doc.id,
        userId: doc.userId,
        name: session.name,
        specialization: doc.specialization,
        license: doc.license,
        qualification: doc.qualification,
      },
    };
  });

  // ─── Get one consultation (DOCTOR/ADMIN) — the ONLY place the fee is exposed ─
  handle('doctor:consultation:get', async (_event: IpcMainInvokeEvent, data: { consultationId?: string }, session: Session | null) => {
    const consultationId = typeof data?.consultationId === 'string' ? data.consultationId : '';
    if (!consultationId) return { success: false, error: 'Missing consultation id.' };
    const c = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        prescription: true,
        appointment: { include: { patient: { select: { id: true, patientId: true, name: true, phone: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
    if (!c) return { success: false, error: 'Consultation not found.' };
    // Doctor isolation: a DOCTOR may only read their own consultation record.
    if (session && session.role === 'DOCTOR') {
      const own = await getDoctorForUser(session.userId);
      if (!own || c.doctorId !== own.id) {
        return { success: false, error: 'You can only view your own consultations.' };
      }
    }
    return {
      success: true,
      data: {
        id: c.id,
        completedAt: c.completedAt,
        billingStatus: c.billingStatus,
        // Doctor-reference-only clinical fee — surfaced ONLY on this DOCTOR/ADMIN
        // channel, never on any billing channel.
        consultationFee: c.consultationFee,
        chiefComplaint: c.chiefComplaint,
        diagnosis: c.diagnosis,
        notes: c.notes,
        doctorName: c.doctor?.user?.name ?? '',
        patient: c.appointment?.patient ?? null,
        medicines: safeParseJsonArray(c.prescription?.medicines),
        instructions: c.prescription?.instructions ?? '',
      },
    };
  });

  // ─── Register a NEW patient and start a visit in one step (spec §6/§32) ─────
  handle('doctor:patient:register-and-visit', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    try {
      if (!session) return { success: false, error: 'Not authenticated.' };

      // Resolve the consulting doctor server-side (auto-assign).
      let doctor = await getDoctorForUser(session.userId);
      if (session.role === 'ADMIN' && typeof data?.doctorId === 'string' && data.doctorId) {
        doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
      }
      if (!doctor) return { success: false, error: 'Your account is not linked to a doctor profile.' };

      const parsed = QuickPatientSchema.safeParse(data?.patient ?? data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid patient details.' };
      }
      const p = parsed.data;
      const forceNew = data?.forceNew === true;

      // Duplicate guard (spec §6): never silently create a duplicate patient for
      // an existing mobile number. Surface candidates so the doctor can open the
      // existing record instead — or explicitly confirm a new one (forceNew).
      if (!forceNew) {
        const existing = await prisma.patient.findMany({
          where: { phone: p.phone, isDeleted: false },
          select: { id: true, patientId: true, name: true, phone: true },
          take: 5,
        });
        if (existing.length > 0) {
          return {
            success: false,
            code: 'DUPLICATE_PHONE',
            error: 'A patient with this mobile number already exists.',
            data: { candidates: existing },
          };
        }
      }

      const dobDate = new Date(p.dob);
      const result = await prisma.$transaction(async (tx) => {
        const count = await tx.patient.count();
        const patientId = `P-${String(count + 1).padStart(5, '0')}`;
        const patient = await tx.patient.create({
          data: {
            patientId,
            name: p.name,
            dob: dobDate,
            age: calculateAge(dobDate),
            gender: p.gender,
            bloodGroup: p.bloodGroup || '',
            phone: p.phone,
            email: p.email || null,
            address: p.address || '',
            emergencyContactName: '',
            emergencyContactPhone: '',
          },
        });

        const now = new Date();
        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor!.id,
            date: now,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: 'PENDING',
            type: 'FIRST_VISIT',
          },
        });

        return { patient, appointmentId: appointment.id };
      });

      await writeAudit(session, 'CREATE', 'Patient', result.patient.id, { via: 'doctor-register-and-visit' });
      await writeAudit(session, 'CREATE', 'Appointment', result.appointmentId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[doctor:patient:register-and-visit] Error:', error);
      return { success: false, error: 'Failed to register the patient and start a visit.' };
    }
  });

  // ─── Create Walk-in Appointment ────────────────────────────────────────────
  handle('doctor:appointment:walk-in', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; patientId: string }, session: Session | null) => {
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

      await writeAudit(session, 'CREATE', 'Appointment', appointment.id);
      return { success: true, data: appointment };
    } catch (error) {
      console.error('[doctor:appointment:walk-in] Error:', error);
      return { success: false, error: 'Failed to create walk-in appointment.' };
    }
  });
  // ─── Create Returning Patient Appointment (Reception) ──────────────────────
  handle('reception:appointment:create', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; patientId: string; type: string }, session: Session | null) => {
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

      await writeAudit(session, 'CREATE', 'Appointment', appointment.id);
      return { success: true, data: appointment };
    } catch (error) {
      console.error('[reception:appointment:create] Error:', error);
      return { success: false, error: 'Failed to create appointment for returning patient.' };
    }
  });

  // ─── Get Single Doctor Details ───────────────────────────────────────────
  handle('doctor:get', async (_event: IpcMainInvokeEvent, doctorId: string) => {
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
  handle('doctor:history', async (_event: IpcMainInvokeEvent, payload: { doctorId: string; date: string }) => {
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
          patient: { select: { id: true, patientId: true, name: true, dob: true, gender: true } },
          consultation: { select: { id: true, diagnosis: true, chiefComplaint: true } }
        },
        orderBy: { time: 'asc' }
      });

      const history = appointments.map((appt) => ({
        id: appt.id,
        patientId: appt.patient.id,
        patientUniqueId: appt.patient.patientId,
        patientName: appt.patient.name,
        age: calculateAge(appt.patient.dob),
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
