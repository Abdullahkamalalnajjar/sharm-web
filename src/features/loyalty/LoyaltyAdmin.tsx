import { Gift, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { loyaltyApi } from '@/api';
import { keys, useCustomerPoints, useLoyaltySettings } from '@/api/queries';
import { Button, InlineError, Segmented, Sheet, SoftCard, Switch, TextField } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { LoyaltySettings } from '@/types';

/** Admin dashboard: the points rule (on/off, minimum order total, points per order). */
export function LoyaltySettingsCard() {
  const settings = useLoyaltySettings();
  const [editing, setEditing] = useState(false);
  const s = settings.data;

  return (
    <SoftCard className="p-4">
      <div className="flex items-center">
        <span className="font-extrabold text-ink">{t('نظام النقط')}</span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} disabled={!s} onClick={() => setEditing(true)}>
          {t('تعديل')}
        </Button>
      </div>
      {settings.isError ? (
        <button type="button" className="mt-2 text-sm text-brand-ink" onClick={() => settings.refetch()}>
          {t('تعذّر التحميل، حاول تاني')}
        </button>
      ) : (
        <p className="mt-2 flex items-center gap-2 font-semibold text-ink">
          <Gift className="size-5" style={{ color: s?.isEnabled ? 'var(--color-success)' : 'var(--color-ink-3)' }} />
          {!s
            ? '—'
            : s.isEnabled
              ? t('أوردر {p} أو أكتر = {n} نقطة', { p: formatPrice(s.minOrderTotal), n: s.pointsPerOrder })
              : t('متوقف: الزباين مش بيكسبوا نقط')}
        </p>
      )}
      <Sheet open={editing} onClose={() => setEditing(false)} title={t('نظام النقط')}>
        {editing && s && <SettingsForm current={s} onClose={() => setEditing(false)} />}
      </Sheet>
    </SoftCard>
  );
}

function SettingsForm({ current, onClose }: { current: LoyaltySettings; onClose: () => void }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(current.isEnabled);
  const [min, setMin] = useState(current.minOrderTotal ? String(current.minOrderTotal) : '1000');
  const [points, setPoints] = useState(current.pointsPerOrder ? String(current.pointsPerOrder) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minOrderTotal = Number(min);
    const pointsPerOrder = points.trim() === '' ? 0 : Number(points);
    if (min.trim() === '' || Number.isNaN(minOrderTotal) || minOrderTotal < 0) return setError(t('اكتب أقل إجمالي صحيح'));
    if (!Number.isInteger(pointsPerOrder) || pointsPerOrder < 0) return setError(t('عدد النقط لازم يبقى رقم صحيح'));
    if (enabled && pointsPerOrder === 0) return setError(t('اكتب عدد النقط'));
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.loyaltySettings, await loyaltyApi.updateSettings({ isEnabled: enabled, minOrderTotal, pointsPerOrder }));
    }, t('إعدادات النقط اتحفظت'));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-bold text-ink">{t('الزباين يكسبوا نقط')}</span>
        <Switch checked={enabled} onChange={setEnabled} label={t('الزباين يكسبوا نقط')} />
      </div>
      <TextField
        name="minOrderTotal"
        type="number"
        inputMode="decimal"
        ltr
        label={t('أقل إجمالي للأوردر (المنتجات + التوصيل + الضريبة)')}
        value={min}
        onChange={(e) => setMin(e.target.value)}
        end={<span className="text-sm">{t('ج.م')}</span>}
      />
      <TextField
        name="pointsPerOrder"
        type="number"
        inputMode="numeric"
        ltr
        label={t('النقط اللي ياخدها')}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        end={<span className="text-sm">{t('نقطة')}</span>}
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

/** Admin order page: the customer's points, with add / take. */
export function CustomerPointsCard({ customerId }: { customerId: string }) {
  const account = useCustomerPoints(customerId);
  const [adjusting, setAdjusting] = useState(false);
  const balance = account.data?.balance;

  return (
    <SoftCard className="flex items-center gap-3 p-4">
      <Gift className="size-5 text-brand-ink" />
      <span className="flex-1 font-bold text-ink">
        {account.isError ? t('تعذّر تحميل النقط') : t('نقط الزبون: {n}', { n: balance ?? '…' })}
      </span>
      <Button variant="ghost" size="sm" disabled={balance === undefined} onClick={() => setAdjusting(true)}>
        {t('زوّد / اخصم')}
      </Button>
      <Sheet open={adjusting} onClose={() => setAdjusting(false)} title={t('نقط الزبون ({n})', { n: balance ?? 0 })}>
        {adjusting && balance !== undefined && (
          <AdjustForm customerId={customerId} balance={balance} onClose={() => setAdjusting(false)} />
        )}
      </Sheet>
    </SoftCard>
  );
}

function AdjustForm({ customerId, balance, onClose }: { customerId: string; balance: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'add' | 'take'>('add');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(points);
    if (!Number.isInteger(n) || n <= 0) return setError(t('اكتب عدد النقط'));
    if (mode === 'take' && n > balance) return setError(t('الزبون معاه {n} بس', { n: balance }));
    if (!reason.trim()) return setError(t('اكتب السبب'));
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.customerPoints(customerId), await loyaltyApi.adjust(customerId, mode === 'add' ? n : -n, reason.trim()));
    }, mode === 'add' ? t('النقط اتضافت') : t('النقط اتخصمت'));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'add', label: t('زوّد') },
          { value: 'take', label: t('اخصم') },
        ]}
      />
      <TextField
        name="points"
        type="number"
        inputMode="numeric"
        ltr
        autoFocus
        label={t('عدد النقط')}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        end={<span className="text-sm">{t('نقطة')}</span>}
      />
      <TextField
        name="reason"
        label={t('السبب')}
        maxLength={200}
        placeholder={t('مثلاً: هدية، تعويض، استبدال جايزة')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
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
