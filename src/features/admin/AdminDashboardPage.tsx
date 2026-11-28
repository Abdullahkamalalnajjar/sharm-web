import clsx from 'clsx';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bike,
  ChevronLeft,
  CircleCheck,
  Hourglass,
  Landmark,
  LayoutGrid,
  LogOut,
  Package,
  PlusSquare,
  ReceiptText,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  UserRoundSearch,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useAdminDashboard, useAdminOrders, useReport, useTodayReport, useWalletsOverview } from '@/api/queries';
import { Button, ErrorView, IconWell, Loading, SoftCard, StatusChip } from '@/components/ui';
import { ADMIN_GROUPS, useAdminBadges } from '@/components/layout/AdminSidebar';
import { LoyaltySettingsCard } from '@/features/loyalty/LoyaltyAdmin';
import { compactNumber, formatFullDate, formatOrderDate, formatPrice } from '@/lib/format';
import { categoryLook, orderStatus, storeStatus } from '@/lib/meta';
import { t, tIn } from '@/lib/i18n';
import { useAuth } from '@/store/auth';
import type { AdminDashboard, OrderStatus, ReportTotals, StoreStatus } from '@/types';

import { AdminStoreCard } from './AdminStoreCard';
import { ChartCard } from './AdminReportsPage';
import { AppFeaturesCard } from './AppFeaturesCard';

/** The admin's home: what needs action, today's numbers, the month's chart, the latest orders. */
export function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const d = dashboard.data;

  const openStores = (status?: StoreStatus) => navigate(status ? `/admin/stores?status=${status}` : '/admin/stores');
  const openOrders = (status: OrderStatus | 'all' = 'Pending') => navigate(`/admin/orders?status=${status}`);

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-8 md:px-6 md:pt-6">
      {/* Greeting and the two main actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-ink">{t('أهلاً يا أدمن 👋')}</h1>
          <p className="text-[13px] text-ink-3">{formatFullDate(new Date())}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="md" variant="outline" icon={<ReceiptText className="size-4" />} onClick={() => openOrders('all')}>
            {t('كل الأوردرات')}
          </Button>
          <Button size="md" icon={<PlusSquare className="size-4" />} onClick={() => navigate('/admin/stores/new')}>
            {t('محل جديد')}
          </Button>
          <button
            type="button"
            title={t('تسجيل الخروج')}
            aria-label={t('تسجيل الخروج')}
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="grid size-10 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface md:hidden"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>

      {dashboard.isLoading ? (
        <Loading />
      ) : dashboard.isError || !d ? (
        <ErrorView message={(dashboard.error as Error)?.message ?? t('حصل خطأ')} onRetry={() => dashboard.refetch()} />
      ) : (
        <>
          <AttentionRow dashboard={d} onOrders={openOrders} onStores={() => openStores('PendingApproval')} onFinance={() => navigate('/admin/finance')} />
          <TodayKpis onOpen={() => navigate('/admin/reports')} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
              <MonthChart onOpen={() => navigate('/admin/reports')} />
              <RecentOrders onOpen={(id) => navigate(`/admin/orders/${id}`)} onAll={() => openOrders('all')} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <OrdersPipeline dashboard={d} onOpen={openOrders} />
              <FinanceCard onOpen={() => navigate('/admin/finance')} />
              <PlatformCard dashboard={d} onStores={() => openStores()} onDrivers={() => navigate('/admin/drivers')} />
            </div>
          </div>

          <Shortcuts />

          <div className="grid gap-4 lg:grid-cols-2">
            <SoftCard className="p-4">
              <div className="flex items-center">
                <h3 className="flex-1 font-extrabold text-ink">{t('المحلات حسب القسم')}</h3>
                <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="size-4" />} onClick={() => navigate('/admin/categories')}>
                  {t('إدارة الأقسام')}
                </Button>
              </div>
              <StoreCategoryBreakdown dashboard={d} />
            </SoftCard>
            <SoftCard className="p-4">
              <h3 className="font-extrabold text-ink">{t('حالة المحلات')}</h3>
              <StoreStatusMeters dashboard={d} onSelect={openStores} />
            </SoftCard>
            <LoyaltySettingsCard />
            <AppFeaturesCard />
          </div>

          {d.pendingApprovals.length > 0 && (
            <section>
              <CardTitle title={t('مستنية موافقتك')} action={t('عرض الكل')} onAction={() => openStores('PendingApproval')} />
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {d.pendingApprovals.map((s) => (
                  <AdminStoreCard key={s.id} store={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CardTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="flex-1 font-extrabold text-ink">{title}</h3>
      {action && (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-0.5 text-[13px] font-bold text-brand-ink hover:underline">
          {action}
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </button>
      )}
    </div>
  );
}

/** Everything waiting for the admin, as small cards; one calm line when nothing is. */
function AttentionRow({
  dashboard: d,
  onOrders,
  onStores,
  onFinance,
}: {
  dashboard: AdminDashboard;
  onOrders: (s: OrderStatus | 'all') => void;
  onStores: () => void;
  onFinance: () => void;
}) {
  const withdrawals = useAdminBadges().withdrawals;
  const items: { icon: LucideIcon; count: number; text: string; color: string; onClick: () => void }[] = [
    { icon: Hourglass, count: d.pendingOrders, text: t('أوردر جديد مستني مراجعة'), color: 'var(--color-warning)', onClick: () => onOrders('Pending') },
    { icon: UserRoundSearch, count: d.unassignedOrders, text: t('أوردر محتاج مندوب'), color: 'var(--color-series-1)', onClick: () => onOrders('all') },
    { icon: Store, count: d.pendingStores, text: t('محل مستني موافقتك'), color: 'var(--color-series-3)', onClick: onStores },
    { icon: Banknote, count: withdrawals, text: t('طلب سحب فلوس'), color: 'var(--color-success)', onClick: onFinance },
  ].filter((i) => i.count > 0);

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-card bg-success/10 px-4 py-3 text-sm font-bold text-ink">
        <CircleCheck className="size-5 text-success" />
        {t('مفيش حاجة مستنياك دلوقتي')}
      </p>
    );
  }
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((i) => (
        <button
          key={i.text}
          type="button"
          onClick={i.onClick}
          className="flex items-center gap-3 rounded-card border p-3 text-start transition-colors hover:brightness-105"
          style={{ background: `color-mix(in srgb, ${i.color} 10%, var(--color-surface))`, borderColor: `color-mix(in srgb, ${i.color} 35%, transparent)` }}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: i.color }}>
            <i.icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-extrabold leading-tight text-ink">{i.count}</span>
            <span className="block truncate text-xs font-semibold text-ink-2">{i.text}</span>
          </span>
          <ChevronLeft className="size-5 text-ink-3 ltr:rotate-180" />
        </button>
      ))}
    </div>
  );
}

/** Change against yesterday, as "+12%"; nothing when there is no yesterday to compare with. */
function change(now: number, before: number): { text: string; up: boolean } | null {
  if (before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}

/** Today's four numbers, each against yesterday. */
function TodayKpis({ onOpen }: { onOpen: () => void }) {
  const report = useTodayReport().data;
  const now = report?.totals;
  const before = report?.previous;
  const kpi = (pick: (r: ReportTotals) => number) => ({ value: now ? pick(now) : null, delta: now && before ? change(pick(now), pick(before)) : null });
  const tiles: { icon: LucideIcon; label: string; color: string; money: boolean; data: ReturnType<typeof kpi> }[] = [
    { icon: Banknote, label: t('مبيعات النهارده'), color: 'var(--color-brand)', money: true, data: kpi((r) => r.sales) },
    { icon: ShoppingBag, label: t('أوردرات النهارده'), color: 'var(--color-series-3)', money: false, data: kpi((r) => r.ordersPlaced) },
    { icon: Truck, label: t('ربح التوصيل'), color: 'var(--color-success)', money: true, data: kpi((r) => r.deliveryFees) },
    { icon: ReceiptText, label: t('متوسط الأوردر'), color: 'var(--color-accent)', money: true, data: kpi((r) => r.averageOrder) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((k) => (
        <SoftCard key={k.label} as="button" onClick={onOpen} className="p-4 text-start">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${k.color} 14%, transparent)`, color: k.color }}>
              <k.icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-2">{k.label}</span>
          </div>
          <p className="mt-3 truncate text-[26px] font-extrabold leading-tight text-ink tabular-nums">
            {k.data.value === null ? '—' : k.money ? formatPrice(Math.round(k.data.value)) : compactNumber(k.data.value)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold">
            {k.data.delta ? (
              <>
                <span className={clsx('inline-flex items-center', k.data.delta.up ? 'text-success' : 'text-danger')}>
                  {k.data.delta.up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  <span dir="ltr">{k.data.delta.text}</span>
                </span>
                <span className="font-medium text-ink-3">{t('عن امبارح')}</span>
              </>
            ) : (
              <span className="font-medium text-ink-3">{t('مفيش مقارنة بامبارح')}</span>
            )}
          </p>
        </SoftCard>
      ))}
    </div>
  );
}

/** This month's bars (money or orders), from the statistics page. */
function MonthChart({ onOpen }: { onOpen: () => void }) {
  const [key] = useState(() => ({ period: 'month' as const, date: new Date() }));
  const report = useReport(key);
  if (report.isLoading) return <SoftCard className="h-[290px] animate-pulse">{null}</SoftCard>;
  if (!report.data) return null;
  return (
    <div className="flex flex-col gap-1">
      <ChartCard report={report.data} reportKey={key} />
      <button type="button" onClick={onOpen} className="self-end px-1 text-[13px] font-bold text-brand-ink hover:underline">
        {t('كل الإحصائيات')}
      </button>
    </div>
  );
}

/** The newest orders as a table on wide screens, a list on phones. */
function RecentOrders({ onOpen, onAll }: { onOpen: (id: number) => void; onAll: () => void }) {
  const orders = useAdminOrders(null);
  const rows = (orders.data ?? []).slice(0, 7);
  return (
    <SoftCard className="p-4">
      <CardTitle title={t('آخر الأوردرات')} action={t('كل الأوردرات')} onAction={onAll} />
      {orders.isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-ink-3">{t('لسه مفيش أوردرات')}</p>
      ) : (
        <div className="mt-3 -mx-4">
          <div className="hidden grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1fr)_110px_130px] gap-3 border-b border-line px-4 pb-2 text-xs font-bold text-ink-3 md:grid">
            <span>{t('رقم')}</span>
            <span>{t('المحل')}</span>
            <span>{t('الوقت')}</span>
            <span>{t('الإجمالي')}</span>
            <span>{t('الحالة')}</span>
          </div>
          {rows.map((o) => {
            const meta = orderStatus(o.status);
            const store = o.isCustomOrder ? t('طلب خاص') : o.storeNames.join('، ');
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onOpen(o.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3 text-start text-sm last:border-b-0 hover:bg-surface-alt/60 md:grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1fr)_110px_130px]"
              >
                <span className="font-extrabold text-ink tabular-nums" dir="ltr">#{o.number}</span>
                <span className="truncate font-semibold text-ink max-md:order-3">{store}</span>
                <span className="truncate text-xs text-ink-3 max-md:order-4 max-md:text-end">{formatOrderDate(o.createdUtc)}</span>
                <span className="font-bold text-ink tabular-nums max-md:hidden">{formatPrice(o.total)}</span>
                <span className="max-md:order-2 max-md:justify-self-end">
                  <StatusChip label={meta.label} color={meta.color} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </SoftCard>
  );
}

/** Orders by stage, each a meter against all orders on the board. */
function OrdersPipeline({ dashboard: d, onOpen }: { dashboard: AdminDashboard; onOpen: (s: OrderStatus | 'all') => void }) {
  const rows: [OrderStatus, string, number][] = [
    ['Pending', t('جديدة'), d.pendingOrders],
    ['Confirmed', t('شغالة'), d.ordersInProgress],
    ['Delivered', t('اتوصلت'), d.deliveredOrders],
  ];
  const total = rows.reduce((n, r) => n + r[2], 0);
  return (
    <SoftCard className="p-4">
      <CardTitle title={t('الأوردرات')} action={t('عرض الكل')} onAction={() => onOpen('all')} />
      <div className="mt-2 flex flex-col">
        {rows.map(([status, label, count]) => {
          const meta = orderStatus(status);
          return (
            <button key={status} type="button" onClick={() => onOpen(status)} className="rounded-lg px-0.5 py-2 text-start hover:bg-surface-alt/50">
              <div className="flex items-center gap-2">
                <meta.Icon className="size-[18px]" style={{ color: meta.color }} />
                <span className="flex-1 text-ink">{label}</span>
                <span className="font-extrabold text-ink tabular-nums">{count}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded" style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}>
                <div className="h-full rounded" style={{ width: `${total === 0 ? 0 : (count / total) * 100}%`, background: meta.color }} />
              </div>
            </button>
          );
        })}
      </div>
    </SoftCard>
  );
}

/** Money at a glance; opens the finance page (withdrawals to pay, balances, transactions). */
function FinanceCard({ onOpen }: { onOpen: () => void }) {
  const o = useWalletsOverview().data;
  const pending = o?.pendingWithdrawalsCount ?? 0;
  return (
    <SoftCard as="button" onClick={onOpen} className="p-4 text-start">
      <div className="flex items-center gap-3">
        <IconWell icon={Landmark} size={40} color="var(--color-success)" />
        <span className="flex-1 font-extrabold text-ink">{t('المالية')}</span>
        {pending > 0 && <StatusChip label={t('{n} طلب سحب', { n: pending })} color="var(--color-warning)" />}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface-alt p-2.5">
          <p className="text-xs text-ink-2">{t('للمحلات')}</p>
          <p className="truncate font-extrabold text-ink tabular-nums">{o ? formatPrice(o.owedToStores) : '—'}</p>
        </div>
        <div className="rounded-xl bg-surface-alt p-2.5">
          <p className="text-xs text-ink-2">{t('كاش مع المناديب')}</p>
          <p className="truncate font-extrabold text-ink tabular-nums">{o ? formatPrice(o.cashWithDrivers) : '—'}</p>
        </div>
      </div>
    </SoftCard>
  );
}

/** The platform's size: people, stores, products. */
function PlatformCard({ dashboard: d, onStores, onDrivers }: { dashboard: AdminDashboard; onStores: () => void; onDrivers: () => void }) {
  const rows: { icon: LucideIcon; label: string; value: number; caption?: string; onClick?: () => void }[] = [
    { icon: Store, label: t('المحلات'), value: d.totalStores, caption: t('{n} مفتوح دلوقتي', { n: d.openStores }), onClick: onStores },
    { icon: Users, label: t('الزباين'), value: d.customers },
    { icon: Bike, label: t('المندوبين المفعّلين'), value: d.activeDrivers, onClick: onDrivers },
    { icon: Store, label: t('أصحاب المحلات'), value: d.storeOwners },
    { icon: Package, label: t('المنتجات'), value: d.totalProducts, caption: d.unavailableProducts > 0 ? t('{n} خلصان', { n: d.unavailableProducts }) : undefined },
    { icon: LayoutGrid, label: t('الأقسام'), value: d.totalCategories },
  ];
  return (
    <SoftCard className="p-4">
      <h3 className="font-extrabold text-ink">{t('المنصة')}</h3>
      <div className="mt-2 flex flex-col">
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            disabled={!r.onClick}
            onClick={r.onClick}
            className="flex items-center gap-2.5 rounded-lg px-0.5 py-2 text-start enabled:hover:bg-surface-alt/50"
          >
            <r.icon className="size-[18px] text-ink-3" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink">{r.label}</span>
              {r.caption && <span className="block text-[11px] text-ink-3">{r.caption}</span>}
            </span>
            <span className="font-extrabold text-ink tabular-nums">{compactNumber(r.value)}</span>
          </button>
        ))}
      </div>
    </SoftCard>
  );
}

/** Phones have no sidebar: every admin page as a tile. */
function Shortcuts() {
  const navigate = useNavigate();
  const links = ADMIN_GROUPS.flatMap((g) => g.links).filter((l) => l.to !== '/admin');
  return (
    <section className="lg:hidden">
      <h3 className="mb-2 font-extrabold text-ink">{t('كل الصفحات')}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {links.map((l) => (
          <button
            key={l.to}
            type="button"
            onClick={() => navigate(l.to)}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-1 py-3 text-center hover:bg-surface-alt"
          >
            <l.icon className="size-[22px] text-brand-ink" />
            <span className="max-w-full truncate text-[12px] font-bold text-ink">{tIn('nav', l.label)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** One stacked bar plus a legend that doubles as the data table (label · count · share). */
function StoreCategoryBreakdown({ dashboard }: { dashboard: AdminDashboard }) {
  const [focused, setFocused] = useState<number | null>(null);
  const rows = dashboard.storesByCategory.map((c) => ({ ...c, look: categoryLook(c.icon) }));
  const total = rows.reduce((n, c) => n + c.count, 0);
  if (total === 0) return <p className="py-3 text-ink-3">{t('لسه مفيش محلات')}</p>;
  const opacity = (id: number) => (focused === null || focused === id ? 1 : 0.3);
  const toggle = (id: number) => setFocused((f) => (f === id ? null : id));

  return (
    <div className="mt-3">
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded">
        {rows
          .filter((c) => c.count > 0)
          .map((c) => (
            <button
              key={c.categoryId}
              type="button"
              title={`${c.name}: ${c.count}`}
              onClick={() => toggle(c.categoryId)}
              style={{ flex: c.count, background: c.look.color, opacity: opacity(c.categoryId) }}
              className="transition-opacity"
            />
          ))}
      </div>
      <div className="mt-3 flex flex-col">
        {rows.map((c) => (
          <button
            key={c.categoryId}
            type="button"
            disabled={c.count === 0}
            onClick={() => toggle(c.categoryId)}
            className="flex items-center gap-2.5 rounded-lg px-0.5 py-1.5 transition-opacity"
            style={{ opacity: opacity(c.categoryId) }}
          >
            <span className="size-2.5 rounded-[3px]" style={{ background: c.look.color }} />
            <c.look.Icon className="size-[18px] text-ink-2" />
            <span className="flex-1 text-start text-ink">{c.name}</span>
            <span className="font-bold text-ink tabular-nums">{c.count}</span>
            <span className="w-12 text-end text-ink-3 tabular-nums">{Math.round((c.count * 100) / total)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Store status as meters: status color fill on a lighter track of the same color. */
function StoreStatusMeters({ dashboard, onSelect }: { dashboard: AdminDashboard; onSelect: (s: StoreStatus) => void }) {
  const order: StoreStatus[] = ['Active', 'PendingApproval', 'Suspended'];
  const count = (s: StoreStatus) => (s === 'Active' ? dashboard.activeStores : s === 'PendingApproval' ? dashboard.pendingStores : dashboard.suspendedStores);
  const total = dashboard.totalStores;
  return (
    <div className="mt-2 flex flex-col">
      {order.map((s) => {
        const meta = storeStatus(s);
        return (
          <button key={s} type="button" onClick={() => onSelect(s)} className="rounded-lg px-0.5 py-2 text-start hover:bg-surface-alt/50">
            <div className="flex items-center gap-2">
              <meta.Icon className="size-[18px]" style={{ color: meta.color }} />
              <span className="flex-1 text-ink">{meta.label}</span>
              <span className="font-bold text-ink">{count(s)}</span>
              <ChevronLeft className="size-[18px] text-ink-3" />
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded" style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}>
              <div className="h-full rounded" style={{ width: `${total === 0 ? 0 : (count(s) / total) * 100}%`, background: meta.color }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
