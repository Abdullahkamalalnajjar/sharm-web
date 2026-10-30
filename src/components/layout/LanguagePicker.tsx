import clsx from 'clsx';
import { Check, Languages } from 'lucide-react';
import { useState } from 'react';

import { Sheet } from '@/components/ui';
import { LANGUAGES, t, useLanguage } from '@/lib/i18n';

/** Header button (on the brand bar) that opens the language picker. */
export function LanguageButton() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('اللغة')}
        title={t('اللغة')}
        className="grid size-[38px] place-items-center rounded-[10px] border border-white/28 text-white hover:bg-white/15"
      >
        <Languages className="size-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('اللغة')}>
        <div className="flex flex-col gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              dir={l.code === 'ar' ? 'rtl' : 'ltr'}
              onClick={() => {
                setOpen(false);
                setLanguage(l.code);
              }}
              className={clsx(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-start font-bold',
                l.code === language ? 'border-brand bg-brand/10' : 'border-line hover:bg-surface-alt',
              )}
            >
              <span>{l.nativeName}</span>
              {l.code === language && <Check className="size-5 text-brand" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
