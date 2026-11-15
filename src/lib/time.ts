// Times are stored in UTC and shown in the residence's time zone, whatever the
// phone is set to (see replica/architecture.md, "time zones").
export const APP_TIME_ZONE = 'Europe/Warsaw';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The calendar date and time a UTC instant has in the app time zone. */
export function zonedParts(date: Date, timeZone = APP_TIME_ZONE) {
  const f = formatterFor(timeZone);
  // Hermes on iOS has DateTimeFormat.format() but not formatToParts(); there, read the
  // numbers of the en-GB text instead ("16/11/2026, 18:00": day, month, year, hour, minute)
  if (typeof f.formatToParts !== 'function') {
    const [day, month, year, hour, minute] = (f.format(date).match(/\d+/g) ?? []).map(Number);
    return { year, month, day, hour: hour % 24, minute };
  }
  const parts = f.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

function offsetMs(utcMs: number, timeZone: string): number {
  const p = zonedParts(new Date(utcMs), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(utcMs / MINUTE) * MINUTE;
}

/** A wall-clock time in the app time zone ("16 Nov, 18:00 in Gdańsk") as a UTC Date. Handles clock changes. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone = APP_TIME_ZONE): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(guess, timeZone);
  // a second pass corrects the guess when it lands on the other side of a clock change
  return new Date(guess - offsetMs(first, timeZone));
}

export interface LocalDay {
  year: number;
  month: number;
  day: number;
}

/** Today and the next days, as calendar days in the app time zone. */
export function upcomingDays(count: number, from = new Date()): LocalDay[] {
  const start = zonedParts(from);
  const base = Date.UTC(start.year, start.month - 1, start.day);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base + i * DAY);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  });
}

/** 1 September of the current academic year: the start of the ranking "season". */
export function seasonStart(now = new Date()): Date {
  const p = zonedParts(now);
  const year = p.month >= 9 ? p.year : p.year - 1;
  return zonedToUtc(year, 9, 1, 0, 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}
