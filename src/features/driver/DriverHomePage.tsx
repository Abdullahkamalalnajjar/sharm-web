import clsx from 'clsx';
import { Bike, Check, Hourglass, History, Inbox, LogOut, MapPin, Megaphone, PauseCircle, Store, ToggleLeft, Wallet, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { driversApi } from '@/api';
import { keys, useDriverOffers, useDriverOrders, useDriverProfile, useRefreshDriver } from '@/api/queries';
import { Button, EmptyView, ErrorView, IconWell, Loading, Price, SoftCard, StatusChip, Switch } from '@/components/ui';
import { OrderStatusBadge, ScheduledChip } from '@/features/orders/OrderWidgets';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { orderStatus, vehicleLabel } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';
import type { Driver, DriverOffer, Order } from '@/types';

type Tab = 'offers' | 'now' | 'history';

const TABS: { value: Tab; label: string; Icon: LucideIcon }[] = [
  { value: 'offers', label: 'متاحة', Icon: Megaphone },
  { value: 'now', label: 'معايا', Icon: Bike },
  { value: 'history', label: 'السابقة', Icon: History },
];

/**
 * Driver home: orders waiting for a driver (accept or reject), the driver's own orders to pick up
 * and deliver, and their history.
 */
export function DriverHomePage() {
  const [tab, setTab] = useState<Tab>('offers');
  const profile = useDriverProfile();
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const p = profile.data;

  return (
    <div className="pb-8">
      <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-brand-light via-brand to-brand-dark px-5 pt-[max(env(safe-area-inset-top),12px)] pb-6 md:mx-4 md:mt-4 md:rounded-card md:px-8 md:pt-7">
        <span className="absolute -end-10 -top-8 size-48 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-white">{p ? `أهلاً يا ${p.fullName} 👋` : 'أهلاً 👋'}</h1>
            <p className="text-[13px] text-white/85">
              تطبيق المندوب{p && vehicleLabel(p.vehicleType) ? ` • ${vehicleLabel(p.vehicleType)}` : ''}
            </p>
          </div>
          <button
            type="button"
            title="حسابي"
            onClick={() => navigate('/driver/wallet')}
            className="grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <Wallet className="size-5" />
          </button>
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
        {p && (
          <>
            <div className="relative mt-4 grid grid-cols-2 gap-2.5">
              <HeaderStat value={p.activeOrders} label="معايا دلوقتي" />
              <HeaderStat value={p.deliveredOrders} label="وصّلتهم" />
            </div>
            <div className="relative mt-3">
              <AvailabilityRow driver={p} />
            </div>
          </>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={clsx('inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors', tab === t.value ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink')}
            >
              <t.Icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'offers' ? (
          <OffersList driver={p} onTaken={(id) => navigate(`/driver/orders/${id}`)} />
        ) : (
          <OrdersList history={tab === 'history'} onOpen={(id) => navigate(`/driver/orders/${id}`)} />
        )}
      </div>
    </div>
  );
}

/** The "available for new orders" switch, or why the driver gets no orders. */
function AvailabilityRow({ driver: p }: { driver: Driver }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!p.isApproved || !p.isActive) {
    const [Icon, text] = !p.isApproved
      ? [Hourglass, 'حسابك تحت المراجعة من الإدارة.']
      : [PauseCircle, 'حسابك متوقف، مش هتاخد أوردرات جديدة.'];
    return (
      <p className="flex items-center gap-2 rounded-[14px] bg-black/25 px-3 py-2 text-[13px] text-white">
        <Icon className="size-[18px]" />
        {text}
      </p>
    );
  }

  async function toggle(value: boolean) {
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.driverProfile, await driversApi.setAvailable(value));
    });
    setBusy(false);
    if (ok) qc.invalidateQueries({ queryKey: keys.driverOffers });
  }

  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-black/20 px-3.5 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">{p.isAvailable ? 'متاح لأوردرات جديدة' : 'مش متاح'}</span>
        <span className="block text-xs text-white/80">{p.isAvailable ? 'هتوصلك الأوردرات المتاحة' : 'مش هتوصلك أوردرات جديدة'}</span>
      </span>
      <Switch checked={p.isAvailable} disabled={busy} onChange={toggle} label="متاح" />
    </div>
  );
}

function OffersList({ driver: p, onTaken }: { driver: Driver | undefined; onTaken: (orderId: number) => void }) {
  const canTake = Boolean(p && p.isActive && p.isAvailable);
  const offers = useDriverOffers(canTake);

  // Why there are no offers, when it is not just an empty list.
  const blocked: [LucideIcon, string] | null = !p
    ? null
    : !p.isApproved
      ? [Hourglass, 'حسابك تحت المراجعة.\nأول ما الإدارة تفعّله هتبدأ توصلك الأوردرات.']
      : !p.isActive
        ? [PauseCircle, 'حسابك متوقف، كلّم الإدارة.']
        : !p.isAvailable
          ? [ToggleLeft, 'إنت مش متاح.\nشغّل "متاح" فوق عشان توصلك الأوردرات.']
          : null;

  if (!p) return <Loading />;
  if (blocked) return <EmptyView icon={blocked[0]} message={blocked[1]} />;
  if (offers.isLoading) return <Loading />;
  if (offers.isError) return <ErrorView message={(offers.error as Error).message} onRetry={() => offers.refetch()} />;
  if (!offers.data?.length) return <EmptyView icon={Inbox} message={'مفيش أوردرات متاحة دلوقتي.\nهيوصلك إشعار أول ما يبقى في أوردر.'} />;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {offers.data.map((o) => (
        <OfferCard key={o.orderId} offer={o} onTaken={onTaken} />
      ))}
    </div>
  );
}

/** An order waiting for a driver: where from, roughly where to, the fee and the cash to collect. */
function OfferCard({ offer: o, onTaken }: { offer: DriverOffer; onTaken: (orderId: number) => void }) {
  const qc = useQueryClient();
  const refreshDriver = useRefreshDriver();
  const [busy, setBusy] = useState(false);
  const meta = orderStatus(o.status);
  const [label, color] = o.isReady ? ['جاهز للاستلام', 'var(--color-success)'] : [meta.label, meta.color];
  const pickup = o.isCustomOrder ? 'طلب خاص — اشتري المطلوب' : (o.storeName ?? '');

  async function respond(accept: boolean) {
    if (!accept && !(await confirm(`مش عايز أوردر #${o.number}؟ مش هيظهرلك تاني.`, 'ارفض'))) return;
    setBusy(true);
    const ok = await runAction(
      () => (accept ? driversApi.accept(o.orderId) : driversApi.reject(o.orderId)),
      accept ? 'الأوردر بقى معاك 🛵' : undefined,
    );
    setBusy(false);
    // Taken or not (another driver may have been faster), the list changed.
    qc.invalidateQueries({ queryKey: keys.driverOffers });
    if (ok && accept) {
      refreshDriver();
      onTaken(o.orderId);
    }
  }

  return (
    <SoftCard className="p-3.5">
      <div className="flex items-center gap-3">
        <IconWell icon={Megaphone} size={42} color="var(--color-accent)" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">أوردر #{o.number}</p>
          <p className="text-xs text-ink-3">{formatOrderDate(o.createdUtc)}</p>
        </div>
        <StatusChip label={label} color={color} />
      </div>
      {o.scheduledForUtc && (
        <div className="mt-2">
          <ScheduledChip value={o.scheduledForUtc} />
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-ink-2 truncate">
        <Store className="size-4 shrink-0 text-accent" />
        {o.storeAddress ? `${pickup} — ${o.storeAddress}` : pickup}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-ink-2 truncate">
        <MapPin className="size-4 shrink-0 text-brand-ink" />
        {o.dropOffArea}
        {o.deliveryDistanceKm != null && ` • ${o.deliveryDistanceKm.toFixed(1)} كم`}
      </p>
      <div className="my-2.5 border-t border-line" />
      <div className="flex items-center">
        <span className="text-ink-2 me-1">توصيل</span>
        <span className="font-bold text-ink">{formatPrice(o.deliveryFee ?? 0)}</span>
        <span className="flex-1" />
        <span className="text-ink-2 me-1">حصّل</span>
        <Price value={o.total} className="text-[17px]" />
      </div>
      <div className="mt-3 flex gap-2.5">
        <Button variant="outline" className="border-danger/50 text-danger hover:bg-danger/10" disabled={busy} onClick={() => respond(false)}>
          ارفض
        </Button>
        <Button className="flex-1" loading={busy} icon={<Check className="size-5" />} onClick={() => respond(true)}>
          اقبل الأوردر
        </Button>
      </div>
    </SoftCard>
  );
}

function OrdersList({ history, onOpen }: { history: boolean; onOpen: (orderId: number) => void }) {
  const orders = useDriverOrders(history);
  if (orders.isLoading) return <Loading />;
  if (orders.isError) return <ErrorView message={(orders.error as Error).message} onRetry={() => orders.refetch()} />;
  if (orders.data!.length === 0) {
    return (
      <EmptyView
        icon={history ? History : Inbox}
        message={history ? 'لسه موصّلتش أوردرات.' : 'مفيش أوردرات معاك دلوقتي.\nاقبل أوردر من "متاحة" أو استنى الإدارة تديك واحد.'}
      />
    );
  }
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {orders.data!.map((o) => (
        <DeliveryCard key={o.id} order={o} onClick={() => onOpen(o.id)} />
      ))}
    </div>
  );
}

function HeaderStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[18px] bg-black/20 px-3.5 py-2.5">
      <span className="text-[26px] font-extrabold text-highlight leading-none">{value}</span>
      <span className="font-semibold text-white">{label}</span>
    </div>
  );
}

/** One order in the driver's list: where to pick up, where to go, how much to collect. */
function DeliveryCard({ order: o, onClick }: { order: Order; onClick: () => void }) {
  const meta = orderStatus(o.status);
  const custom: [string, string] | null =
    o.status === 'Confirmed' || o.status === 'Processing'
      ? ['روح استلم', 'var(--color-warning)']
      : o.status === 'ReadyForPickup'
        ? ['جاهز، روح استلم', 'var(--color-success)']
        : o.status === 'OutForDelivery'
          ? ['في الطريق للزبون', 'var(--color-series-1)']
          : null;
  const color = custom?.[1] ?? meta.color;

  return (
    <SoftCard as="button" onClick={onClick} className="p-3.5">
      <div className="flex items-center gap-3">
        <IconWell icon={meta.Icon} size={42} color={color} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">أوردر #{o.number}</p>
          <p className="text-xs text-ink-3">{formatOrderDate(o.createdUtc)}</p>
        </div>
        {custom ? <StatusChip label={custom[0]} color={custom[1]} /> : <OrderStatusBadge status={o.status} />}
      </div>
      {o.scheduledForUtc && meta.isActive && (
        <div className="mt-2">
          <ScheduledChip value={o.scheduledForUtc} />
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-ink-2 truncate">
        <Store className="size-4 shrink-0 text-accent" />
        {o.isCustomOrder ? 'طلب خاص — اشتري المطلوب' : o.stores.map((s) => s.storeName).join(' • ')}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-ink-2 truncate">
        <MapPin className="size-4 shrink-0 text-brand-ink" />
        {o.address.label} — {o.address.addressLine}
      </p>
      <div className="my-2.5 border-t border-line" />
      <div className="flex items-center">
        <span className="text-ink-2">{o.itemsCount} منتج</span>
        <span className="flex-1" />
        <span className="text-ink-2 me-1">حصّل</span>
        <Price value={o.total} className="text-[17px]" />
      </div>
    </SoftCard>
  );
}
