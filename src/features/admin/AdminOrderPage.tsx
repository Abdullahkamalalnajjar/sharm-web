import { Bike, Check, CheckCheck, ChevronLeft, Pencil, UserRoundPlus, UserRoundSearch, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { ordersApi } from '@/api';
import { keys, useAdminOrder } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, IconWell, Loading, SoftCard } from '@/components/ui';
import { NumberDialog, ReasonDialog } from '@/features/owner/Dialogs';
import {
  OrderAddressCard,
  OrderDriverCard,
  OrderItemsCard,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotalsCard,
  canAssignDriver,
} from '@/features/orders/OrderWidgets';
import { formatOrderDate } from '@/lib/format';
import { orderStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { Order, OrderItem } from '@/types';

import { DriverPicker } from './DriverPicker';

/** Admin view of one order with the next step for its status:
 *  Pending → confirm with delivery fee; Confirmed → pick a driver, then picked up;
 *  Out for delivery → delivered. The driver usually marks the last two from their app. */
export function AdminOrderPage() {
  const id = Number(useParams().id);
  const order = useAdminOrder(id);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feeDialog, setFeeDialog] = useState<'confirm' | 'edit' | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function run(call: () => Promise<Order>, success: string) {
    setBusy(true);
    const ok = await runAction(async () => {
      const updated = await call();
      qc.setQueryData(keys.adminOrder(id), updated);
    }, success);
    setBusy(false);
    if (ok) qc.invalidateQueries({ queryKey: ['admin'], refetchType: 'inactive' });
  }

  async function removeItem(o: Order, item: OrderItem) {
    if (!(await confirm(`تشيل "${item.productName}" من الأوردر؟`, 'شيل'))) return;
    await run(() => ordersApi.removeItem(o.id, item.id), 'المنتج اتشال');
  }

  async function removeDriver(o: Order) {
    if (!(await confirm(`تشيل ${o.driver!.fullName} من الأوردر؟`, 'شيل'))) return;
    await run(() => ordersApi.assignDriver(o.id, null), 'المندوب اتشال');
  }

  const o = order.data;
  const active = o ? orderStatus(o.status).isActive : false;
  const canEditItems = o ? o.status === 'Pending' || o.status === 'Confirmed' : false;

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={o ? `أوردر #${o.number}` : 'الأوردر'}
        actions={
          o && active ? (
            <button type="button" title="إلغاء الأوردر" disabled={busy} onClick={() => setReasonOpen(true)} className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger/10 disabled:opacity-50">
              <XCircle className="size-5" />
            </button>
          ) : null
        }
      />
      <div className="px-4">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !o ? (
          <ErrorView message={(order.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => order.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-2 pb-3">
              <span className="flex-1 text-ink-2">{formatOrderDate(o.createdUtc)}</span>
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                <OrderAddressCard order={o} customer={o.customer} showActions />
                {canAssignDriver(o) ? (
                  o.driver ? (
                    <OrderDriverCard
                      driver={o.driver}
                      disabled={busy}
                      onChange={() => setPickerOpen(true)}
                      onRemove={o.status === 'Confirmed' ? () => removeDriver(o) : undefined}
                    />
                  ) : (
                    <SoftCard as="button" onClick={() => !busy && setPickerOpen(true)} className="flex items-center gap-3 p-4 bg-warning/10">
                      <IconWell icon={UserRoundSearch} size={44} color="var(--color-warning)" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold text-ink">لسه مفيش مندوب</span>
                        <span className="block text-xs text-ink-2">اختار مندوب عشان يستلم الأوردر</span>
                      </span>
                      <ChevronLeft className="size-5 text-warning" />
                    </SoftCard>
                  )
                ) : (
                  o.driver && <OrderDriverCard driver={o.driver} />
                )}
                <OrderTimeline order={o} />
              </div>
              <div className="flex flex-col gap-3">
                <OrderItemsCard order={o} onRemoveItem={canEditItems && !busy ? (item) => removeItem(o, item) : undefined} />
                <OrderTotalsCard order={o} />
                {o.status === 'Confirmed' && (
                  <Button variant="ghost" size="sm" className="self-start" icon={<Pencil className="size-4" />} disabled={busy} onClick={() => setFeeDialog('edit')}>
                    تعديل سعر التوصيل
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {o && active && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mx-auto max-w-3xl">
            {o.status === 'Pending' ? (
              <Button block loading={busy} icon={<Check className="size-5" />} onClick={() => setFeeDialog('confirm')}>
                تأكيد وتحديد سعر التوصيل
              </Button>
            ) : o.status === 'Confirmed' && !o.driver ? (
              <Button block loading={busy} icon={<UserRoundPlus className="size-5" />} onClick={() => setPickerOpen(true)}>
                اختار مندوب
              </Button>
            ) : o.status === 'Confirmed' ? (
              <Button block loading={busy} icon={<Bike className="size-5" />} onClick={() => run(() => ordersApi.startDelivery(o.id), 'الأوردر خرج للتوصيل')}>
                المندوب استلم الأوردر
              </Button>
            ) : (
              <Button block variant="success" loading={busy} icon={<CheckCheck className="size-5" />} onClick={() => run(() => ordersApi.markDelivered(o.id), 'الأوردر اتوصّل')}>
                اتوصّل للزبون
              </Button>
            )}
          </div>
        </div>
      )}

      <NumberDialog
        open={feeDialog !== null}
        title={feeDialog === 'edit' ? 'تعديل سعر التوصيل' : `سعر التوصيل للأوردر #${o?.number ?? ''}`}
        label="سعر التوصيل (ج.م)"
        initial={feeDialog === 'edit' ? o?.deliveryFee : null}
        onClose={() => setFeeDialog(null)}
        onSubmit={(fee) =>
          feeDialog === 'edit'
            ? run(() => ordersApi.setDeliveryFee(id, fee), 'سعر التوصيل اتعدّل')
            : run(() => ordersApi.confirm(id, fee), 'الأوردر اتأكد')
        }
      />
      <ReasonDialog open={reasonOpen} onClose={() => setReasonOpen(false)} onSubmit={(reason) => run(() => ordersApi.cancel(id, reason || null), 'الأوردر اتلغى')} />
      <DriverPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentDriverId={o?.driver?.id}
        onPick={(d) => run(() => ordersApi.assignDriver(id, d.id), `الأوردر اتسلّم لـ ${d.fullName}`)}
      />
    </div>
  );
}
