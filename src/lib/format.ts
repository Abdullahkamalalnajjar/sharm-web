export function formatPrice(value: number): string {
  const text = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `${text} ج.م`;
}

/** Server timestamps are UTC but come without a "Z". */
export function parseUtc(value: string): Date {
  const iso = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`;
  return new Date(iso);
}

const dateFormat = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' });
const fullDateFormat = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "الأربعاء ٣٠ سبتمبر • ١٠:٤٥ م" */
export function formatOrderDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseUtc(value) : value;
  return `${dateFormat.format(date)} • ${timeFormat.format(date)}`;
}

export function formatFullDate(date: Date): string {
  return fullDateFormat.format(date);
}

export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

/** e.g. "عمارة 12 • الدور 2 • شقة 5" */
export function addressDetails(a: { building: string | null; floor: string | null; apartment: string | null }): string {
  return [a.building && `عمارة ${a.building}`, a.floor && `الدور ${a.floor}`, a.apartment && `شقة ${a.apartment}`]
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
