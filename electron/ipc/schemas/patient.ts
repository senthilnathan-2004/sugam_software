import { z } from 'zod';

/**
 * Zod schema for patient create/update input. `patientId` and `age` are NOT
 * accepted from the renderer — they are derived server-side (patientId is a
 * generated sequence; age is computed from `dob`). Validating `dob` here also
 * fixes the old `new Date(data.dob)` path that silently accepted invalid dates.
 */
export const PatientWriteSchema = z.object({
  name: z.string().trim().min(1, 'Patient name is required.'),
  dob: z
    .union([z.string(), z.date()])
    .refine((v) => !Number.isNaN(new Date(v as string | Date).getTime()), 'A valid date of birth is required.'),
  gender: z.string().trim().min(1, 'Gender is required.'),
  bloodGroup: z.string().trim().min(1, 'Blood group is required.'),
  phone: z.string().trim().min(1, 'Phone number is required.'),
  email: z.string().trim().email('Enter a valid email.').or(z.literal('')).nullish(),
  address: z.string().trim().min(1, 'Address is required.'),
  // Emergency contact is OPTIONAL: the registration form labels these fields
  // "(optional)" and the renderer schema allows blank, so the server must too.
  // (The Prisma columns are NOT NULL, so the handler coerces absent → '' .)
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  photo: z.string().nullish(),
});

export type PatientWriteInput = z.infer<typeof PatientWriteSchema>;
