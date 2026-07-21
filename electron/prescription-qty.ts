/**
 * Prescription quantity calculator.
 *
 * Parses a doctor-entered dosage pattern (e.g. "1-0-1" = morning-afternoon-night)
 * and a duration (e.g. "5 days") into a total dispense quantity:
 *   total = (sum of per-dose slots) x number of days.
 * e.g. 1-0-1 x 5 days = 10 tablets.
 *
 * Supports integer, decimal, unicode-fraction (½ ¼ ¾ ⅓ ⅔ …) and a/b slot values,
 * and day/week/month durations. UNSUPPORTED / free-text formats return
 * `supported:false` with `quantity:null` — the caller must NOT invent a quantity
 * (spec: validate instead of silently miscalculating). This module is duplicated
 * verbatim as `src/lib/prescription-qty.ts` (renderer can't import from electron).
 */

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function parseSlot(raw: string): number | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (s in FRACTIONS) return FRACTIONS[s];
  const mixed = /^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞])$/.exec(s); // e.g. "1½"
  if (mixed) return parseInt(mixed[1], 10) + FRACTIONS[mixed[2]];
  const slash = /^(\d+)\s*\/\s*(\d+)$/.exec(s); // e.g. "1/2"
  if (slash) { const d = parseInt(slash[2], 10); return d ? parseInt(slash[1], 10) / d : null; }
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

export interface QtyCalc {
  supported: boolean;
  perDay: number | null;
  days: number | null;
  /** Whole-tablet dispense count (ceil of perDay*days); null if unsupported. */
  quantity: number | null;
}

const UNSUPPORTED: QtyCalc = { supported: false, perDay: null, days: null, quantity: null };

export function calcPrescriptionQuantity(dosage: string, duration: string): QtyCalc {
  if (!dosage || !duration) return UNSUPPORTED;

  // Dosage: 2–4 hyphen-separated dose slots. A single free-text token (no '-')
  // like "SOS" / "twice daily" is unsupported.
  const slots = String(dosage).trim().split('-');
  if (slots.length < 2 || slots.length > 4) return UNSUPPORTED;
  let perDay = 0;
  for (const slot of slots) {
    const v = parseSlot(slot);
    if (v === null) return UNSUPPORTED;
    perDay += v;
  }

  // Duration: a number + optional day/week/month unit (bare number ⇒ days).
  const m = /(\d+(?:\.\d+)?)\s*(days?|d|weeks?|wk|months?|mo)?/i.exec(String(duration).trim());
  if (!m) return UNSUPPORTED;
  const num = parseFloat(m[1]);
  if (!isFinite(num) || num <= 0) return UNSUPPORTED;
  const unit = (m[2] || 'day').toLowerCase();
  const mult = /^w/.test(unit) ? 7 : /^mo/.test(unit) ? 30 : 1;
  const days = num * mult;

  const exact = Math.round(perDay * days * 1000) / 1000;
  const quantity = Math.max(0, Math.ceil(exact));
  return { supported: true, perDay, days, quantity };
}
