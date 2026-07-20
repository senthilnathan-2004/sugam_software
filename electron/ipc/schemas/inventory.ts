import { z } from 'zod';

/**
 * Zod schemas for inventory IPC actions.
 *
 * Beyond validation, these close a mass-assignment hole: the supplier handlers
 * previously did `prisma.supplier.create({ data })` / `update({ data })` with
 * the raw renderer object, so a caller could set ANY column. A zod `.object()`
 * strips unknown keys on parse, so `parsed.data` is inherently a whitelist of
 * exactly these fields.
 */

const supplierFields = {
  name: z.string().trim().min(1, 'Supplier name is required.'),
  contact: z.string().trim().min(1, 'Contact is required.'),
  // Optional: suppliers may have no email.
  email: z.string().trim().optional(),
  address: z.string().trim().min(1, 'Address is required.'),
  gstNo: z.string().trim().min(1, 'GST number is required.'),
  isActive: z.boolean().optional(),
};

export const SupplierCreateSchema = z.object({
  ...supplierFields,
  // On create, coerce a missing email to '' so the non-nullable `email` column
  // on the Supplier model is always satisfied. Update leaves it untouched so
  // omitting email in a patch does not wipe an existing value.
  email: z.string().trim().optional().default(''),
});

export const SupplierUpdateSchema = z.object(supplierFields).partial();

export type SupplierCreateInput = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof SupplierUpdateSchema>;
