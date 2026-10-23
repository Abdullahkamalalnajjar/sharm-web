import { Clock } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { storesApi } from '@/api';
import { Button, Sheet } from '@/components/ui';
import { formatStoreHours } from '@/lib/format';
import { runAction } from '@/lib/run-action';
import type { Store } from '@/types';

/**
 * The store's daily opening and closing time, for its owner or the admin. Outside them the store
 * shows closed even with its switch on.
 */
export function StoreHoursDialog({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={`مواعيد ${store.name}`}>
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
  const [busy, setBusy] = useState(false);

  const missing = !opensAt || !closesAt;
  const sameTime = !missing && minutes(opensAt) === minutes(closesAt);
  const overnight = !missing && minutes(closesAt) < minutes(opensAt);

  async function save(clear = false) {
    setBusy(true);
    const ok = await runAction(
      () => storesApi.setHours(store.id, clear ? null : opensAt, clear ? null : closesAt),
      clear ? 'المواعيد اتشالت' : 'المواعيد اتحفظت',
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
      <p className="-mt-2 text-xs text-ink-3">برا المواعيد دي المحل بيتقفل لوحده، حتى لو زرار الفتح شغال</p>
      <div className="grid grid-cols-2 gap-3">
        <TimeBox label="بيفتح" value={opensAt} onChange={setOpensAt} />
        <TimeBox label="بيقفل" value={closesAt} onChange={setClosesAt} />
      </div>
      {!missing && (
        <p className={`text-xs ${sameTime ? 'text-danger' : 'text-ink-2'}`}>
          {sameTime
            ? 'ميعاد الفتح والقفل مينفعش يبقوا واحد'
            : overnight
              ? 'بيقفل بعد نص الليل'
              : `كل يوم ${formatStoreHours(opensAt, closesAt)}`}
        </p>
      )}
      <Button block size="md" className="mt-1" loading={busy} disabled={missing || sameTime} onClick={() => save()}>
        حفظ
      </Button>
      {store.opensAt && (
        <button type="button" disabled={busy} onClick={() => save(true)} className="py-2 text-sm font-bold text-danger hover:underline disabled:opacity-50">
          شيل المواعيد (الزرار بس اللي يتحكم)
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
