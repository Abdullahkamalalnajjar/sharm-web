import { currentLanguage, t } from '@/lib/i18n';

export function formatPrice(value: number): string {
  const text = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `${text} ${t('ج.م')}`;
}

/** Server timestamps are UTC but come without a "Z". */
export function parseUtc(value: string): Date {
  const iso = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`;
  return new Date(iso);
}

const LOCALES = { ar: 'ar-EG', en: 'en-GB', ru: 'ru-RU' } as const;

/** The Intl locale of the current language. */
export const dateLocale = () => LOCALES[currentLanguage()];

const formats = new Map<string, Intl.DateTimeFormat>();

/** A cached Intl formatter for the current language (the app remounts on a language change). */
function dateFormat(name: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${dateLocale()}|${name}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(dateLocale(), options);
    formats.set(key, format);
  }
  return format;
}

const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const TIME = { hour: 'numeric', minute: '2-digit' } as const;
const FULL_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;

/** "الأربعاء ٣٠ سبتمبر • ١٠:٤٥ م" */
export function formatOrderDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseUtc(value) : value;
  return `${dateFormat('day', DAY).format(date)} • ${dateFormat('time', TIME).format(date)}`;
}

export function formatFullDate(date: Date): string {
  return dateFormat('full', FULL_DATE).format(date);
}

export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

/** e.g. "عمارة 12 • الدور 2 • شقة 5" */
export function addressDetails(a: { building: string | null; floor: string | null; apartment: string | null }): string {
  return [
    a.building && t('عمارة {n}', { n: a.building }),
    a.floor && t('الدور {n}', { n: a.floor }),
    a.apartment && t('شقة {n}', { n: a.apartment }),
  ]
    .filter(Boolean)
    .join(' • ');
}

/** Uploaded images come back as server paths ("/uploads/x.jpg"); full URLs are used as-is. */
export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}${path}`;
}

// ---------- Store hours ----------

/** "21:30:00" → minutes after midnight. */
function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** "21:30:00" → "9:30 م". */
export function formatTimeOfDay(time: string): string {
  const total = minutes(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? t('ص') : t('م')}`;
}

/** "من 10:00 ص لـ 2:00 ص", or null without hours. */
export function formatStoreHours(opensAt: string | null, closesAt: string | null): string | null {
  return opensAt && closesAt ? t('من {from} لـ {to}', { from: formatTimeOfDay(opensAt), to: formatTimeOfDay(closesAt) }) : null;
}

/** Customer-facing state of a store: open, closed for its hours ("بيفتح 10:00 ص"), or closed. */
export function storeStatusLabel(s: {
  isOpen: boolean;
  openSwitch?: boolean;
  opensAt?: string | null;
  allowsScheduledOrders?: boolean;
}): string {
  if (s.isOpen) return t('مفتوح');
  if (s.allowsScheduledOrders) return t('مقفول • اطلب لبعدين');
  if (s.openSwitch && s.opensAt) return t('بيفتح {time}', { time: formatTimeOfDay(s.opensAt) });
  return t('مقفول');
}

// ---------- Discounts ----------

/** Mirrors the backend `Product.ApplyDiscount`: to the piaster, halves away from zero. */
export function applyDiscount(amount: number, discountPercent: number): number {
  return discountPercent > 0 ? Math.round(amount * (100 - discountPercent)) / 100 : amount;
}

/** "20%" / "12.5%". */
export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value}%`;
}

/** "-20%" for a discount badge, isolated left-to-right inside Arabic text. */
export function discountLabel(percent: number): string {
  return `\u2066-${formatPercent(percent)}\u2069`;
}
