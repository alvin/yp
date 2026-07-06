// Display formatting helpers. Output styles match the lodge's printed forms
// (dd-MMM-yy on documents) and clean on-screen labels.

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parse an ISO date ('YYYY-MM-DD') to a local Date without timezone drift. */
function parse(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

/** 12-Nov-25 — printed document style. */
export function dateShort(d: string | Date | null | undefined): string {
  const dt = parse(d);
  if (!dt) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}-${MONTHS_SHORT[dt.getMonth()]}-${String(dt.getFullYear()).slice(-2)}`;
}

/** Nov 12, 2025 — screen style. */
export function dateMed(d: string | Date | null | undefined): string {
  const dt = parse(d);
  if (!dt) return "";
  return `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** November 12, 2025 — report headings. */
export function dateLong(d: string | Date | null | undefined): string {
  const dt = parse(d);
  if (!dt) return "";
  return `${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** Mon, Nov 12 — list rows. */
export function dateWeekday(d: string | Date | null | undefined): string {
  const dt = parse(d);
  if (!dt) return "";
  return `${WEEKDAYS[dt.getDay()]}, ${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

/** $1,234.50 (always two decimals, negatives as -$52.00). */
export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const abs = Math.abs(v).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `-$${abs}` : `$${abs}`;
}

/** $1,234.50 with accounting negatives: ($52.00) — matches the printed cash reports. */
export function moneyAcct(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const abs = Math.abs(v).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `($${abs})` : `$${abs}`;
}

/** Plain two-decimal number, no currency symbol (cash report columns). */
export function amount(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "December 24, 2025  05:08 PM" — printed report footer style. */
export function footerTimestamp(now: Date = new Date()): string {
  const h24 = now.getHours();
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${dateLong(now)}  ${hh}:${mm} ${suffix}`;
}

export function addDays(d: string, days: number): string {
  const dt = parse(d)!;
  dt.setDate(dt.getDate() + days);
  return toISO(dt);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function nightsBetween(from: string, to: string): number {
  const a = parse(from)!;
  const b = parse(to)!;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** The latest date a new reservation may be booked (one year ahead, per policy). */
export function oneYearAhead(d: string): string {
  const dt = parse(d)!;
  dt.setFullYear(dt.getFullYear() + 1);
  return toISO(dt);
}
