/**
 * Date helpers.
 *
 * The app stores calendar dates as plain "YYYY-MM-DD" strings. Those strings
 * must always mean the user's LOCAL calendar day.
 *
 * The old code used `new Date().toISOString().split('T')[0]`, which gives the
 * date in UTC. In India (UTC+5:30), anything logged before 5:30 am was filed
 * under the previous day. These helpers always work in local time.
 *
 * The stored format is unchanged, so existing data is unaffected.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date as a local "YYYY-MM-DD" string. */
export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's local date as "YYYY-MM-DD". */
export function todayStr(): string {
  return toDateStr(new Date());
}

/**
 * Parse a "YYYY-MM-DD" string as LOCAL midnight.
 * (`new Date('2026-10-13')` parses as UTC midnight, which can land on the
 * previous day in timezones west of UTC.) Falls back to the native parser for
 * any other format so old values never crash the UI.
 */
export function parseDateStr(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Add (or subtract) whole days to a "YYYY-MM-DD" string. */
export function addDays(value: string, days: number): string {
  const d = parseDateStr(value);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}
