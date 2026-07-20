import { IpcMainInvokeEvent, dialog } from 'electron';
import { handle } from './authorize.js';
import { PatientWriteSchema } from './schemas/patient.js';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { prisma } from '../db.js';
import { writeAudit } from '../audit.js';
import type { Session } from '../session.js';
import { calculateAge } from '../age.js';

export function registerPatientIpc() {
  // ─── List Patients with search/filters ────────────────────────────────────
  handle(
    'patient:list',
    async (
      _event: IpcMainInvokeEvent,
      params: { search?: string; gender?: string; bloodGroup?: string } = {}
    ) => {
      try {
        const { search, gender, bloodGroup } = params;

        const whereClause: any = { isDeleted: false };

        if (gender && gender !== 'ALL') {
          whereClause.gender = gender;
        }

        if (bloodGroup && bloodGroup !== 'ALL') {
          whereClause.bloodGroup = bloodGroup;
        }

        if (search) {
          whereClause.OR = [
            { name: { contains: search } },
            { patientId: { contains: search } },
            { phone: { contains: search } },
          ];
        }

        const patients = await prisma.patient.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
        });

        // Compute age from dob on READ so it is never stale — the stored `age`
        // column drifts as years pass and is only refreshed on write.
        const withAge = patients.map((p) => ({ ...p, age: calculateAge(p.dob) }));

        return { success: true, data: withAge };
      } catch (error) {
        console.error('[patient:list] Error:', error);
        return { success: false, error: 'Failed to retrieve patients.' };
      }
    }
  );

  // ─── Get Single Patient Detail ───────────────────────────────────────────
  handle('patient:get', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          visits: true,
          documents: true,
        },
      });

      if (!patient || patient.isDeleted) {
        return { success: false, error: 'Patient not found.' };
      }

      // Fetch Doctor Names for visits
      const doctorIds = patient.visits.map((v) => v.doctorId);
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        include: { user: { select: { name: true } } },
      });

      const doctorMap = new Map(doctors.map((d) => [d.id, d.user?.name ?? 'Unknown Doctor']));

      const visitsWithDoctorNames = patient.visits.map((v) => ({
        ...v,
        doctorName: doctorMap.get(v.doctorId) ?? 'Unknown Doctor',
      }));

      return {
        success: true,
        data: {
          ...patient,
          age: calculateAge(patient.dob),
          visits: visitsWithDoctorNames,
        },
      };
    } catch (error) {
      console.error('[patient:get] Error:', error);
      return { success: false, error: 'Failed to retrieve patient details.' };
    }
  });

  // ─── Upload Patient Document ──────────────────────────────────────────────
  handle('patient:document:upload', async (_event: IpcMainInvokeEvent, payload: any, session: Session | null) => {
    try {
      const { patientId, type, fileName, buffer } = payload;
      const { app } = require('electron');
      const path = require('path');
      
      const userDataPath = app.getPath('userData');
      const docsPath = path.join(userDataPath, 'documents');
      
      if (!fs.existsSync(docsPath)) {
        fs.mkdirSync(docsPath, { recursive: true });
      }
      
      const uniqueName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = path.join(docsPath, uniqueName);
      
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      const doc = await prisma.patientDocument.create({
        data: {
          patientId,
          type,
          fileName,
          filePath,
        }
      });
      
      await writeAudit(session, 'CREATE', 'PatientDocument', doc.id);
      return { success: true, data: doc };
    } catch (error) {
      console.error('[patient:document:upload] Error:', error);
      return { success: false, error: 'Failed to upload document.' };
    }
  });

  // ─── Create Patient ───────────────────────────────────────────────────────
  handle('patient:create', async (_event: IpcMainInvokeEvent, data: any, session: Session | null) => {
    const parsed = PatientWriteSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid patient data.' };
    }
    const d = parsed.data;
    try {
      // Generate patientId (P-XXXXX format)
      const count = await prisma.patient.count();
      const patientId = `P-${String(count + 1).padStart(5, '0')}`;

      const dobDate = new Date(d.dob);
      const age = calculateAge(dobDate);

      const patient = await prisma.patient.create({
        data: {
          patientId,
          name: d.name,
          dob: dobDate,
          age,
          gender: d.gender,
          bloodGroup: d.bloodGroup,
          phone: d.phone,
          email: d.email || null,
          address: d.address,
          emergencyContactName: d.emergencyContactName || '',
          emergencyContactPhone: d.emergencyContactPhone || '',
          photo: d.photo || null,
        },
      });

      // System Notification
      await prisma.notification.create({
        data: {
          title: 'New Patient Registered',
          message: `Patient ${patient.name} (${patientId}) has been registered successfully.`,
          type: 'SUCCESS',
          priority: 'LOW',
          category: 'PATIENT',
          relatedEntityId: patient.id,
          relatedEntityType: 'Patient',
        }
      });

      await writeAudit(session, 'CREATE', 'Patient', patient.id);
      return { success: true, data: patient };
    } catch (error) {
      console.error('[patient:create] Error:', error);
      return { success: false, error: 'Failed to register patient.' };
    }
  });

  // ─── Update Patient ───────────────────────────────────────────────────────
  handle('patient:update', async (_event: IpcMainInvokeEvent, payload: { id: string; data: any }, session: Session | null) => {
    const id = payload?.id;
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Patient id is required.' };
    }
    const parsed = PatientWriteSchema.safeParse(payload?.data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid patient data.' };
    }
    const d = parsed.data;
    try {
      const dobDate = new Date(d.dob);
      const age = calculateAge(dobDate);

      const patient = await prisma.patient.update({
        where: { id },
        data: {
          name: d.name,
          dob: dobDate,
          age,
          gender: d.gender,
          bloodGroup: d.bloodGroup,
          phone: d.phone,
          email: d.email || null,
          address: d.address,
          emergencyContactName: d.emergencyContactName || '',
          emergencyContactPhone: d.emergencyContactPhone || '',
          photo: d.photo || null,
        },
      });

      await writeAudit(session, 'UPDATE', 'Patient', payload.id);
      return { success: true, data: patient };
    } catch (error) {
      console.error('[patient:update] Error:', error);
      return { success: false, error: 'Failed to update patient details.' };
    }
  });

  // ─── Soft Delete Patient ──────────────────────────────────────────────────
  handle('patient:delete', async (_event: IpcMainInvokeEvent, id: string, session: Session | null) => {
    try {
      await prisma.patient.update({
        where: { id },
        data: { isDeleted: true },
      });
      await writeAudit(session, 'DELETE', 'Patient', id);
      return { success: true };
    } catch (error) {
      console.error('[patient:delete] Error:', error);
      return { success: false, error: 'Failed to delete patient record.' };
    }
  });

  // ─── Export Patients to Excel ───────────────────────────────────────────────
  handle('patient:export', async () => {
    try {
      const patients = await prisma.patient.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });

      const exportData = patients.map((p) => ({
        'Patient ID': p.patientId,
        Name: p.name,
        DOB: new Date(p.dob).toLocaleDateString('en-IN'),
        Age: calculateAge(p.dob),
        Gender: p.gender,
        'Blood Group': p.bloodGroup,
        Phone: p.phone,
        Email: p.email || '',
        Address: p.address,
        'Emergency Contact Name': p.emergencyContactName,
        'Emergency Contact Phone': p.emergencyContactPhone,
        'Registration Date': new Date(p.createdAt).toLocaleDateString('en-IN'),
      }));

      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Patients',
        defaultPath: `Patients_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      });

      if (!filePath) {
        return { success: false, error: 'Export cancelled.' };
      }

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Patients');

      xlsx.writeFile(workbook, filePath);

      return { success: true, data: filePath };
    } catch (error: any) {
      console.error('[patient:export] Error:', error);
      return { success: false, error: error.message || 'Failed to export patients.' };
    }
  });

  // ─── Import Patients from Excel ─────────────────────────────────────────────
  handle('patient:import', async (_event, _data, session: Session | null) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Import Patients',
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
          // Basic validation (Name and Phone are usually required)
          const name = row['Name'] || row['name'];
          const phone = row['Phone'] || row['phone'] || '';
          const dobStr = row['DOB'] || row['dob'];

          if (!name) {
            skippedCount++;
            continue;
          }

          // Parse DOB or default to 18 years ago if invalid
          let dobDate = new Date();
          dobDate.setFullYear(dobDate.getFullYear() - 18); // fallback
          if (dobStr) {
            const parsed = new Date(dobStr);
            if (!isNaN(parsed.getTime())) {
              dobDate = parsed;
            } else {
              // Try parsing DD/MM/YYYY
              const parts = String(dobStr).split(/[-/]/);
              if (parts.length === 3) {
                const [d, m, y] = parts;
                const parsedUK = new Date(`${y}-${m}-${d}`);
                if (!isNaN(parsedUK.getTime())) dobDate = parsedUK;
              }
            }
          }
          const age = calculateAge(dobDate);

          // Generate new patientId
          const count = await tx.patient.count();
          const patientId = `P-${String(count + 1).padStart(5, '0')}`;

          await tx.patient.create({
            data: {
              patientId,
              name: String(name),
              dob: dobDate,
              age,
              gender: String(row['Gender'] || row['gender'] || 'OTHER').toUpperCase(),
              bloodGroup: String(row['Blood Group'] || row['bloodGroup'] || 'N/A'),
              phone: String(phone),
              email: row['Email'] || row['email'] || null,
              address: String(row['Address'] || row['address'] || 'N/A'),
              emergencyContactName: String(row['Emergency Contact Name'] || row['emergencyContactName'] || 'N/A'),
              emergencyContactPhone: String(row['Emergency Contact Phone'] || row['emergencyContactPhone'] || 'N/A'),
            },
          });
          importedCount++;
        }
        return { importedCount, skippedCount };
      });

      await writeAudit(session, 'CREATE', 'Patient', null, { imported: results.importedCount });
      return { success: true, data: results };
    } catch (error: any) {
      console.error('[patient:import] Error:', error);
      return { success: false, error: error.message || 'Failed to import patients.' };
    }
  });
}
