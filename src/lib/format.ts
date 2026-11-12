/** Formatting helpers: INR currency, kg with 3 decimals, DD-MM-YYYY dates. */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inrWholeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** ₹1,23,456.00 */
export function inr(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${inrFormatter.format(Math.abs(value))}`;
}

/** ₹1,23,456 (no paise) for cards and charts */
export function inrWhole(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${inrWholeFormatter.format(Math.abs(Math.round(value)))}`;
}

/** ₹1.2L / ₹45k for chart axes */
export function inrCompact(value: number): string {
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

/** 12.345 (no unit) */
export function kgNum(value: number): string {
  return value.toFixed(3);
}

/** 12.345 kg */
export function kg(value: number): string {
  return `${value.toFixed(3)} kg`;
}

export function pct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** DD-MM-YYYY */
export function fmtDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** hh:mm AM/PM */
export function fmtTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const h = d.getHours();
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

/** DD-MM-YYYY hh:mm AM */
export function fmtDateTime(value: string | Date): string {
  return `${fmtDate(value)} ${fmtTime(value)}`;
}

/** DD-MM (short label for chart axes) */
export function fmtDayShort(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}`;
}

/** Local calendar day key, YYYY-MM-DD. Used for grouping and <input type="date">. */
export function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Day keys for the last `n` days, oldest first, ending today. */
export function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

/** Parse a YYYY-MM-DD key into a local Date at noon (safe from DST edges). */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
