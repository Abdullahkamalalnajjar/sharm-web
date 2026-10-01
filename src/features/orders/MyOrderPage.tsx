import { PartyPopper, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router';

import { ordersApi } from '@/api';
import { keys, useMyOrder } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, Loading, SoftCard } from '@/components/ui';
import { orderStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';

import { OrderAddressCard, OrderDriverCard, OrderItemsCard, OrderStatusBadge, OrderTimeline, OrderTotalsCard, canAssignDriver } from './OrderWidgets';

/** Customer view of one order: status, items, totals, address; cancel while pending. */
export function MyOrderPage() {
  const id = Number(useParams().id);
  const order = useMyOrder(id);
  const qc = useQueryClient();
  const justPlaced = Boolean((useLocation().state as { justPlaced?: boolean } | null)?.justPlaced);

  async function cancel() {
    const o = order.data!;
    if (!(await confirm(`تلغي الأوردر #${o.number}؟`, 'إلغاء الأوردر'))) return;
    if (await runAction(() => ordersApi.cancelMine(o.id), 'الأوردر اتلغى')) {
      qc.invalidateQueries({ queryKey: keys.myOrder(id) });
      qc.invalidateQueries({ queryKey: keys.myOrders });
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={order.data ? `أوردر #${order.data.number}` : 'الأوردر'} />
      <div className="px-4 flex flex-col gap-3">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !order.data ? (
          <ErrorView message={(order.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => order.refetch()} />
        ) : (
          <>
            {justPlaced && (
              <SoftCard className="flex items-center gap-3 p-4 bg-success/10">
                <PartyPopper className="size-7 text-success shrink-0" />
                <p className="font-bold text-ink leading-relaxed">
                  طلبك وصل! 🎉
                  <br />
                  الإدارة هتراجعه وتحدد سعر التوصيل.
                </p>
              </SoftCard>
            )}
            <div className="flex items-center gap-2 pt-1">
              <h2 className="flex-1 text-lg font-extrabold text-ink">{orderStatus(order.data.status).customerMessage}</h2>
              <OrderStatusBadge status={order.data.status} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                <OrderTimeline order={order.data} />
                {order.data.driver && canAssignDriver(order.data) && (
                  <OrderDriverCard driver={order.data.driver} title="المندوب اللي هيوصّلك" />
                )}
                <OrderAddressCard order={order.data} />
              </div>
              <div className="flex flex-col gap-3">
                <OrderItemsCard order={order.data} />
                <OrderTotalsCard order={order.data} />
              </div>
            </div>
            {order.data.canCustomerCancel && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <Button variant="outline" block className="text-danger border-danger/50 hover:bg-danger/10" icon={<X className="size-5" />} onClick={cancel}>
                  إلغاء الأوردر
                </Button>
                <p className="text-xs text-ink-3">تقدر تلغي الأوردر لحد ما الإدارة تأكده.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
