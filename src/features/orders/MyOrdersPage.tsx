import { ReceiptText, Store } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useMyOrders } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, SectionHeader } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { orderStatus } from '@/lib/meta';
import { useAuth } from '@/store/auth';

import { OrderSummaryCard } from './OrderWidgets';

/** The customer's orders: running ones first, then past ones. */
export function MyOrdersPage() {
  const session = useAuth((s) => s.session);
  const orders = useMyOrders();
  const navigate = useNavigate();

  if (!session) return <LoginRequired title="طلباتي" icon={ReceiptText} message="سجّل دخول عشان تطلب وتتابع طلباتك." />;

  const list = orders.data ?? [];
  const active = list.filter((o) => orderStatus(o.status).isActive);
  const past = list.filter((o) => !orderStatus(o.status).isActive);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <TabHeader title="طلباتي" />
      {orders.isLoading ? (
        <Loading />
      ) : orders.isError ? (
        <ErrorView message={(orders.error as Error).message} onRetry={() => orders.refetch()} />
      ) : list.length === 0 ? (
        <EmptyView
          icon={ReceiptText}
          message={'لسه ماطلبتش حاجة.\nأول طلب هيظهر هنا.'}
          action={
            <Button size="md" icon={<Store className="size-4" />} onClick={() => navigate('/')}>
              اطلب دلوقتي
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <>
              <SectionHeader title="شغالة دلوقتي" pill={`${active.length}`} className="pt-2" />
              <div className="flex flex-col gap-2.5">
                {active.map((o) => (
                  <OrderSummaryCard key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
                ))}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <SectionHeader title="طلبات سابقة" />
              <div className="flex flex-col gap-2.5">
                {past.map((o) => (
                  <OrderSummaryCard key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
