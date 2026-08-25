import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local calendar day as YYYY-MM-DD (never UTC-shifted). */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** 1234.5 -> "1.234,5" (de-DE) */
export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(seconds: number) {
  return `${Math.max(0, Math.round(seconds / 60))} min`;
}

const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function weekdayName(index: number, short = false) {
  const list = short ? WEEKDAYS_SHORT_DE : WEEKDAYS_DE;
  return list[((index % 7) + 7) % 7];
}

export function monthName(index: number) {
  return MONTHS_DE[((index % 12) + 12) % 12];
}

export function formatDate(value: string | Date, opts: { withYear?: boolean; weekday?: boolean } = {}) {
  const date = typeof value === 'string' ? fromDateKey(value.slice(0, 10)) : value;
  const day = date.getDate();
  const month = MONTHS_DE[date.getMonth()];
  const parts: string[] = [];
  if (opts.weekday) parts.push(`${WEEKDAYS_SHORT_DE[date.getDay()]},`);
  parts.push(`${day}. ${month}`);
  if (opts.withYear !== false) parts.push(String(date.getFullYear()));
  return parts.join(' ');
}

export function formatTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "vor 3 Tagen", "heute", ... */
export function relativeDay(dateKey: string) {
  const today = toDateKey();
  if (dateKey === today) return 'Heute';
  if (dateKey === addDaysToKey(today, -1)) return 'Gestern';
  if (dateKey === addDaysToKey(today, 1)) return 'Morgen';
  const diff = Math.round(
    (fromDateKey(dateKey).getTime() - fromDateKey(today).getTime()) / 86_400_000,
  );
  if (diff < 0) return `vor ${Math.abs(diff)} Tagen`;
  return `in ${diff} Tagen`;
}

/** Monday-based start of the ISO week containing `date`. */
export function startOfWeek(date: Date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export function greeting(date: Date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** "1 Tag" / "3 Tage" - avoids the classic off-by-one plural in German. */
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Macro values read better without a trailing ",0": whole numbers are shown
 * without decimals, fractional ones with a single decimal.
 */
export function formatMacro(value: number) {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}
