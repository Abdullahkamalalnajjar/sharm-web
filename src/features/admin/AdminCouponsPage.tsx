import clsx from 'clsx';
import { CalendarClock, CircleCheck, Copy, Hourglass, Pencil, PowerOff, Plus, Search, SearchX, ShoppingBag, Ticket, UserRound, X, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { couponsApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAdminCoupons } from '@/api/queries';
import { Button, Chip, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { showMessage } from '@/store/ui';
import type { Coupon } from '@/types';

type CouponFilter = 'all' | 'live' | 'off' | 'later' | 'over';

/** The coupon codes: add, edit, turn on / off, and see how often each was used. */
export function AdminCouponsPage() {
  const coupons = useAdminCoupons();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Coupon | null | undefined>(undefined); // undefined = closed, null = new
  const [filter, setFilter] = useState<CouponFilter>('all');
  const [query, setQuery] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: keys.adminCoupons });

  async function toggle(c: Coupon) {
    if (await runAction(() => couponsApi.setActive(c.id, !c.isActive), c.isActive ? t('الكوبون اتوقف') : t('الكوبون اشتغل'))) refresh();
  }

  const all = coupons.data ?? [];
  const countOf = (f: CouponFilter) => (f === 'all' ? all.length : all.filter((c) => couponState(c).key === f).length);
  const q = query.trim().toLowerCase();
  const list = all.filter((c) => (filter === 'all' || couponState(c).key === filter) && (!q || c.code.toLowerCase().includes(q)));

  const stats: { key: CouponFilter; label: string; color: string; icon: LucideIcon }[] = [
    { key: 'all', label: t('كل الكوبونات'), color: 'var(--color-brand)', icon: Ticket },
    { key: 'live', label: tIn('coupons', 'شغالة'), color: 'var(--color-success)', icon: CircleCheck },
    { key: 'later', label: t('لسه مبدأتش'), color: 'var(--color-warning)', icon: Hourglass },
    { key: 'over', label: t('خلصت'), color: 'var(--color-danger)', icon: CalendarClock },
    { key: 'off', label: t('موقوفة'), color: 'var(--color-ink-3)', icon: PowerOff },
  ];

  return (
    <div className="pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('الكوبونات')}</h1>
          {coupons.data && <p className="text-[13px] font-medium text-ink-3">{t('{n} كوبون شغال دلوقتي', { n: countOf('live') })}</p>}
        </div>
        <Button size="md" icon={<Plus className="size-4" />} title={t('كوبون جديد')} onClick={() => setEditing(null)}>
          <span className="hidden sm:inline">{t('كوبون جديد')}</span>
        </Button>
      </div>

      <div className="px-4 pt-4">
        {coupons.isLoading ? (
          <Loading />
        ) : coupons.isError ? (
          <ErrorView message={(coupons.error as Error).message} onRetry={() => coupons.refetch()} />
        ) : all.length === 0 ? (
          <EmptyView icon={Ticket} message={t('مفيش كوبونات لسه.\nضيف أول كوبون.')} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* The counts double as filters. */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((s) => {
                const selected = filter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilter(s.key)}
                    aria-pressed={selected}
                    className={clsx(
                      'flex items-center gap-3 rounded-card border bg-surface p-3.5 text-start shadow-card transition-colors',
                      selected ? 'border-brand ring-1 ring-brand' : 'border-transparent hover:bg-surface-alt',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[22px] font-extrabold leading-tight text-ink tabular-nums">{countOf(s.key)}</span>
                      <span className="block truncate text-xs font-semibold text-ink-2">{s.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand md:w-[380px]">
                <Search className="size-5 text-ink-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('دور بالكود')}
                  dir="auto"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
                />
                {query && (
                  <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
                    <X className="size-5" />
                  </button>
                )}
              </label>
              <p className="text-xs leading-relaxed text-ink-3 md:max-w-md md:text-end">
                {t('الخصم على المنتجات بس (مش التوصيل ولا البقشيش)، والمحل بياخد أرباحه كاملة.')}
              </p>
            </div>

            {list.length === 0 ? (
              <EmptyView icon={q ? SearchX : Ticket} message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : t('مفيش كوبونات هنا')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {list.map((c) => (
                  <CouponCard key={c.id} coupon={c} onEdit={() => setEditing(c)} onToggle={() => toggle(c)} />
                ))}
              </div>
            )}
          </div>
        )}
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

/** Whether the coupon works right now: on, started, not ended and not used up. */
function couponState(c: Coupon): { key: Exclude<CouponFilter, 'all'>; label: string; color: string } {
  const now = Date.now();
  const utc = (s: string) => (s.endsWith('Z') || s.includes('+') ? new Date(s) : new Date(`${s}Z`)).getTime();
  if (!c.isActive) return { key: 'off', label: t('موقوف'), color: 'var(--color-ink-3)' };
  if (c.startsAtUtc && utc(c.startsAtUtc) > now) return { key: 'later', label: t('لسه مبدأش'), color: 'var(--color-warning)' };
  if (c.endsAtUtc && utc(c.endsAtUtc) <= now) return { key: 'over', label: t('خلص'), color: 'var(--color-danger)' };
  if (c.usageLimit != null && c.timesUsed >= c.usageLimit) return { key: 'over', label: t('استُنفد'), color: 'var(--color-danger)' };
  return { key: 'live', label: t('شغال'), color: 'var(--color-success)' };
}

/** A coupon as a ticket: the discount on one side, the code and its limits on the other. */
function CouponCard({ coupon: c, onEdit, onToggle }: { coupon: Coupon; onEdit: () => void; onToggle: () => void }) {
  const state = couponState(c);
  const live = state.key === 'live';
  const used = c.usageLimit ? Math.min(100, (c.timesUsed / c.usageLimit) * 100) : null;
  return (
    <SoftCard className="flex h-full flex-col overflow-hidden">
      <div className={clsx('flex flex-1', state.key === 'off' && 'opacity-70')}>
        {/* The discount, on the brand color while the coupon works. */}
        <button
          type="button"
          onClick={onEdit}
          className={clsx('relative flex w-[104px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-4 text-center', live ? 'bg-brand text-white' : 'bg-surface-alt text-ink-2')}
        >
          <span className="text-[26px] font-black leading-none tabular-nums" dir="ltr">
            {c.kind === 'Fixed' ? c.value : `${c.value}%`}
          </span>
          <span className={clsx('text-[11px] font-bold', live ? 'text-white/85' : 'text-ink-3')}>{c.kind === 'Fixed' ? t('ج.م خصم') : t('خصم')}</span>
          {c.kind === 'Percent' && c.maxDiscount ? (
            <span className={clsx('mt-1 text-[10.5px] font-semibold', live ? 'text-white/75' : 'text-ink-3')}>
              {t('لحد')} {formatPrice(c.maxDiscount)}
            </span>
          ) : null}
          {/* The ticket's notches on the dashed edge. */}
          <span className="absolute -top-2 -end-2 size-4 rounded-full bg-bg" />
          <span className="absolute -bottom-2 -end-2 size-4 rounded-full bg-bg" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2 border-s-2 border-dashed border-line px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onEdit} dir="ltr" className="min-w-0 truncate text-[17px] font-black tracking-wider text-ink hover:text-brand-ink">
              {c.code}
            </button>
            <button
              type="button"
              title={t('نسخ')}
              aria-label={t('نسخ')}
              onClick={() => navigator.clipboard.writeText(c.code).then(() => showMessage(t('اتنسخ')))}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt hover:text-ink"
            >
              <Copy className="size-3.5" />
            </button>
            <span className="flex-1" />
            <StatusChip label={state.label} color={state.color} />
          </div>

          <div className="flex flex-col gap-1 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="size-3.5 shrink-0 text-ink-3" />
              {c.minOrder ? `${t('أقل طلب')} ${formatPrice(c.minOrder)}` : t('مفيش حد أدنى')}
            </span>
            {c.perCustomerLimit != null && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5 shrink-0 text-ink-3" />
                {t('{n} لكل عميل', { n: c.perCustomerLimit })}
              </span>
            )}
            {(c.startsAtUtc || c.endsAtUtc) && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0 text-ink-3" />
                <span className="truncate">
                  {state.key === 'later' && c.startsAtUtc
                    ? `${t('يبدأ')} ${formatOrderDate(c.startsAtUtc)}`
                    : c.endsAtUtc
                      ? `${t('لحد')} ${formatOrderDate(c.endsAtUtc)}`
                      : t('من غير تاريخ انتهاء')}
                </span>
              </span>
            )}
          </div>

          <div className="mt-auto">
            <div className="flex items-center justify-between text-[11.5px] font-semibold text-ink-3">
              <span>{t('اتستخدم {n} مرة', { n: c.timesUsed })}</span>
              {c.usageLimit != null && <span className="tabular-nums">{t('من {n}', { n: c.usageLimit })}</span>}
            </div>
            {used !== null && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                <div className="h-full rounded-full" style={{ width: `${used}%`, background: used >= 100 ? 'var(--color-danger)' : 'var(--color-brand)' }} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-surface-alt/60 px-3 py-2">
        <Switch checked={c.isActive} onChange={onToggle} label={c.isActive ? t('إيقاف') : t('تشغيل')} />
        <span className="text-[13px] text-ink-2">{c.isActive ? t('مفعّل') : t('موقوف')}</span>
        <span className="flex-1" />
        <button type="button" onClick={onEdit} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-ink-2 hover:bg-surface hover:text-ink">
          <Pencil className="size-4" />
          {t('تعديل')}
        </button>
      </div>
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
