import clsx from 'clsx';
import { Plus, Ticket } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { couponsApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAdminCoupons } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { showMessage } from '@/store/ui';
import type { Coupon } from '@/types';

/** The coupon codes: add, edit, turn on / off, and see how often each was used. */
export function AdminCouponsPage() {
  const coupons = useAdminCoupons();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Coupon | null | undefined>(undefined); // undefined = closed, null = new

  const refresh = () => qc.invalidateQueries({ queryKey: keys.adminCoupons });

  async function toggle(c: Coupon) {
    if (await runAction(() => couponsApi.setActive(c.id, !c.isActive), c.isActive ? t('الكوبون اتوقف') : t('الكوبون اشتغل'))) refresh();
  }

  const list = coupons.data ?? [];

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <PageHeader
        title={t('الكوبونات')}
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            {t('كوبون جديد')}
          </Button>
        }
      />
      <div className="px-4">
        {coupons.isLoading ? (
          <Loading />
        ) : coupons.isError ? (
          <ErrorView message={(coupons.error as Error).message} onRetry={() => coupons.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView icon={Ticket} message={t('مفيش كوبونات لسه.\nضيف أول كوبون.')} />
        ) : (
          <div className="grid items-start gap-2.5 md:grid-cols-2">
            {list.map((c) => (
              <CouponRow key={c.id} coupon={c} onEdit={() => setEditing(c)} onToggle={() => toggle(c)} />
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-24 z-30 px-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<Plus className="size-5" />} onClick={() => setEditing(null)}>
            {t('كوبون جديد')}
          </Button>
        </div>
      </div>

      <CouponFormSheet
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        coupon={editing ?? null}
        onClose={() => setEditing(undefined)}
        onSaved={refresh}
      />
    </div>
  );
}

/** "10%" / "25 ج.م" (a percent coupon also says its cap). */
function discountText(c: Coupon): string {
  if (c.kind === 'Fixed') return formatPrice(c.value);
  return c.maxDiscount ? `${c.value}% (${t('لحد')} ${formatPrice(c.maxDiscount)})` : `${c.value}%`;
}

/** Whether the coupon works right now: on, started, not ended and not used up. */
function couponState(c: Coupon): { label: string; color: string } {
  const now = Date.now();
  const utc = (s: string) => (s.endsWith('Z') || s.includes('+') ? new Date(s) : new Date(`${s}Z`)).getTime();
  if (!c.isActive) return { label: t('موقوف'), color: 'var(--color-ink-3)' };
  if (c.startsAtUtc && utc(c.startsAtUtc) > now) return { label: t('لسه مبدأش'), color: 'var(--color-warning)' };
  if (c.endsAtUtc && utc(c.endsAtUtc) <= now) return { label: t('خلص'), color: 'var(--color-danger)' };
  if (c.usageLimit != null && c.timesUsed >= c.usageLimit) return { label: t('استُنفد'), color: 'var(--color-danger)' };
  return { label: t('شغال'), color: 'var(--color-success)' };
}

function CouponRow({ coupon: c, onEdit, onToggle }: { coupon: Coupon; onEdit: () => void; onToggle: () => void }) {
  const state = couponState(c);
  return (
    <SoftCard className={clsx('flex items-center gap-3 p-3', !c.isActive && 'opacity-70')}>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-start">
        <span className="flex flex-wrap items-center gap-2">
          <span dir="ltr" className="font-extrabold tracking-wide text-ink">{c.code}</span>
          <StatusChip label={state.label} color={state.color} />
        </span>
        <span className="mt-0.5 block text-sm text-ink-2">
          {t('خصم')} {discountText(c)}
          {c.minOrder ? ` • ${t('أقل طلب')} ${formatPrice(c.minOrder)}` : ''}
        </span>
        <span className="block text-xs text-ink-3">
          {t('اتستخدم {n} مرة', { n: c.timesUsed })}
          {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
          {c.perCustomerLimit != null ? ` • ${t('{n} لكل عميل', { n: c.perCustomerLimit })}` : ''}
          {c.endsAtUtc ? ` • ${t('لحد')} ${formatOrderDate(c.endsAtUtc)}` : ''}
        </span>
      </button>
      <Switch checked={c.isActive} onChange={onToggle} label={c.isActive ? t('إيقاف') : t('تشغيل')} />
    </SoftCard>
  );
}

/** An ISO UTC time as the value of a datetime-local input (the admin's own time zone). */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value.endsWith('Z') || value.includes('+') ? value : `${value}Z`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value back to ISO UTC; null when empty. */
const fromLocalInput = (value: string): string | null => (value ? new Date(value).toISOString() : null);

const toNumberOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value));

function CouponFormSheet({ open, coupon, onClose, onSaved }: { open: boolean; coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const isNew = coupon === null;
  const [code, setCode] = useState(coupon?.code ?? '');
  const [kind, setKind] = useState<'Percent' | 'Fixed'>(coupon?.kind ?? 'Percent');
  const [value, setValue] = useState(coupon ? String(coupon.value) : '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount != null ? String(coupon.maxDiscount) : '');
  const [minOrder, setMinOrder] = useState(coupon?.minOrder != null ? String(coupon.minOrder) : '');
  const [startsAt, setStartsAt] = useState(toLocalInput(coupon?.startsAtUtc ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(coupon?.endsAtUtc ?? null));
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit != null ? String(coupon.usageLimit) : '');
  const [perCustomer, setPerCustomer] = useState(coupon?.perCustomerLimit != null ? String(coupon.perCustomerLimit) : '');
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(value);
    if (!code.trim()) return setError(t('اكتب كود الكوبون'));
    if (!(amount > 0)) return setError(t('اكتب قيمة الخصم'));
    if (kind === 'Percent' && amount > 100) return setError(t('النسبة مينفعش تعدّي 100'));
    setBusy(true);
    setError(null);
    try {
      const input = {
        code: code.trim().toUpperCase(),
        kind,
        value: amount,
        maxDiscount: kind === 'Percent' ? toNumberOrNull(maxDiscount) : null,
        minOrder: toNumberOrNull(minOrder),
        startsAtUtc: fromLocalInput(startsAt),
        endsAtUtc: fromLocalInput(endsAt),
        usageLimit: toNumberOrNull(usageLimit),
        perCustomerLimit: toNumberOrNull(perCustomer),
        isActive,
      };
      if (isNew) await couponsApi.create(input);
      else await couponsApi.update(coupon.id, input);
      showMessage(isNew ? t('الكوبون اتضاف') : t('الكوبون اتحفظ'));
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isNew ? t('كوبون جديد') : t('تعديل الكوبون')} wide>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField name="code" label={t('الكود')} placeholder="WELCOME10" ltr maxLength={30} autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />

        <p className="text-sm font-bold text-ink-2">{t('نوع الخصم')}</p>
        <div className="flex gap-2">
          <Chip selected={kind === 'Percent'} onClick={() => setKind('Percent')}>{t('نسبة %')}</Chip>
          <Chip selected={kind === 'Fixed'} onClick={() => setKind('Fixed')}>{t('مبلغ ثابت')}</Chip>
        </div>
        <TextField name="value" type="number" inputMode="decimal" ltr min={0} label={kind === 'Percent' ? t('النسبة (%)') : t('المبلغ (ج.م)')} value={value} onChange={(e) => setValue(e.target.value)} />
        {kind === 'Percent' && (
          <TextField name="max" type="number" inputMode="decimal" ltr min={0} label={t('أقصى خصم (ج.م) - اختياري')} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
        )}
        <TextField name="min" type="number" inputMode="decimal" ltr min={0} label={t('أقل قيمة للمنتجات (ج.م) - اختياري')} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="starts" type="datetime-local" ltr label={t('يبدأ من - اختياري')} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <TextField name="ends" type="datetime-local" ltr label={t('ينتهي في - اختياري')} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="limit" type="number" inputMode="numeric" ltr min={1} label={t('أقصى عدد استخدامات - اختياري')} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
          <TextField name="each" type="number" inputMode="numeric" ltr min={1} label={t('مرات لكل عميل - اختياري')} value={perCustomer} onChange={(e) => setPerCustomer(e.target.value)} />
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-2.5">
          <span className="flex-1 font-bold text-ink">{t('الكوبون شغال')}</span>
          <Switch checked={isActive} onChange={setIsActive} label={t('الكوبون شغال')} />
        </div>
        <p className="text-xs leading-relaxed text-ink-3">
          {t('الخصم على المنتجات بس (مش التوصيل ولا البقشيش)، والمحل بياخد أرباحه كاملة.')}
        </p>

        {error && <InlineError message={error} />}
        <Button type="submit" loading={busy} block className="mt-1">
          {isNew ? t('إضافة الكوبون') : t('حفظ')}
        </Button>
      </form>
    </Sheet>
  );
}
