import { dateLocale } from '@/lib/format';
import { t } from '@/lib/i18n';

/**
 * Stores, categories and products have an Arabic text plus optional English and Russian
 * translations. Picks the page language's version: Russian falls back to English, and both
 * fall back to Arabic. The page language is set by src/lib/i18n.ts.
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
    ? t('النهارده')
    : sameDay(date, tomorrow)
      ? t('بكرة')
      : date.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day} ${date.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' })}`;
}
