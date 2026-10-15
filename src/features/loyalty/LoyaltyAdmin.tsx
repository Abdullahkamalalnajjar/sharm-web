import { Gift, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { loyaltyApi } from '@/api';
import { keys, useCustomerPoints, useLoyaltySettings } from '@/api/queries';
import { Button, InlineError, Segmented, Sheet, SoftCard, Switch, TextField } from '@/components/ui';
import { formatPrice } from '@/lib/format';
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
        <span className="font-extrabold text-ink">نظام النقط</span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} disabled={!s} onClick={() => setEditing(true)}>
          تعديل
        </Button>
      </div>
      {settings.isError ? (
        <button type="button" className="mt-2 text-sm text-brand-ink" onClick={() => settings.refetch()}>
          تعذّر التحميل، حاول تاني
        </button>
      ) : (
        <p className="mt-2 flex items-center gap-2 font-semibold text-ink">
          <Gift className="size-5" style={{ color: s?.isEnabled ? 'var(--color-success)' : 'var(--color-ink-3)' }} />
          {!s ? '—' : s.isEnabled ? `أوردر ${formatPrice(s.minOrderTotal)} أو أكتر = ${s.pointsPerOrder} نقطة` : 'متوقف: الزباين مش بيكسبوا نقط'}
        </p>
      )}
      <Sheet open={editing} onClose={() => setEditing(false)} title="نظام النقط">
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
    if (min.trim() === '' || Number.isNaN(minOrderTotal) || minOrderTotal < 0) return setError('اكتب أقل إجمالي صحيح');
    if (!Number.isInteger(pointsPerOrder) || pointsPerOrder < 0) return setError('عدد النقط لازم يبقى رقم صحيح');
    if (enabled && pointsPerOrder === 0) return setError('اكتب عدد النقط');
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.loyaltySettings, await loyaltyApi.updateSettings({ isEnabled: enabled, minOrderTotal, pointsPerOrder }));
    }, 'إعدادات النقط اتحفظت');
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-bold text-ink">الزباين يكسبوا نقط</span>
        <Switch checked={enabled} onChange={setEnabled} label="الزباين يكسبوا نقط" />
      </div>
      <TextField
        name="minOrderTotal"
        type="number"
        inputMode="decimal"
        ltr
        label="أقل إجمالي للأوردر (المنتجات + التوصيل + الضريبة)"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        end={<span className="text-sm">ج.م</span>}
      />
      <TextField
        name="pointsPerOrder"
        type="number"
        inputMode="numeric"
        ltr
        label="النقط اللي ياخدها"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        end={<span className="text-sm">نقطة</span>}
      />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
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
        {account.isError ? 'تعذّر تحميل النقط' : `نقط الزبون: ${balance ?? '…'}`}
      </span>
      <Button variant="ghost" size="sm" disabled={balance === undefined} onClick={() => setAdjusting(true)}>
        زوّد / اخصم
      </Button>
      <Sheet open={adjusting} onClose={() => setAdjusting(false)} title={`نقط الزبون (${balance ?? 0})`}>
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
    if (!Number.isInteger(n) || n <= 0) return setError('اكتب عدد النقط');
    if (mode === 'take' && n > balance) return setError(`الزبون معاه ${balance} بس`);
    if (!reason.trim()) return setError('اكتب السبب');
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.customerPoints(customerId), await loyaltyApi.adjust(customerId, mode === 'add' ? n : -n, reason.trim()));
    }, mode === 'add' ? 'النقط اتضافت' : 'النقط اتخصمت');
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'add', label: 'زوّد' },
          { value: 'take', label: 'اخصم' },
        ]}
      />
      <TextField
        name="points"
        type="number"
        inputMode="numeric"
        ltr
        autoFocus
        label="عدد النقط"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        end={<span className="text-sm">نقطة</span>}
      />
      <TextField
        name="reason"
        label="السبب"
        maxLength={200}
        placeholder="مثلاً: هدية، تعويض، استبدال جايزة"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}
