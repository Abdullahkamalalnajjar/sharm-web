import { Percent } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { Button, InlineError, Sheet, Switch, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { runAction } from '@/lib/run-action';
import type { Store } from '@/types';

/** The admin's settings of a store: commission and scheduled orders. They apply to new orders only. */
export function StoreSettingsDialog({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('إعدادات {name}', { name: localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt) })}>
      {open && <SettingsForm key={store.id} store={store} onClose={onClose} />}
    </Sheet>
  );
}

function SettingsForm({ store, onClose }: { store: Store; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const [commission, setCommission] = useState(String(store.commissionPercent ?? 0));
  const [scheduled, setScheduled] = useState(store.allowsScheduledOrders);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(commission);
    if (commission.trim() === '' || Number.isNaN(value) || value < 0 || value > 100) return setError(t('العمولة من 0 لـ 100'));
    setBusy(true);
    const ok = await runAction(
      () => storesApi.updateSettings(store.id, { commissionPercent: value, allowsScheduledOrders: scheduled }),
      t('الإعدادات اتحفظت'),
    );
    setBusy(false);
    if (ok) {
      refresh();
      onClose();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-xs text-ink-3">{t('بتتطبّق على الأوردرات الجديدة بس')}</p>
      <TextField
        name="commission"
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        ltr
        label={t('العمولة %')}
        hint={t('نسبة التطبيق من سعر المنتجات، بتتخصم من حساب المحل (الزبون مش بيدفعها)')}
        start={<Percent className="size-4" />}
        value={commission}
        onChange={(e) => setCommission(e.target.value)}
      />
      <div className="flex items-start gap-3 rounded-2xl border border-line p-3">
        <span className="flex-1">
          <span className="block font-bold text-ink">{t('الطلبات المجدولة')}</span>
          <span className="block text-xs text-ink-2">{t('الزبون يطلب لميعاد النهارده أو بكرة، حتى لو المحل مقفول دلوقتي')}</span>
        </span>
        <Switch checked={scheduled} onChange={setScheduled} label={t('الطلبات المجدولة')} />
      </div>
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          {t('إلغاء')}
        </Button>
        <Button type="submit" size="md" loading={busy}>
          {t('حفظ')}
        </Button>
      </div>
    </form>
  );
}
