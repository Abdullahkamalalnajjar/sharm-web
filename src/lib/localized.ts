/**
 * Stores, categories and products have an Arabic text plus optional English and Russian
 * translations. Picks the page language's version: Russian falls back to English, and both
 * fall back to Arabic. The site is Arabic for now, so this returns Arabic until a language switcher exists.
 */
export function localized(ar: string, en?: string | null, ru?: string | null): string {
  const lang = document.documentElement.lang || 'ar';
  if (lang.startsWith('en')) return en || ar;
  if (lang.startsWith('ru')) return ru || en || ar;
  return ar;
}

/** "النهارده ٨:٣٠ م" / "بكرة ١٢:٠٠ م" for a scheduled delivery time. */
export function formatScheduledTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`) : value;
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDay(date, now)
    ? 'النهارده'
    : sameDay(date, tomorrow)
      ? 'بكرة'
      : date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day} ${date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}`;
}
