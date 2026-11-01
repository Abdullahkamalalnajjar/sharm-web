import { Percent } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { Button, InlineError, Sheet, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { Store } from '@/types';

/** The store's tax %: customers pay it on the products of new orders, and it goes to the store. */
export function StoreTaxDialog({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('ضريبة المحل')}>
      {open && <TaxForm key={store.id} store={store} onClose={onClose} />}
    </Sheet>
  );
}

function TaxForm({ store, onClose }: { store: Store; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const [value, setValue] = useState(store.taxPercent ? String(store.taxPercent) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const percent = value.trim() === '' ? 0 : Number(value);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) return setError(t('الضريبة من 0 لـ 100%'));
    setBusy(true);
    const ok = await runAction(() => storesApi.setTax(store.id, percent), t('الضريبة اتحفظت'));
    setBusy(false);
    if (ok) {
      refresh();
      onClose();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">{t('الزبون بيدفعها فوق سعر المنتجات، وبتتضاف لصافي المحل. بتتطبق على الأوردرات الجديدة بس.')}</p>
      <TextField
        name="taxPercent"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        max={100}
        ltr
        autoFocus
        label={t('النسبة %')}
        placeholder={t('0 = من غير ضريبة')}
        start={<Percent className="size-4" />}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
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
