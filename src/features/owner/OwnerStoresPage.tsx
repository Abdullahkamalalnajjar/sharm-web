import { BellRing, BookOpen, CalendarDays, ChevronLeft, CircleCheck, Clock, Pencil, Percent, Receipt, Store, Wallet, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { storesApi } from '@/api';
import { keys, useMyStores, useStoreOrders } from '@/api/queries';
import { EmptyView, ErrorView, IconWell, Loading, Price, SectionHeader, SoftCard, StatusChip, Switch } from '@/components/ui';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { formatPrice, formatStoreHours } from '@/lib/format';
import { storeStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import type { Store as StoreModel } from '@/types';

import { useStoreSalesSummary } from './owner-queries';
import { StoreHoursDialog } from './StoreHoursDialog';

/** The store owner's dashboard: orders waiting now, today's money, and the stores with their open switch. */
export function OwnerStoresPage() {
  const stores = useMyStores();
  const newCount = useStoreOrders('New').data?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <Header stores={stores.data ?? []} />
      <div className="px-4">
        {newCount > 0 && <NewOrdersAlert count={newCount} />}
        <TodayCard />
        <SectionHeader title="محلاتي" pill={stores.data?.length ? String(stores.data.length) : undefined} />
        {stores.isLoading ? (
          <Loading />
        ) : stores.isError ? (
          <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
        ) : stores.data!.length === 0 ? (
          <EmptyView icon={Store} message={'لسه مفيش محل على حسابك.\nالإدارة هي اللي بتضيف المحلات، كلّمهم.'} />
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2">
            {stores.data!.map((s) => (
              <OwnerStoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Brand header like the driver's: greeting, and the orders waiting now in big numbers. */
function Header({ stores }: { stores: StoreModel[] }) {
  const navigate = useNavigate();
  const newCount = useStoreOrders('New').data?.length ?? 0;
  const activeCount = useStoreOrders('Active').data?.length ?? 0;
  const openCount = stores.filter((s) => s.isOpen).length;

  return (
    <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-brand-light via-brand to-brand-dark px-5 pt-[max(env(safe-area-inset-top),12px)] pb-6 md:mx-4 md:mt-4 md:rounded-card md:px-8 md:pt-7">
      <span className="absolute -end-10 -top-8 size-48 rounded-full bg-white/10" />
      <div className="relative">
        {/* The site has no profile name, so a plain greeting. */}
        <h1 className="text-xl font-extrabold text-white">أهلاً 👋</h1>
        <p className="text-[13px] text-white/85">{stores.length === 0 ? 'لوحة المحل' : `لوحة المحل • ${openCount} من ${stores.length} مفتوح`}</p>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <HeaderStat value={newCount} label="طلبات جديدة" onClick={() => navigate('/owner/orders')} />
        <HeaderStat value={activeCount} label="بتتجهز" onClick={() => navigate('/owner/orders')} />
      </div>
    </div>
  );
}

function HeaderStat({ value, label, onClick }: { value: number; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-[18px] bg-black/20 px-3.5 py-2.5 text-start transition-colors hover:bg-black/30">
      <span className="text-[26px] font-extrabold leading-none text-highlight">{value}</span>
      <span className="font-semibold text-white">{label}</span>
    </button>
  );
}

/** New orders waiting for an answer: hard to miss, one click to the orders. */
function NewOrdersAlert({ count }: { count: number }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/owner/orders')}
      className="mt-4 flex w-full items-center gap-3 rounded-card border p-3.5 text-start"
      style={{
        background: 'color-mix(in srgb, var(--color-warning) 16%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-warning) 60%, transparent)',
      }}
    >
      <IconWell icon={BellRing} size={44} color="var(--color-warning)" />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-ink">{count === 1 ? 'عندك طلب جديد' : `عندك ${count} طلبات جديدة`}</span>
        <span className="block text-[13px] text-ink-2">مستني تقبله أو ترفضه</span>
      </span>
      <ChevronLeft className="size-5 text-ink-2" />
    </button>
  );
}

/** 12500 → "12.5k", so four tiles fit across. */
const short = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v.toFixed(v % 1 === 0 ? 0 : 1));

/** Today's money in big numbers, then the totals as tiles. */
function TodayCard() {
  const summary = useStoreSalesSummary().data;
  if (!summary) return null;

  return (
    <div className="mt-4">
      <SoftCard className="p-4">
        <div className="flex items-center gap-2.5">
          <IconWell icon={CalendarDays} size={40} />
          <span className="flex-1 font-extrabold text-ink">صافي النهارده</span>
          <StatusChip label={`${summary.todayOrders} طلب`} color="var(--color-brand)" />
        </div>
        <Price value={summary.todayNet} className="mt-2.5 block text-[30px]" />
        <p className="text-[12.5px] text-ink-2">مبيعات النهارده {formatPrice(summary.todaySales)}</p>
      </SoftCard>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatTile icon={CircleCheck} color="var(--color-success)" label="اتسلّمت" value={String(summary.deliveredOrders)} />
        <StatTile icon={Receipt} color="var(--color-series-3)" label="المبيعات" value={short(summary.sales)} />
        <StatTile icon={Percent} color="var(--color-warning)" label="العمولة" value={short(summary.commission)} />
        <StatTile icon={Wallet} color="var(--color-brand)" label="الصافي" value={short(summary.net)} />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, color, label, value }: { icon: LucideIcon; color: string; label: string; value: string }) {
  return (
    <SoftCard className="flex flex-col items-center px-2 py-3">
      <Icon className="size-5" style={{ color }} />
      <span className="mt-1.5 max-w-full truncate text-[17px] font-extrabold text-ink">{value}</span>
      <span className="max-w-full truncate text-[11.5px] text-ink-3">{label}</span>
    </SoftCard>
  );
}

/** One store: status, a big open/closed switch colored by the real state, and its tools as large buttons. */
export function OwnerStoreCard({ store }: { store: StoreModel }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isActive = store.status === 'Active';

  const [label, hint, color] = ((): [string, string, string] => {
    if (!isActive) {
      const status = storeStatus(store.status);
      return [
        status.label,
        store.status === 'PendingApproval' ? 'مستني موافقة الأدمن قبل ما تقدر تفتحه' : 'المحل موقوف من الإدارة',
        status.color,
      ];
    }
    if (store.isOpen) return ['مفتوح للطلبات', 'الزباين شايفينه ويقدروا يطلبوا', 'var(--color-success)'];
    if (store.openSwitch)
      return ['مقفول دلوقتي', `برا المواعيد • ${formatStoreHours(store.opensAt, store.closesAt) ?? ''}`, 'var(--color-warning)'];
    return ['مقفول', 'شغّل الزرار عشان تستقبل طلبات', 'var(--color-ink-3)'];
  })();

  async function toggleOpen(open: boolean) {
    setBusy(true);
    const ok = await runAction(() => storesApi.setOpen(store.id, open), open ? 'المحل اتفتح' : 'المحل اتقفل');
    setBusy(false);
    if (ok) qc.invalidateQueries({ queryKey: keys.myStores });
  }

  const go = (path: string) => navigate(`/owner/stores/${store.id}/${path}`);

  return (
    <SoftCard className="p-3.5">
      <div className="flex items-center gap-3">
        <StoreAvatar category={store} logoUrl={store.logoUrl} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold text-ink">{store.name}</p>
          <p className="text-[13px] text-ink-2">{store.categoryName}</p>
        </div>
      </div>
      <div
        className="mt-3 flex items-center gap-3 rounded-[18px] border px-3.5 py-3"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        }}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold" style={{ color }}>
            {label}
          </span>
          <span className="block text-xs text-ink-2">{hint}</span>
        </span>
        <Switch checked={store.openSwitch} disabled={!isActive || busy} onChange={toggleOpen} label="مفتوح للطلبات" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <ActionTile icon={BookOpen} label="المنيو" onClick={() => go('menu')} />
        <ActionTile icon={Wallet} label="المحفظة" onClick={() => go('wallet')} />
        <ActionTile icon={Clock} label="المواعيد" onClick={() => setHoursOpen(true)} />
        <ActionTile icon={Pencil} label="تعديل" onClick={() => go('edit')} />
      </div>
      <StoreHoursDialog store={store} open={hoursOpen} onClose={() => setHoursOpen(false)} />
    </SoftCard>
  );
}

function ActionTile({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-alt px-0.5 py-3 transition-colors hover:bg-surface-high">
      <Icon className="size-[22px] text-brand-ink" />
      <span className="max-w-full truncate text-[11.5px] font-bold text-ink">{label}</span>
    </button>
  );
}
