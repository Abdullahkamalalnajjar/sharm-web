import clsx from 'clsx';
import { Moon, Palette, Sun, SunMoon } from 'lucide-react';
import { useState } from 'react';

import { Sheet } from '@/components/ui';
import { PALETTES, THEMES, useTheme, type PalettePreview } from '@/lib/theme';

/** Header button (on the brand bar) that opens the theme picker. */
export function ThemeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="المظهر"
        title="المظهر"
        className="grid size-[38px] place-items-center rounded-[10px] border border-white/28 text-white hover:bg-white/15"
      >
        <Palette className="size-5" />
      </button>
      <ThemeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const ICONS = { dark: Moon, light: Sun, system: SunMoon } as const;

/** A mini screen in a palette's own colors: red bar over a card (like the app's picker). */
function Preview({ p }: { p: PalettePreview }) {
  return (
    <span className="flex h-full flex-1 flex-col gap-1.5 p-2" style={{ background: p.bg }}>
      <span className="h-2.5 rounded-[5px]" style={{ background: p.brand }} />
      <span className="relative flex-1 rounded-lg border" style={{ background: p.surface, borderColor: p.border }}>
        <span className="absolute bottom-1.5 start-1.5 size-2.5 rounded-full" style={{ background: p.accent }} />
      </span>
    </span>
  );
}

function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="المظهر">
      <div className="grid grid-cols-3 gap-2.5">
        {THEMES.map((t) => {
          const selected = t.name === theme;
          const Icon = ICONS[t.name];
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                setTheme(t.name);
                onClose();
              }}
              aria-pressed={selected}
              className={clsx(
                'flex flex-col gap-2 rounded-[18px] bg-surface-alt p-2 transition-colors hover:bg-surface-high',
                selected ? 'border-2 border-brand' : 'border border-line',
              )}
            >
              <span className="flex h-[76px] overflow-hidden rounded-xl">
                {t.name === 'system' ? (
                  <>
                    <Preview p={PALETTES.light} />
                    <Preview p={PALETTES.dark} />
                  </>
                ) : (
                  <Preview p={PALETTES[t.name]} />
                )}
              </span>
              <span className={clsx('flex items-center justify-center gap-1 text-[13px]', selected ? 'font-extrabold text-brand-ink' : 'font-semibold text-ink')}>
                <Icon className={clsx('size-4 shrink-0', selected ? 'text-brand-ink' : 'text-ink-2')} />
                <span className="truncate">{t.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
