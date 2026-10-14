/**
 * Time-zone helpers (no libraries needed — uses the browser's Intl API).
 */

/** The device's IANA time zone, e.g. "Europe/London" or "Asia/Kolkata". */
export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** True if the string is a time zone the browser understands. */
export function isValidTimeZone(tz?: string | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "GMT+1", "GMT+5:30" … for a zone at a given moment (handles summer time). */
export function getOffsetLabel(tz: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(at);
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

/** "21:48" in the given zone (24-hour clock). */
export function formatTimeInZone(tz: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(at);
  } catch {
    return '';
  }
}

/** "Wed 14 Oct" in the given zone. */
export function formatDateInZone(tz: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(at);
  } catch {
    return '';
  }
}

/** Friendly city name from an IANA zone: "Asia/Kolkata" → "Kolkata". */
export function zoneCity(tz: string): string {
  const last = tz.split('/').pop() || tz;
  return last.replace(/_/g, ' ');
}
