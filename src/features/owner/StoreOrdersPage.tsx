import { BellRing, Check, ChefHat, MinusCircle, Package, Plus, ReceiptText, StickyNote, X } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { storeOrdersApi } from '@/api';
import { keys, useStoreOrder, useStoreOrders } from '@/api/queries';
import { PageHeader, TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, IconWell, Loading, Price, Segmented, SoftCard, StatusChip } from '@/components/ui';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { orderStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { ScheduledChip } from '@/features/orders/OrderWidgets';
import { OrderItemPicker, QuantityStepper } from '@/features/orders/OrderItemPicker';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';
import type { StoreOrder, StoreOrdersFilter } from '@/types';

import { ReasonDialog } from './Dialogs';
import { useCashierStore } from './owner-queries';

const FILTERS: { value: StoreOrdersFilter; label: string; empty: string }[] = [
  { value: 'New', label: 'جديدة', empty: 'مفيش طلبات جديدة' },
  { value: 'Active', label: 'بتتجهز', empty: 'مفيش طلبات بتتجهز' },
  { value: 'Done', label: 'خلصت', empty: 'لسه مفيش طلبات خلصت' },
];

/** One line for the store: what it should do or what is happening. */
function stateText(o: StoreOrder): string {
  if (o.status === 'Cancelled') return o.storeDecision === 'Rejected' ? 'رفضته' : 'اتلغى';
  if (o.canAccept) return 'مستني موافقتك';
  if (o.status === 'Confirmed') return 'ابدأ جهّزه';
  if (o.status === 'Processing') return 'بتجهّزه';
  if (o.status === 'ReadyForPickup') return 'جاهز، مستني المندوب';
  return orderStatus(o.status).label;
}

/** A store's cashier works its orders but does not see its money (net, commission, wallet). */
const useIsCashier = () => useAuth((s) => s.session?.role === 'cashier');

/** What the customer pays for the store's part: the products and the store's tax (not in the shared type). */
const orderTotal = (o: StoreOrder) => o.subtotal + ((o as StoreOrder & { taxAmount?: number }).taxAmount ?? 0);

/**
 * The store's orders: new (accept / reject), being prepared (start preparing, mark ready), done.
 * Used by the owner (`/owner/orders`) and the store's cashier (`/cashier`, without the money).
 */
export function StoreOrdersPage() {
  const [filter, setFilter] = useState<StoreOrdersFilter>('New');
  const orders = useStoreOrders(filter);
  const newCount = useStoreOrders('New').data?.length ?? 0;
  const navigate = useNavigate();
  const isCashier = useIsCashier();
  const cashierStore = useCashierStore().data;
  const meta = FILTERS.find((f) => f.value === filter)!;
  const basePath = isCashier ? '/cashier' : '/owner';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8">
      <TabHeader title={cashierStore ? `طلبات ${cashierStore.storeName}` : 'الطلبات'} />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f.value, label: f.value === 'New' && newCount > 0 ? `${f.label} (${newCount})` : f.label }))}
      />
      <div className="mt-4 flex flex-col gap-2.5">
        {orders.isLoading ? (
          <Loading />
        ) : orders.isError ? (
          <ErrorView message={(orders.error as Error).message} onRetry={() => orders.refetch()} />
        ) : !orders.data?.length ? (
          <EmptyView icon={ReceiptText} message={meta.empty} />
        ) : (
          orders.data.map((o) => {
            const highlight = o.canAccept || o.canMarkReady;
            const status = orderStatus(o.status);
            return (
              <SoftCard key={o.id} as="button" onClick={() => navigate(`${basePath}/orders/${o.id}`)} className="flex items-center gap-3 p-3.5 text-start">
                <IconWell icon={o.canAccept ? BellRing : status.Icon} size={44} color={highlight ? 'var(--color-brand)' : status.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold text-ink">
                    أوردر #{o.number} • {o.storeName}
                  </span>
                  <span className="block text-xs text-ink-2">
                    {o.itemsCount} منتج • {formatOrderDate(o.createdUtc)}
                  </span>
                  <span className={`mt-1 block text-[13px] font-bold ${highlight ? 'text-brand-ink' : 'text-ink-3'}`}>{stateText(o)}</span>
                  {o.scheduledForUtc && (
                    <span className="mt-1 block">
                      <ScheduledChip value={o.scheduledForUtc} />
                    </span>
                  )}
                </span>
                {/* What the store gets, after the commission; the cashier sees the order's total instead. */}
                {isCashier ? <span className="font-extrabold text-ink">{formatPrice(orderTotal(o))}</span> : <Price value={o.storeEarnings} />}
              </SoftCard>
            );
          })
        )}
      </div>
    </div>
  );
}

/** One order for the store: items and note; accept / reject while new, then mark ready. */
export function StoreOrderPage() {
  const id = Number(useParams().id);
  const order = useStoreOrder(id);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const isCashier = useIsCashier();
  const o = order.data;

  async function run(call: () => Promise<StoreOrder>, success: string) {
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(keys.storeOrder(id), await call());
    }, success);
    setBusy(false);
    if (ok) qc.invalidateQueries({ queryKey: ['store-orders', 'list'] });
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <PageHeader title={o ? `أوردر #${o.number}` : 'الأوردر'} />
      <div className="flex flex-col gap-3 px-4">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !o ? (
          <ErrorView message={(order.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => order.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-lg font-extrabold text-ink">{stateText(o)}</h2>
              <StatusChip label={orderStatus(o.status).label} color={orderStatus(o.status).color} />
            </div>
            <p className="-mt-2 text-ink-2">
              {o.storeName} • {formatOrderDate(o.createdUtc)}
            </p>
            {o.scheduledForUtc && (
              <div>
                <ScheduledChip value={o.scheduledForUtc} />
              </div>
            )}
            {o.cancellationReason && <p className="text-danger">السبب: {o.cancellationReason}</p>}
            <SoftCard className="overflow-hidden">
              {o.items.map((i) => (
                <div key={i.id} className="flex items-start gap-3 border-b border-line px-4 py-3">
                  {o.canEditItems ? (
                    <QuantityStepper
                      quantity={i.quantity}
                      disabled={busy}
                      onChange={(q) => run(() => storeOrdersApi.setItemQuantity(o.id, i.id, q), 'الكمية اتعدّلت')}
                    />
                  ) : (
                    <span className="rounded-lg bg-surface-alt px-2 py-0.5 font-extrabold text-ink">{i.quantity}×</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink">{i.productName}</span>
                    {i.optionsText && <span className="block text-xs text-ink-2">{i.optionsText}</span>}
                    {i.note && <span className="block text-xs text-accent">{i.note}</span>}
                  </span>
                  <span className="text-ink-2">{formatPrice(i.lineTotal)}</span>
                  {o.canEditItems && o.items.length > 1 && (
                    <button
                      type="button"
                      title="شيل المنتج"
                      disabled={busy}
                      onClick={async () => {
                        if (!(await confirm(`تشيل "${i.productName}" من الأوردر؟`, 'شيل'))) return;
                        await run(() => storeOrdersApi.removeItem(o.id, i.id), 'المنتج اتشال');
                      }}
                      className="-my-1 grid size-8 place-items-center rounded-full text-danger hover:bg-danger/10"
                    >
                      <MinusCircle className="size-5" />
                    </button>
                  )}
                </div>
              ))}
              {o.canEditItems && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setItemPickerOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 border-b border-line py-3 font-bold text-brand-ink hover:bg-surface-alt"
                >
                  <Plus className="size-4" /> إضافة منتج (الزبون غيّر طلبه)
                </button>
              )}
              {isCashier ? (
                <div className="flex items-center px-4 py-3">
                  <span className="flex-1 font-extrabold text-ink">الحساب</span>
                  <span className="text-lg font-extrabold text-ink">{formatPrice(orderTotal(o))}</span>
                </div>
              ) : (
                <>
                  {o.commissionAmount > 0 && (
                    <>
                      <div className="flex items-center px-4 pt-3 text-ink-2">
                        <span className="flex-1">المجموع</span>
                        <span>{formatPrice(o.subtotal)}</span>
                      </div>
                      <div className="flex items-center border-b border-line px-4 py-2 text-ink-2">
                        <span className="flex-1">عمولة التطبيق ({o.commissionPercent}%)</span>
                        <span className="text-danger" dir="ltr">
                          - {formatPrice(o.commissionAmount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center px-4 py-3">
                    <span className="flex-1 font-extrabold text-ink">{o.commissionAmount > 0 ? 'صافي ليك' : 'المجموع'}</span>
                    <Price value={o.storeEarnings} className="text-lg" />
                  </div>
                </>
              )}
            </SoftCard>
            <OrderItemPicker
              storeId={o.storeId}
              open={itemPickerOpen}
              onClose={() => setItemPickerOpen(false)}
              onPick={(item) => {
                setItemPickerOpen(false);
                run(() => storeOrdersApi.addItem(o.id, item.productId, item.optionIds, item.quantity, item.note), 'المنتج اتضاف للأوردر');
              }}
            />
            {o.note && (
              <SoftCard className="flex items-start gap-2.5 p-4">
                <StickyNote className="size-5 shrink-0 text-accent" />
                <p className="text-ink">{o.note}</p>
              </SoftCard>
            )}
            {o.driver && (
              <SoftCard className="flex items-center gap-2.5 p-4">
                <span className="flex-1 font-bold text-ink">المندوب: {o.driver.fullName}</span>
                <a href={`tel:${o.driver.phoneNumber}`} dir="ltr" className="text-brand-ink">
                  {o.driver.phoneNumber}
                </a>
              </SoftCard>
            )}
          </>
        )}
      </div>

      {o && (o.canAccept || o.canMarkReady) && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mx-auto flex max-w-2xl gap-3">
            {o.canAccept ? (
              <>
                <Button variant="outline" className="flex-1 border-danger/50 text-danger hover:bg-danger/10" icon={<X className="size-5" />} disabled={busy} onClick={() => setRejecting(true)}>
                  رفض
                </Button>
                <Button className="flex-[2]" loading={busy} icon={<Check className="size-5" />} onClick={() => run(() => storeOrdersApi.accept(o.id), 'وافقت على الأوردر')}>
                  موافقة
                </Button>
              </>
            ) : (
              <>
                {o.canStartPreparing && (
                  <Button variant="outline" className="flex-1" disabled={busy} icon={<ChefHat className="size-5" />} onClick={() => run(() => storeOrdersApi.startPreparing(o.id), 'بدأت تجهّز الأوردر')}>
                    ابدأ التجهيز
                  </Button>
                )}
                <Button className="flex-1" variant="success" loading={busy} icon={<Package className="size-5" />} onClick={() => run(() => storeOrdersApi.markReady(o.id), 'الأوردر جاهز، المندوب هيتبلغ')}>
                  الأوردر جاهز
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <ReasonDialog
        open={rejecting}
        title="رفض الأوردر"
        placeholder="مثلاً: منتج خلصان، أو المحل زحمة"
        onClose={() => setRejecting(false)}
        onSubmit={(reason) => (o ? run(() => storeOrdersApi.reject(o.id, reason || null), 'الأوردر اترفض') : undefined)}
      />
    </div>
  );
}
