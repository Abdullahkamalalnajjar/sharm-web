import { CheckCircle2, ChevronLeft, Hourglass, LayoutGrid, LogOut, Package, ReceiptText, Store, PlusSquare, Users, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useAdminDashboard } from '@/api/queries';
import { Button, ErrorView, IconWell, Loading, SectionHeader, SoftCard } from '@/components/ui';
import { compactNumber, formatFullDate } from '@/lib/format';
import { STORE_STATUSES, STORE_TYPES, storeStatus, storeType } from '@/lib/meta';
import { useAuth } from '@/store/auth';
import type { AdminDashboard, StoreStatus, StoreType } from '@/types';

import { AdminStoreCard } from './AdminStoreCard';

export function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const d = dashboard.data;

  const openStores = (status?: StoreStatus) => navigate(status ? `/admin/stores?status=${status}` : '/admin/stores');

  return (
    <div className="pb-8">
      {/* Red gradient header */}
      <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-brand-light via-brand to-brand-dark px-5 pt-[max(env(safe-area-inset-top),12px)] pb-6 md:mx-4 md:mt-4 md:rounded-card md:px-8 md:pt-7">
        <span className="absolute -end-10 -top-8 size-48 rounded-full bg-white/10" />
        <span className="absolute end-14 -bottom-12 size-32 rounded-full bg-black/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-white">أهلاً يا أدمن 👋</h1>
            <p className="text-[13px] text-white/85">{formatFullDate(new Date())}</p>
          </div>
          <button
            type="button"
            title="تسجيل الخروج"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 md:hidden"
          >
            <LogOut className="size-5" />
          </button>
        </div>
        <p className="relative mt-5 text-sm text-white/85">المحلات على المنصة</p>
        <p className="relative text-[52px] font-extrabold leading-tight text-accent">{d ? compactNumber(d.totalStores) : '—'}</p>
        {d && (
          <div className="relative mt-1 flex flex-wrap gap-2">
            <HeaderPill icon={Store} text={`${d.openStores} مفتوح دلوقتي`} />
            <HeaderPill icon={CheckCircle2} text={`${d.activeStores} مفعّل`} />
            <HeaderPill icon={ReceiptText} text={`${d.ordersInProgress} أوردر شغال`} />
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {dashboard.isLoading ? (
          <Loading />
        ) : dashboard.isError || !d ? (
          <ErrorView message={(dashboard.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => dashboard.refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              {d.pendingOrders > 0 && (
                <AttentionBanner
                  icon={ReceiptText}
                  title={d.pendingOrders === 1 ? 'أوردر واحد جديد مستني المراجعة' : `${d.pendingOrders} أوردرات جديدة مستنية المراجعة`}
                  subtitle="راجع الأوردر وحدد سعر التوصيل"
                  onClick={() => navigate('/admin/orders')}
                />
              )}
              {d.pendingStores > 0 && (
                <AttentionBanner
                  icon={Hourglass}
                  title={d.pendingStores === 1 ? 'محل واحد مستني موافقتك' : `${d.pendingStores} محلات مستنية موافقتك`}
                  subtitle="راجع البيانات ووافق عشان يظهروا للزباين"
                  onClick={() => openStores('PendingApproval')}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <StatTile icon={Users} label="الزباين" value={d.customers} />
                <StatTile icon={Store} label="أصحاب المحلات" value={d.storeOwners} onClick={() => openStores()} />
                <StatTile icon={Package} label="المنتجات" value={d.totalProducts} caption={d.unavailableProducts > 0 ? `${d.unavailableProducts} خلصان` : 'كله متاح'} />
                <StatTile icon={LayoutGrid} label="الأقسام" value={d.totalCategories} />
                <StatTile icon={ReceiptText} label="أوردرات اتوصّلت" value={d.deliveredOrders} onClick={() => navigate('/admin/orders')} />
                <StatTile icon={Hourglass} label="أوردرات شغالة" value={d.ordersInProgress} onClick={() => navigate('/admin/orders')} />
              </div>
              <div className="flex gap-3">
                <Button block icon={<PlusSquare className="size-5" />} onClick={() => navigate('/admin/stores/new')}>
                  محل جديد
                </Button>
                <Button block variant="outline" icon={<Store className="size-5" />} onClick={() => openStores()}>
                  كل المحلات
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <SoftCard className="p-4">
                <div className="flex items-center">
                  <h3 className="flex-1 font-extrabold text-ink">المحلات حسب النوع</h3>
                  <span className="text-ink-3">{d.totalStores} محل</span>
                </div>
                <StoreTypeBreakdown dashboard={d} />
              </SoftCard>
              <SoftCard className="p-4">
                <h3 className="font-extrabold text-ink">حالة المحلات</h3>
                <StoreStatusMeters dashboard={d} onSelect={openStores} />
              </SoftCard>
            </div>

            {d.pendingApprovals.length > 0 && (
              <div className="lg:col-span-2">
                <SectionHeader title="مستنية موافقتك" action="عرض الكل" onAction={() => openStores('PendingApproval')} />
                <div className="grid gap-3 md:grid-cols-2">
                  {d.pendingApprovals.map((s) => (
                    <AdminStoreCard key={s.id} store={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[13px] font-semibold text-white">
      <Icon className="size-4" />
      {text}
    </span>
  );
}

function AttentionBanner({ icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-card bg-accent/15 p-3.5 text-start hover:bg-accent/20">
      <IconWell icon={icon} size={40} color="var(--color-accent)" />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-ink">{title}</span>
        <span className="block text-xs text-ink-2">{subtitle}</span>
      </span>
      <ChevronLeft className="size-5 text-accent" />
    </button>
  );
}

function StatTile({ icon, label, value, caption, onClick }: { icon: LucideIcon; label: string; value: number; caption?: string; onClick?: () => void }) {
  return (
    <SoftCard as={onClick ? 'button' : 'div'} onClick={onClick} className="p-3.5">
      <IconWell icon={icon} size={38} />
      <p className="mt-3 text-[26px] font-extrabold leading-tight text-ink">{compactNumber(value)}</p>
      <p className="text-[13px] text-ink-2">{label}</p>
      {caption && <p className="text-[11px] text-ink-3">{caption}</p>}
    </SoftCard>
  );
}

/** One stacked bar plus a legend that doubles as the data table (label · count · share). */
function StoreTypeBreakdown({ dashboard }: { dashboard: AdminDashboard }) {
  const [focused, setFocused] = useState<StoreType | null>(null);
  const total = dashboard.storesByType.reduce((n, c) => n + c.count, 0);
  if (total === 0) return <p className="py-3 text-ink-3">لسه مفيش محلات</p>;
  const visible = dashboard.storesByType.filter((c) => c.count > 0);
  const opacity = (t: StoreType) => (focused === null || focused === t ? 1 : 0.3);
  const rows = STORE_TYPES.map((t) => ({ meta: t, count: dashboard.storesByType.find((c) => c.type === t.value)?.count ?? 0 }));

  return (
    <div className="mt-3">
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded">
        {visible.map((c) => (
          <button
            key={c.type}
            type="button"
            title={`${storeType(c.type).label}: ${c.count}`}
            onClick={() => setFocused((f) => (f === c.type ? null : c.type))}
            style={{ flex: c.count, background: storeType(c.type).color, opacity: opacity(c.type) }}
            className="transition-opacity"
          />
        ))}
      </div>
      <div className="mt-3 flex flex-col">
        {rows.map(({ meta, count }) => (
          <button
            key={meta.value}
            type="button"
            disabled={count === 0}
            onClick={() => setFocused((f) => (f === meta.value ? null : meta.value))}
            className="flex items-center gap-2.5 rounded-lg px-0.5 py-1.5 transition-opacity"
            style={{ opacity: opacity(meta.value) }}
          >
            <span className="size-2.5 rounded-[3px]" style={{ background: meta.color }} />
            <meta.Icon className="size-[18px] text-ink-2" />
            <span className="flex-1 text-start text-ink">{meta.label}</span>
            <span className="font-bold text-ink tabular-nums">{count}</span>
            <span className="w-12 text-end text-ink-3 tabular-nums">{Math.round((count * 100) / total)}%</span>
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

export const adminStoreStatuses = STORE_STATUSES;
