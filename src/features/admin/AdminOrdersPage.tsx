import clsx from 'clsx';
import { ReceiptText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAdminOrders } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { OrderSummaryCard } from '@/features/orders/OrderWidgets';
import { orderStatus } from '@/lib/meta';
import type { OrderStatus } from '@/types';

const FILTERS: [string, OrderStatus | 'all'][] = [
  ['جديدة', 'Pending'],
  ['متأكدة', 'Confirmed'],
  ['في الطريق', 'OutForDelivery'],
  ['اتوصلت', 'Delivered'],
  ['ملغية', 'Cancelled'],
  ['الكل', 'all'],
];

/** Every order in the app. The admin works through them from here. Defaults to new orders. */
export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? 'Pending';
  const filter: OrderStatus | null = raw === 'all' ? null : (raw as OrderStatus);
  const orders = useAdminOrders(filter);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <TabHeader title="الأوردرات" />
      <div className="sticky top-0 md:top-16 z-20 bg-bg -mx-0 px-4 pb-2.5">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {FILTERS.map(([label, value]) => {
            const selected = raw === value;
            const meta = value === 'all' ? null : orderStatus(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  params.set('status', value);
                  setParams(params, { replace: true });
                }}
                className={clsx(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors',
                  selected ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-surface-alt',
                )}
              >
                {meta && <meta.Icon className="size-4" style={{ color: selected ? '#fff' : meta.color }} />}
                {label}
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
        ) : orders.data!.length === 0 ? (
          <EmptyView icon={ReceiptText} message={filter === 'Pending' ? 'مفيش أوردرات جديدة دلوقتي 👌' : 'مفيش أوردرات هنا'} />
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {orders.data!.map((o) => (
              <OrderSummaryCard key={o.id} order={o} showCustomer onClick={() => navigate(`/admin/orders/${o.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
