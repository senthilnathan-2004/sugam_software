export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialization: string;
  license: string;
  qualification: string;
  schedule: string; // JSON String of schedule
}

export interface QueueItem {
  appointmentId: string;
  patientId: string;
  patientUniqueId: string;
  name: string;
  age: number;
  gender: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export interface ConsultationPayload {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  chiefComplaint: string;
  diagnosis: string;
  notes: string;
  nextVisit?: string;
  // Doctor-reference-only clinical fee. Stored on the consultation and shown in
  // the doctor/patient history; NEVER passed to or displayed by billing.
  consultationFee?: number;
  medicines: {
    name: string;
    dosage: string; // e.g. 1-0-1
    duration: string; // e.g. 5 days
    instructions?: string;
  }[];
  labTests: string[];
}
