import clsx from 'clsx';
import { CheckCircle2, Circle, Palette } from 'lucide-react';
import { useState } from 'react';

import { Sheet } from '@/components/ui';
import { THEMES, useTheme } from '@/lib/theme';

/** Header button (on the brand bar) that opens the theme picker. */
export function ThemeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="الثيم"
        title="الثيم"
        className="grid size-[38px] place-items-center rounded-[10px] border border-white/28 text-white hover:bg-white/15"
      >
        <Palette className="size-5" />
      </button>
      <ThemeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="اختار الثيم">
      <div className="flex flex-col gap-2.5">
        {THEMES.map((t) => {
          const selected = t.name === theme;
          const p = t.preview;
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => setTheme(t.name)}
              aria-pressed={selected}
              className={clsx(
                'flex items-center gap-3.5 rounded-card border bg-surface p-3.5 text-start transition-colors hover:bg-surface-alt',
                selected ? 'border-2 border-brand' : 'border-line',
              )}
            >
              {/* A mini screen in the theme's own colors. */}
              <span className="flex size-16 shrink-0 flex-col gap-1.5 rounded-2xl border p-2" style={{ background: p.bg, borderColor: p.surface }}>
                <span className="flex-1 rounded-lg" style={{ background: p.brand }} />
                <span className="flex items-center gap-1">
                  <span className="h-3.5 flex-1 rounded-[5px]" style={{ background: p.surface }} />
                  <span className="size-3.5 rounded-full" style={{ background: p.accent }} />
                </span>
              </span>
              <span className="flex-1 text-base font-extrabold text-ink">{t.label}</span>
              {selected ? <CheckCircle2 className="size-6 text-brand" /> : <Circle className="size-6 text-ink-3" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
