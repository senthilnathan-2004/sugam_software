export const ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  BILLING: 'BILLING',
  RECEPTION: 'RECEPTION',
} as const;

export const GST_SLABS = [
  { label: 'Exempted (0%)', value: 0 },
  { label: 'Slab (5%)', value: 5 },
  { label: 'Slab (12%)', value: 12 },
  { label: 'Slab (18%)', value: 18 },
] as const;

export const PAYMENT_MODES = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  SPLIT: 'SPLIT',
} as const;

export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
