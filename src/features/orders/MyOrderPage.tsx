import { PartyPopper, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router';

import { ordersApi } from '@/api';
import { keys, useMyOrder } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, Loading, SoftCard, StatusChip } from '@/components/ui';
import { t } from '@/lib/i18n';
import { orderStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { RateOrderCard } from '@/features/ratings/Ratings';
import { confirm } from '@/store/ui';

import { OrderAddressCard, OrderDriverCard, OrderItemsCard, OrderStoreCard, OrderStatusBadge, OrderTimeline, OrderTotalsCard, canAssignDriver } from './OrderWidgets';

/** Customer view of one order: status, items, totals, address; cancel while pending. */
export function MyOrderPage() {
  const id = Number(useParams().id);
  const order = useMyOrder(id);
  const qc = useQueryClient();
  const justPlaced = Boolean((useLocation().state as { justPlaced?: boolean } | null)?.justPlaced);

  async function cancel() {
    const o = order.data!;
    if (!(await confirm(t('تلغي الأوردر #{n}؟', { n: o.number }), t('إلغاء الأوردر')))) return;
    if (await runAction(() => ordersApi.cancelMine(o.id), t('الأوردر اتلغى'))) {
      qc.invalidateQueries({ queryKey: keys.myOrder(id) });
      qc.invalidateQueries({ queryKey: keys.myOrders });
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={order.data ? t('أوردر #{n}', { n: order.data.number }) : t('الأوردر')} />
      <div className="px-4 flex flex-col gap-3">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !order.data ? (
          <ErrorView message={(order.error as Error)?.message ?? t('حصل خطأ')} onRetry={() => order.refetch()} />
        ) : (
          <>
            {justPlaced && (
              <SoftCard className="flex items-center gap-3 p-4 bg-success/10">
                <PartyPopper className="size-7 text-success shrink-0" />
                <p className="font-bold text-ink leading-relaxed">
                  {order.data.isCustomOrder ? t('طلبك الخاص وصل! 🎉') : t('طلبك وصل! 🎉')}
                  <br />
                  {order.data.isCustomOrder
                    ? t('الإدارة هتراجع طلبك الخاص وتحدد تكلفة المنتجات والتوصيل.')
                    : t('الإدارة هتراجعه وتأكده.')}
                </p>
              </SoftCard>
            )}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <h2 className="flex-1 text-lg font-extrabold text-ink">{t(orderStatus(order.data.status).customerMessage)}</h2>
              {order.data.isCustomOrder && <StatusChip label={t('طلب خاص')} color="var(--color-custom)" />}
              <OrderStatusBadge status={order.data.status} />
            </div>
            {order.data.canRate && <RateOrderCard order={order.data} />}
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                <OrderTimeline order={order.data} />
                {order.data.driver && canAssignDriver(order.data) && (
                  <OrderDriverCard driver={order.data.driver} title={t('المندوب اللي هيوصّلك')} />
                )}
                {!order.data.isCustomOrder && order.data.stores.map((s) => <OrderStoreCard key={s.storeId} store={s} />)}
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
                  {t('إلغاء الأوردر')}
                </Button>
                <p className="text-xs text-ink-3">{t('تقدر تلغي الأوردر لحد ما الإدارة تأكده.')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
