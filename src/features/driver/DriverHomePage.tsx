import clsx from 'clsx';
import { Bike, History, Inbox, LogOut, MapPin, PauseCircle, Store } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useDriverOrders, useDriverProfile } from '@/api/queries';
import { EmptyView, ErrorView, IconWell, Loading, Price, SoftCard, StatusChip } from '@/components/ui';
import { OrderStatusBadge } from '@/features/orders/OrderWidgets';
import { formatOrderDate } from '@/lib/format';
import { orderStatus } from '@/lib/meta';
import { useAuth } from '@/store/auth';
import type { Order } from '@/types';

/** Driver home: the orders the admin gave them, to pick up and deliver. */
export function DriverHomePage() {
  const [history, setHistory] = useState(false);
  const profile = useDriverProfile();
  const orders = useDriverOrders(history);
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
            <p className="text-[13px] text-white/85">تطبيق المندوب</p>
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
        {p && (
          <>
            <div className="relative mt-4 grid grid-cols-2 gap-2.5">
              <HeaderStat value={p.activeOrders} label="معايا دلوقتي" />
              <HeaderStat value={p.deliveredOrders} label="وصّلتهم" />
            </div>
            {!p.isActive && (
              <p className="relative mt-3 flex items-center gap-2 rounded-[14px] bg-black/25 px-3 py-2 text-[13px] text-white">
                <PauseCircle className="size-[18px]" />
                حسابك متوقف، مش هتاخد أوردرات جديدة.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1">
          {[
            { v: false, label: 'أوردراتي دلوقتي', Icon: Bike },
            { v: true, label: 'السابقة', Icon: History },
          ].map((t) => (
            <button
              key={String(t.v)}
              type="button"
              onClick={() => setHistory(t.v)}
              className={clsx('inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors', history === t.v ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink')}
            >
              <t.Icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {orders.isLoading ? (
          <Loading />
        ) : orders.isError ? (
          <ErrorView message={(orders.error as Error).message} onRetry={() => orders.refetch()} />
        ) : orders.data!.length === 0 ? (
          <EmptyView icon={history ? History : Inbox} message={history ? 'لسه موصّلتش أوردرات.' : 'مفيش أوردرات معاك دلوقتي.\nأول ما الإدارة تديك أوردر هيظهر هنا.'} />
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orders.data!.map((o) => (
              <DeliveryCard key={o.id} order={o} onClick={() => navigate(`/driver/orders/${o.id}`)} />
            ))}
          </div>
        )}
      </div>
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
  const [label, color] =
    o.status === 'Confirmed' ? ['روح استلم', 'var(--color-warning)'] : o.status === 'OutForDelivery' ? ['في الطريق للزبون', 'var(--color-series-1)'] : [meta.label, meta.color];

  return (
    <SoftCard as="button" onClick={onClick} className="p-3.5">
      <div className="flex items-center gap-3">
        <IconWell icon={meta.Icon} size={42} color={color} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">أوردر #{o.number}</p>
          <p className="text-xs text-ink-3">{formatOrderDate(o.createdUtc)}</p>
        </div>
        {o.status === 'Confirmed' || o.status === 'OutForDelivery' ? <StatusChip label={label} color={color} /> : <OrderStatusBadge status={o.status} />}
      </div>
      <p className="mt-3 flex items-center gap-2 text-ink-2 truncate">
        <Store className="size-4 shrink-0 text-accent" />
        {o.stores.map((s) => s.storeName).join(' • ')}
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
