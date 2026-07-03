export interface Patient {
  id: string;
  patientId: string;
  name: string;
  dob: Date;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup: 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'O_POS' | 'O_NEG' | 'AB_POS' | 'AB_NEG' | 'UNKNOWN';
  phone: string;
  email?: string | null;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  photo?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientVisit {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  date: Date;
  chiefComplaint: string;
  diagnosis: string;
  notes: string;
  nextVisitDate?: Date | null;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  type: 'LAB_REPORT' | 'SCAN' | 'PRESCRIPTION' | 'OTHER';
  filePath: string;
  fileName: string;
  uploadedAt: Date;
}

export interface PatientDetail extends Patient {
  visits: PatientVisit[];
  documents: PatientDocument[];
}
