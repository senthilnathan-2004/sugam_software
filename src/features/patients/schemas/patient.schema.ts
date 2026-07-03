import { z } from 'zod';

export const patientSchema = z.object({
  name: z.string().min(1, 'Patient name is required').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG', 'UNKNOWN']),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  email: z.string().email('Invalid email address').or(z.literal('')),
  address: z.string().min(1, 'Address is required').max(300),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(10, 'Emergency phone must be at least 10 digits').max(15),
  photo: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
