import { Bike, Check, CheckCheck, ChevronLeft, Pencil, Store as StoreIcon, UserRoundPlus, UserRoundSearch, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { ordersApi } from '@/api';
import { keys, useAdminOrder } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, IconWell, Loading, SoftCard, StatusChip } from '@/components/ui';
import { CustomerPointsCard } from '@/features/loyalty/LoyaltyAdmin';
import { RefundsCard } from '@/features/orders/RefundsCard';
import { CustomerWalletCard } from '@/features/wallet/CustomerWalletAdmin';
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
import { t } from '@/lib/i18n';
import { isAwaitingPickup, orderStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { Order, OrderItem } from '@/types';

import { ChargesDialog } from './ChargesDialog';
import { DriverPicker } from './DriverPicker';
import { OrderItemPicker } from '@/features/orders/OrderItemPicker';

/** Admin view of one order with the next step for its status:
 *  Pending → the store accepts (or the admin confirms for it); before pickup → drivers take it from their
 *  offers or the admin picks one; then picked up and delivered (usually by the driver from their app). */
export function AdminOrderPage() {
  const id = Number(useParams().id);
  const order = useAdminOrder(id);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feeDialog, setFeeDialog] = useState<'confirm' | 'edit' | null>(null);
  const [subtotalOpen, setSubtotalOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

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
    if (!(await confirm(t('تشيل "{name}" من الأوردر؟', { name: item.productName }), t('شيل')))) return;
    await run(() => ordersApi.removeItem(o.id, item.id), t('المنتج اتشال'));
  }

  async function removeDriver(o: Order) {
    if (!(await confirm(t('تشيل {name} من الأوردر؟', { name: o.driver!.fullName }), t('شيل')))) return;
    await run(() => ordersApi.assignDriver(o.id, null), t('المندوب اتشال'));
  }

  const o = order.data;
  const active = o ? orderStatus(o.status).isActive : false;
  const canEditItems = o ? !o.isCustomOrder && (o.status === 'Pending' || isAwaitingPickup(o.status)) : false;
  const awaitingPickup = o ? isAwaitingPickup(o.status) : false;

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={o ? t('أوردر #{n}', { n: o.number }) : t('الأوردر')}
        actions={
          o && active ? (
            <button type="button" title={t('إلغاء الأوردر')} disabled={busy} onClick={() => setReasonOpen(true)} className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger/10 disabled:opacity-50">
              <XCircle className="size-5" />
            </button>
          ) : null
        }
      />
      <div className="px-4">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !o ? (
          <ErrorView message={(order.error as Error)?.message ?? t('حصل خطأ')} onRetry={() => order.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-2 pb-3 flex-wrap">
              <span className="flex-1 text-ink-2">{formatOrderDate(o.createdUtc)}</span>
              {o.isCustomOrder && <StatusChip label={t('طلب خاص')} color="var(--color-custom)" />}
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                {o.storeDecision && o.storeDecision !== 'NotRequired' && o.status !== 'Delivered' && (
                  <StoreDecisionCard
                    order={o}
                    onAcceptForStore={
                      o.status === 'Pending' && o.storeDecision === 'Pending' && !busy
                        ? () => run(() => ordersApi.acceptForStore(o.id), t('وافقت بدل المحل'))
                        : undefined
                    }
                  />
                )}
                <OrderAddressCard order={o} customer={o.customer} showActions />
                {o.customer?.userId && <CustomerPointsCard customerId={o.customer.userId} />}
                {o.customer?.userId && <CustomerWalletCard customerId={o.customer.userId} />}
                {o.status === 'Delivered' && <RefundsCard side="admin" orderId={o.id} />}
                {canAssignDriver(o) ? (
                  o.driver ? (
                    <OrderDriverCard
                      driver={o.driver}
                      disabled={busy}
                      onChange={() => setPickerOpen(true)}
                      onRemove={awaitingPickup ? () => removeDriver(o) : undefined}
                    />
                  ) : (
                    <SoftCard as="button" onClick={() => !busy && setPickerOpen(true)} className="flex items-center gap-3 p-4 bg-warning/10">
                      <IconWell icon={UserRoundSearch} size={44} color="var(--color-warning)" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold text-ink">{t('لسه مفيش مندوب')}</span>
                        <span className="block text-xs text-ink-2">{t('معروض على المناديب المتاحين، أو اختار واحد بنفسك')}</span>
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
                <OrderItemsCard
                  order={o}
                  onRemoveItem={canEditItems && !busy ? (item) => removeItem(o, item) : undefined}
                  onQuantityChange={
                    canEditItems && !busy ? (item, q) => run(() => ordersApi.setItemQuantity(o.id, item.id, q), t('الكمية اتعدّلت')) : undefined
                  }
                  onAddItem={canEditItems && !busy && o.stores.length > 0 ? () => setItemPickerOpen(true) : undefined}
                />
                {o.stores.length > 0 && (
                  <OrderItemPicker
                    storeId={o.stores[0].storeId}
                    open={itemPickerOpen}
                    onClose={() => setItemPickerOpen(false)}
                    onPick={(item) => {
                      setItemPickerOpen(false);
                      run(() => ordersApi.addItem(o.id, item.productId, item.optionIds, item.quantity, item.note), t('المنتج اتضاف للأوردر'));
                    }}
                  />
                )}
                <OrderTotalsCard order={o} />
                <div className="flex items-center gap-2 flex-wrap">
                  {o.isCustomOrder && active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-custom border-custom/40 hover:bg-custom/10"
                      icon={<Pencil className="size-4" />}
                      disabled={busy}
                      onClick={() => setSubtotalOpen(true)}
                    >
                      {t('تعديل سعر المنتجات')}
                    </Button>
                  )}
                  {awaitingPickup && (
                    <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} disabled={busy} onClick={() => setFeeDialog('edit')}>
                      {t('تعديل سعر التوصيل')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {o && active && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mx-auto max-w-3xl">
            {/* The store's acceptance confirms the order; the admin can confirm for a store that does not answer. */}
            {o.status === 'Pending' ? (
              <Button block loading={busy} icon={<Check className="size-5" />} onClick={() => setFeeDialog('confirm')}>
                {o.storeDecision === 'Pending' ? t('أكّد بدل المحل') : t('تأكيد الأوردر')}
              </Button>
            ) : awaitingPickup && !o.driver ? (
              <Button block loading={busy} icon={<UserRoundPlus className="size-5" />} onClick={() => setPickerOpen(true)}>
                {t('اختار مندوب')}
              </Button>
            ) : awaitingPickup ? (
              <Button block loading={busy} icon={<Bike className="size-5" />} onClick={() => run(() => ordersApi.startDelivery(o.id), t('الأوردر خرج للتوصيل'))}>
                {t('المندوب استلم الأوردر')}
              </Button>
            ) : (
              <Button block variant="success" loading={busy} icon={<CheckCheck className="size-5" />} onClick={() => run(() => ordersApi.markDelivered(o.id), t('الأوردر اتوصّل'))}>
                {t('اتوصّل للزبون')}
              </Button>
            )}
          </div>
        </div>
      )}

      <ChargesDialog
        open={feeDialog !== null}
        title={feeDialog === 'edit' ? t('تعديل سعر التوصيل والضريبة') : t('سعر التوصيل للأوردر #{n}', { n: o?.number ?? '' })}
        order={o}
        onClose={() => setFeeDialog(null)}
        onSubmit={({ deliveryFee, taxPercent }) =>
          feeDialog === 'edit'
            ? run(() => ordersApi.setDeliveryFee(id, deliveryFee, taxPercent), t('سعر التوصيل اتعدّل'))
            : run(() => ordersApi.confirm(id, deliveryFee, taxPercent), t('الأوردر اتأكد'))
        }
      />
      <NumberDialog
        open={subtotalOpen}
        title={t('سعر منتجات الطلب الخاص #{n}', { n: o?.number ?? '' })}
        label={t('سعر المنتجات (ج.م)')}
        initial={o?.subtotal}
        onClose={() => setSubtotalOpen(false)}
        onSubmit={(subtotal) => run(() => ordersApi.setCustomSubtotal(id, subtotal), t('سعر المنتجات اتعدّل'))}
      />
      <ReasonDialog open={reasonOpen} onClose={() => setReasonOpen(false)} onSubmit={(reason) => run(() => ordersApi.cancel(id, reason || null), t('الأوردر اتلغى'))} />
      <DriverPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentDriverId={o?.driver?.id}
        onPick={(d) => run(() => ordersApi.assignDriver(id, d.id), t('الأوردر اتسلّم لـ {name}', { name: d.fullName }))}
      />
    </div>
  );
}

/** Where the store stands on the order; the admin can accept for a store that does not answer. */
function StoreDecisionCard({ order, onAcceptForStore }: { order: Order; onAcceptForStore?: () => void }) {
  const [text, color] =
    order.storeDecision === 'Pending'
      ? [t('مستني موافقة المحل'), 'var(--color-warning)']
      : order.storeDecision === 'Rejected'
        ? [t('المحل رفض الأوردر'), 'var(--color-danger)']
        : order.readyUtc
          ? [t('المحل جهّز الأوردر 📦'), 'var(--color-success)']
          : order.status === 'Processing'
            ? [t('المحل بيجهّز الأوردر'), 'var(--color-success)']
            : order.status === 'Confirmed'
              ? [t('المحل وافق، لسه مبدأش يجهّز'), 'var(--color-success)']
              : [t('المحل وافق'), 'var(--color-success)'];

  return (
    <div className="card flex items-center gap-2.5 p-4" style={{ background: `color-mix(in srgb, ${color} 10%, var(--color-surface))` }}>
      <StoreIcon className="size-5 shrink-0" style={{ color }} />
      <span className="flex-1 font-extrabold text-ink">{text}</span>
      {onAcceptForStore && (
        <Button variant="ghost" size="sm" onClick={onAcceptForStore}>
          {t('وافق بداله')}
        </Button>
      )}
    </div>
  );
}
