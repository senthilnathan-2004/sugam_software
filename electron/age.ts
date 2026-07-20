/**
 * Age is DERIVED from date-of-birth, never trusted from a stored column.
 *
 * The schema still has a `Patient.age` column (kept to avoid a migration), but
 * a stored age silently drifts wrong as years pass and is only refreshed when
 * the record is next written. Every read path computes age from `dob` via this
 * helper so what the UI shows is always current.
 */
export function calculateAge(dob: Date | string | null | undefined): number {
  if (!dob) return 0;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diffMs = Date.now() - d.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
