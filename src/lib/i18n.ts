import { create } from 'zustand';

import { englishTexts, italianTexts, russianTexts, turkishTexts } from '@/i18n/all';

// The site's languages, matching the Flutter app (sharm_app/lib/core/i18n/i18n.dart). Arabic is the
// default and the source text; the Arabic text is the translation key, so a missing translation shows
// the English (Russian, Turkish, Italian) or the Arabic. index.html sets <html lang dir> from the saved choice before the first paint.

export type Language = 'ar' | 'en' | 'ru' | 'tr' | 'it';

export const LANGUAGES: { code: Language; nativeName: string }[] = [
  { code: 'ar', nativeName: 'العربية' },
  { code: 'en', nativeName: 'English' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'it', nativeName: 'Italiano' },
];

const isLanguage = (v: string | null): v is Language => LANGUAGES.some((l) => l.code === v);

/** Each language's own texts; English is the fallback for the others. */
const TEXTS: Record<Exclude<Language, 'ar'>, Record<string, string>> = {
  en: englishTexts,
  ru: russianTexts,
  tr: turkishTexts,
  it: italianTexts,
};

const STORAGE_KEY = 'sharm-language';

/** The saved choice; on a first visit, the browser's language when the site has it. */
function savedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(v)) return v;
  } catch {
    // Private mode.
  }
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  return isLanguage(browser) ? browser : 'ar';
}

let current: Language = savedLanguage();

function apply(language: Language) {
  current = language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}

/** The language in use, for code outside React (API headers, formatting). */
export function currentLanguage(): Language {
  return current;
}

/**
 * Translates an Arabic UI text into the current language. Placeholders are written `{name}`:
 * `t('أوردر #{n}', { n: order.number })`.
 */
export function t(ar: string, args?: Record<string, string | number>): string {
  const text = current === 'ar' ? ar : (TEXTS[current][ar] ?? englishTexts[ar] ?? ar);
  if (!args) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in args ? String(args[name]) : whole));
}

/**
 * [t] for an Arabic text that means different things in different places: the translation is looked
 * up under `context|ar` first (e.g. 'bill|الحساب').
 */
export function tIn(context: string, ar: string, args?: Record<string, string | number>): string {
  const key = `${context}|${ar}`;
  const own = current !== 'ar' && (key in TEXTS[current] || key in englishTexts);
  return own ? t(key, args) : t(ar, args);
}

interface LanguageState {
  /** The language showing: the visitor's choice, or Arabic while [arabicOnly]. */
  language: Language;
  /** The visitor's saved choice. */
  chosen: Language;
  /** Only customer and admin pages are translated: the other staff (store, driver, cashier) always see Arabic. */
  arabicOnly: boolean;
  setLanguage: (language: Language) => void;
  setArabicOnly: (arabicOnly: boolean) => void;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  language: current,
  chosen: current,
  arabicOnly: false,
  setLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Private mode: the pick lasts until the tab closes.
    }
    const showing = get().arabicOnly ? 'ar' : language;
    apply(showing);
    set({ chosen: language, language: showing });
  },
  setArabicOnly(arabicOnly) {
    if (arabicOnly === get().arabicOnly) return;
    const showing = arabicOnly ? 'ar' : get().chosen;
    apply(showing);
    set({ arabicOnly, language: showing });
  },
}));

apply(current);
