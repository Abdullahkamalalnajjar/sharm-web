import { create } from 'zustand';

// The visitor's theme choice, matching the Flutter app (sharm_app/lib/core/theme_controller.dart):
// dark (default), light, or follow the device. The colors live in src/index.css; <html data-theme>
// always holds the *resolved* palette ('dark' | 'light'), so the `dark:` variant keeps meaning
// "dark palette is showing". index.html resolves the saved choice before the first paint.

export type ThemeName = 'dark' | 'light' | 'system';
export type Palette = 'dark' | 'light';

export interface PalettePreview {
  bg: string;
  surface: string;
  brand: string;
  accent: string;
  border: string;
}

export const PALETTES: Record<Palette, PalettePreview> = {
  dark: { bg: '#1c0508', surface: '#2b0a0f', brand: '#c21f35', accent: '#e6b450', border: 'rgb(230 180 80 / 0.25)' },
  light: { bg: '#f8f3f1', surface: '#ffffff', brand: '#c21f35', accent: '#9a6510', border: 'rgb(142 18 36 / 0.2)' },
};

export const THEMES: { name: ThemeName; label: string }[] = [
  { name: 'dark', label: 'غامق' },
  { name: 'light', label: 'فاتح' },
  { name: 'system', label: 'زي الجهاز' },
];

const STORAGE_KEY = 'sharm-theme';
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

function savedTheme(): ThemeName {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'lime') return 'light'; // the old light theme
    return v === 'light' || v === 'system' ? v : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolvePalette(theme: ThemeName): Palette {
  if (theme === 'system') return media?.matches ? 'light' : 'dark';
  return theme;
}

function apply(theme: ThemeName) {
  const palette = resolvePalette(theme);
  document.documentElement.dataset.theme = palette;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette === 'dark' ? '#1c0508' : '#c21f35');
}

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: savedTheme(),
  setTheme(theme) {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode: the pick lasts until the tab closes.
    }
    set({ theme });
  },
}));

// Keep the page in sync with the store (covers the lime → light migration too), and follow
// the OS live while "system" is picked.
apply(useTheme.getState().theme);
media?.addEventListener('change', () => {
  if (useTheme.getState().theme === 'system') apply('system');
});
