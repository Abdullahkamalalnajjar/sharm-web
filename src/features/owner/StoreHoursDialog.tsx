import { Clock } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { storesApi } from '@/api';
import { Button, Sheet } from '@/components/ui';
import { formatStoreHours } from '@/lib/format';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { Store } from '@/types';

/**
 * The store's daily opening and closing time, for its owner or the admin. Outside them the store
 * shows closed even with its switch on.
 */
export function StoreHoursDialog({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('مواعيد {name}', { name: store.name })}>
      {open && <HoursForm key={store.id} store={store} onClose={onClose} />}
    </Sheet>
  );
}

/** "21:30:00" → "21:30" for `<input type="time">`. */
const hhmm = (time: string | null, fallback: string) => (time ? time.slice(0, 5) : fallback);
const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

function HoursForm({ store, onClose }: { store: Store; onClose: () => void }) {
  const qc = useQueryClient();
  const [opensAt, setOpensAt] = useState(hhmm(store.opensAt, '10:00'));
  const [closesAt, setClosesAt] = useState(hhmm(store.closesAt, '23:00'));
  // An optional second period in the day, like the apps.
  const [hasSecond, setHasSecond] = useState(!!(store.secondOpensAt && store.secondClosesAt));
  const [secondOpensAt, setSecondOpensAt] = useState(hhmm(store.secondOpensAt ?? null, '19:00'));
  const [secondClosesAt, setSecondClosesAt] = useState(hhmm(store.secondClosesAt ?? null, '23:00'));
  const [busy, setBusy] = useState(false);

  const missing = !opensAt || !closesAt || (hasSecond && (!secondOpensAt || !secondClosesAt));
  const sameTime =
    !missing && (minutes(opensAt) === minutes(closesAt) || (hasSecond && minutes(secondOpensAt) === minutes(secondClosesAt)));
  const overnight = !missing && minutes(closesAt) < minutes(opensAt);
  // The two periods must not overlap (each may run past midnight).
  const span = (a: string, b: string): [number, number][] => {
    const s = minutes(a);
    const e = minutes(b);
    return e > s ? [[s, e]] : [[s, 1440], [0, e]];
  };
  const overlap =
    !missing &&
    !sameTime &&
    hasSecond &&
    span(opensAt, closesAt).some(([a1, a2]) => span(secondOpensAt, secondClosesAt).some(([b1, b2]) => a1 < b2 && b1 < a2));

  async function save(clear = false) {
    setBusy(true);
    const ok = await runAction(
      () =>
        storesApi.setHours(
          store.id,
          clear ? null : opensAt,
          clear ? null : closesAt,
          clear || !hasSecond ? null : secondOpensAt,
          clear || !hasSecond ? null : secondClosesAt,
        ),
      clear ? t('المواعيد اتشالت') : t('المواعيد اتحفظت'),
    );
    setBusy(false);
    if (ok) {
      // The owner's stores and the admin's lists both show the hours.
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="-mt-2 text-xs text-ink-3">{t('برا المواعيد دي المحل بيتقفل لوحده، حتى لو زرار الفتح شغال')}</p>
      {hasSecond && <p className="text-sm font-extrabold text-ink">{t('الفترة الأولى')}</p>}
      <div className="grid grid-cols-2 gap-3">
        <TimeBox label={t('بيفتح')} value={opensAt} onChange={setOpensAt} />
        <TimeBox label={t('بيقفل')} value={closesAt} onChange={setClosesAt} />
      </div>
      {hasSecond ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-ink">{t('الفترة التانية')}</p>
            <button type="button" disabled={busy} onClick={() => setHasSecond(false)} className="text-sm font-bold text-danger hover:underline">
              {t('شيل الفترة التانية')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeBox label={t('بيفتح')} value={secondOpensAt} onChange={setSecondOpensAt} />
            <TimeBox label={t('بيقفل')} value={secondClosesAt} onChange={setSecondClosesAt} />
          </div>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={() => setHasSecond(true)} className="self-start text-sm font-bold text-brand-ink hover:underline">
          + {t('أضف فترة تانية')}
        </button>
      )}
      {!missing && (
        <p className={`text-xs ${sameTime || overlap ? 'text-danger' : 'text-ink-2'}`}>
          {sameTime
            ? t('ميعاد الفتح والقفل مينفعش يبقوا واحد')
            : overlap
              ? t('الفترتين داخلين في بعض، خلّي التانية تبدأ بعد ما الأولى تقفل')
              : overnight && !hasSecond
                ? t('بيقفل بعد نص الليل')
                : t('كل يوم {hours}', {
                    hours: formatStoreHours(opensAt, closesAt, hasSecond ? secondOpensAt : null, hasSecond ? secondClosesAt : null) ?? '',
                  })}
        </p>
      )}
      <Button block size="md" className="mt-1" loading={busy} disabled={missing || sameTime || overlap} onClick={() => save()}>
        {t('حفظ')}
      </Button>
      {store.opensAt && (
        <button type="button" disabled={busy} onClick={() => save(true)} className="py-2 text-sm font-bold text-danger hover:underline disabled:opacity-50">
          {t('شيل المواعيد (الزرار بس اللي يتحكم)')}
        </button>
      )}
    </div>
  );
}

function TimeBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block rounded-2xl border border-line bg-surface-alt/50 px-3.5 py-2.5">
      <span className="block text-xs text-ink-3">{label}</span>
      <span className="mt-1 flex items-center gap-1.5">
        <Clock className="size-[18px] shrink-0 text-brand-ink" />
        <input
          type="time"
          dir="ltr"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-lg font-extrabold text-ink outline-none"
        />
      </span>
    </label>
  );
}
