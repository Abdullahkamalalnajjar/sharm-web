import { create } from 'zustand';

// The two site themes; the colors live in src/index.css under <html data-theme>.
// index.html applies the saved one before the first paint, so there is no flash.

export type ThemeName = 'lime' | 'dark';

export const THEMES: { name: ThemeName; label: string; preview: { bg: string; brand: string; surface: string; accent: string } }[] = [
  { name: 'lime', label: 'ليموني فاتح', preview: { bg: '#f8fbf0', brand: '#5a9a0a', surface: '#ffffff', accent: '#a86f12' } },
  { name: 'dark', label: 'غامق وأحمر', preview: { bg: '#191717', brand: '#cd183d', surface: '#2b2727', accent: '#ffb200' } },
];

const STORAGE_KEY = 'sharm-theme';

function savedTheme(): ThemeName {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'lime' ? v : 'lime';
  } catch {
    return 'lime';
  }
}

function apply(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#191717' : '#5a9a0a');
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
