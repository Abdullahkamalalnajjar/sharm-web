import clsx from 'clsx';
import { Bike, ReceiptText, Search, SearchX, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAdminOrders } from '@/api/queries';
import { EmptyView, ErrorView, Loading, SoftCard, StatusChip } from '@/components/ui';
import { OrderStatusBadge, OrderSummaryCard, ScheduledChip, needsDriver } from '@/features/orders/OrderWidgets';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
import { orderStatus } from '@/lib/meta';
import type { OrderStatus, OrderSummary } from '@/types';

const FILTERS: [string, OrderStatus | 'all'][] = [
  ['جديدة', 'Pending'],
  ['مقبولة', 'Confirmed'],
  ['بتتجهز', 'Processing'],
  ['جاهزة للتسليم', 'ReadyForPickup'],
  ['في الطريق', 'OutForDelivery'],
  ['اتوصلت', 'Delivered'],
  ['ملغية', 'Cancelled'],
  ['الكل', 'all'],
];

const COLUMNS = 'grid-cols-[96px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_110px_150px_minmax(0,1fr)]';

/** Every order in the app, as a table on wide screens and cards on phones. Defaults to new orders. */
export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const raw = (params.get('status') ?? 'Pending') as OrderStatus | 'all';
  // All orders once: each tab shows its count and switching tabs needs no new request.
  const orders = useAdminOrders(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const all = orders.data ?? [];
  const count = (value: OrderStatus | 'all') => (value === 'all' ? all.length : all.filter((o) => o.status === value).length);
  const q = query.trim().toLowerCase();
  const matches = (o: OrderSummary) =>
    !q ||
    o.number.toLowerCase().includes(q) ||
    o.storeNames.some((s) => s.toLowerCase().includes(q)) ||
    (o.customerEmail ?? '').toLowerCase().includes(q) ||
    o.addressLabel.toLowerCase().includes(q) ||
    (o.driverName ?? '').toLowerCase().includes(q);
  const list = all.filter((o) => (raw === 'all' || o.status === raw) && matches(o));
  const open = (o: OrderSummary) => navigate(`/admin/orders/${o.id}`);

  const setFilter = (value: OrderStatus | 'all') => {
    params.set('status', value);
    setParams(params, { replace: true });
  };

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{tIn('nav', 'الأوردرات')}</h1>
          {orders.data && <p className="text-[13px] font-medium text-ink-3">{t('{n} أوردر', { n: all.length })}</p>}
        </div>
        <label className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand sm:w-[340px]">
          <Search className="size-5 text-ink-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('رقم الأوردر، المحل، الزبون، المندوب')}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
          />
          {query && (
            <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
              <X className="size-5" />
            </button>
          )}
        </label>
      </div>

      <div className="sticky top-0 z-20 bg-bg/95 px-4 py-3 backdrop-blur md:top-[60px]">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {FILTERS.map(([label, value]) => {
            const selected = raw === value;
            const meta = value === 'all' ? null : orderStatus(value);
            const n = count(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={clsx(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors',
                  selected ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-surface-alt',
                )}
              >
                {meta && <meta.Icon className="size-4" style={{ color: selected ? '#fff' : meta.color }} />}
                {t(label)}
                {orders.data && (
                  <span className={clsx('rounded-full px-1.5 text-xs font-bold tabular-nums', selected ? 'bg-white/20 text-white' : 'bg-surface-alt text-ink-2')}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {orders.isLoading ? (
          <Loading />
        ) : orders.isError ? (
          <ErrorView message={(orders.error as Error).message} onRetry={() => orders.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView
            icon={q ? SearchX : ReceiptText}
            message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : raw === 'Pending' ? t('مفيش أوردرات جديدة دلوقتي 👌') : t('مفيش أوردرات هنا')}
          />
        ) : (
          <>
            {/* Wide screens: one row per order. */}
            <SoftCard className="hidden overflow-hidden lg:block">
              <div className={clsx('grid gap-3 border-b border-line bg-surface-alt/60 px-4 py-2.5 text-xs font-bold text-ink-3', COLUMNS)}>
                <span>{t('رقم')}</span>
                <span>{t('المحل')}</span>
                <span>{t('الزبون والعنوان')}</span>
                <span>{tIn('nav', 'المندوبين')}</span>
                <span>{t('الإجمالي')}</span>
                <span>{t('الحالة')}</span>
                <span>{t('الوقت')}</span>
              </div>
              {list.map((o) => (
                <OrderRow key={o.id} order={o} onClick={() => open(o)} />
              ))}
            </SoftCard>

            {/* Phones and tablets: cards. */}
            <div className="grid gap-2.5 md:grid-cols-2 lg:hidden">
              {list.map((o) => (
                <OrderSummaryCard key={o.id} order={o} showCustomer onClick={() => open(o)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order: o, onClick }: { order: OrderSummary; onClick: () => void }) {
  const meta = orderStatus(o.status);
  const missingDriver = needsDriver(o, o.driverName != null);
  const needsFee = o.status === 'Pending' && o.deliveryFee == null;
  const waitingStore = o.status === 'Pending' && o.storeDecision === 'Pending';
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('grid w-full items-center gap-3 border-b border-line px-4 py-3 text-start text-sm last:border-b-0 hover:bg-surface-alt/50', COLUMNS)}
    >
      <span className="font-extrabold text-ink tabular-nums" dir="ltr">
        #{o.number}
      </span>
      <span className="min-w-0">
        {o.isCustomOrder ? (
          <span className="flex items-center gap-1 font-bold text-custom">
            <Sparkles className="size-4 shrink-0" />
            {t('طلب خاص')}
          </span>
        ) : (
          <span className="block truncate font-bold text-ink">{o.storeNames.join(' • ')}</span>
        )}
        <span className="block text-xs text-ink-3">{o.isCustomOrder ? t('من خارج المنيو') : t('{n} منتج', { n: o.itemsCount })}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ink" dir="ltr" style={{ textAlign: 'start' }}>
          {o.customerEmail ?? '—'}
        </span>
        <span className="block truncate text-xs text-ink-3">{o.addressLabel}</span>
      </span>
      <span className="min-w-0 truncate">
        {o.driverName ? (
          <span className="inline-flex items-center gap-1 text-ink">
            <Bike className="size-4 shrink-0 text-ink-3" />
            <span className="truncate">{o.driverName}</span>
          </span>
        ) : missingDriver ? (
          <StatusChip label={t('محتاج مندوب')} color="var(--color-warning)" />
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </span>
      <span className="font-extrabold text-ink tabular-nums">{formatPrice(o.total)}</span>
      <span className="flex flex-col items-start gap-1">
        <OrderStatusBadge status={o.status} />
        {waitingStore && <StatusChip label={t('مستني المحل')} color="var(--color-warning)" />}
        {needsFee && <StatusChip label={t('محتاج سعر توصيل')} color="var(--color-warning)" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-ink-2">{formatOrderDate(o.createdUtc)}</span>
        {o.scheduledForUtc && meta.isActive && (
          <span className="mt-1 block">
            <ScheduledChip value={o.scheduledForUtc} />
          </span>
        )}
      </span>
    </button>
  );
}
