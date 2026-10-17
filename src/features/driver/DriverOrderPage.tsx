import { Banknote, Bike, CheckCheck, MapPin, PackageCheck, Store, XCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { driversApi } from '@/api';
import { keys, useDriverOrder } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, IconWell, Loading, Price, SoftCard, StatusChip } from '@/components/ui';
import { OrderAddressCard, OrderItemsCard, OrderTimeline } from '@/features/orders/OrderWidgets';
import { formatPrice } from '@/lib/format';
import { isAwaitingPickup } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { Order } from '@/types';

/** One order for the driver: pick-up list by store, the customer's address and phone,
 *  the cash to collect, and the next step ("استلمت" then "وصّلت"). Before pickup the driver can give it back. */
export function DriverOrderPage() {
  const id = Number(useParams().id);
  const order = useDriverOrder(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  /** Give the order back before pickup: it goes to the other drivers. */
  async function giveBack(o: Order) {
    if (!(await confirm(`مش هتقدر توصّل أوردر #${o.number}؟ هيرجع للمناديب التانيين.`, 'رجّع الأوردر'))) return;
    setBusy(true);
    const done = await runAction(() => driversApi.reject(o.id), 'الأوردر رجع');
    setBusy(false);
    if (done) {
      qc.invalidateQueries({ queryKey: ['driver'] });
      navigate('/driver');
    }
  }

  async function step(o: Order) {
    const pickingUp = isAwaitingPickup(o.status);
    const ok = await confirm(
      pickingUp
        ? o.isCustomOrder
          ? 'اشتريت كل المطلوب في الطلب الخاص؟'
          : `استلمت كل حاجة من ${o.stores.length === 1 ? 'المحل' : `الـ ${o.stores.length} محلات`}؟`
        : `سلّمت الأوردر للزبون وحصّلت ${formatPrice(o.total)}؟`,
      pickingUp ? 'استلمت' : 'وصّلت',
    );
    if (!ok) return;
    setBusy(true);
    const done = await runAction(async () => {
      const updated = pickingUp ? await driversApi.pickedUp(o.id) : await driversApi.delivered(o.id);
      qc.setQueryData(keys.driverOrder(id), updated);
    }, pickingUp ? 'تمام! روح للزبون' : 'برافو! الأوردر اتوصّل');
    setBusy(false);
    if (done) qc.invalidateQueries({ queryKey: ['driver'], refetchType: 'inactive' });
  }

  const o = order.data;
  const beforePickup = o ? isAwaitingPickup(o.status) : false;
  const actionable = beforePickup || o?.status === 'OutForDelivery';

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader title={o ? `أوردر #${o.number}` : 'الأوردر'} />
      <div className="px-4">
        {order.isLoading ? (
          <Loading />
        ) : order.isError || !o ? (
          <ErrorView message={(order.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => order.refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            <StepBanner order={o} />
            {beforePickup && !o.isCustomOrder && (
              <div>
                <StatusChip
                  label={
                    o.status === 'ReadyForPickup'
                      ? 'الأوردر جاهز للاستلام 📦'
                      : o.status === 'Processing'
                        ? 'المحل بيجهّز الأوردر'
                        : 'المحل لسه مبدأش يجهّز'
                  }
                  color={o.status === 'ReadyForPickup' ? 'var(--color-success)' : 'var(--color-warning)'}
                />
              </div>
            )}
            <SoftCard className="flex items-center gap-3 p-4">
              <IconWell icon={Banknote} size={46} color="var(--color-accent)" />
              <div className="min-w-0 flex-1">
                <p className="text-ink-2">حصّل من الزبون كاش</p>
                <p className="text-xs text-ink-3">
                  منتجات {formatPrice(o.subtotal)} + توصيل {formatPrice(o.deliveryFee ?? 0)}
                  {o.taxAmount > 0 && <> + ضريبة {formatPrice(o.taxAmount)}</>}
                </p>
              </div>
              <Price value={o.total} className="text-[22px]" />
            </SoftCard>
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                <Title icon={Store} text="هتستلم من" />
                <OrderItemsCard order={o} />
              </div>
              <div className="flex flex-col gap-3">
                <Title icon={MapPin} text="هتوصّل لـ" />
                <OrderAddressCard order={o} customer={o.customer} showActions />
                <OrderTimeline order={o} />
              </div>
            </div>
          </div>
        )}
      </div>

      {o && actionable && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mx-auto max-w-3xl">
            {beforePickup ? (
              <div className="flex gap-2.5">
                <Button variant="outline" className="border-danger/50 text-danger hover:bg-danger/10" disabled={busy} onClick={() => giveBack(o)}>
                  رجّعه
                </Button>
                <Button className="flex-1" loading={busy} icon={<PackageCheck className="size-5" />} onClick={() => step(o)}>
                  استلمت الأوردر
                </Button>
              </div>
            ) : (
              <Button block variant="success" loading={busy} icon={<CheckCheck className="size-5" />} onClick={() => step(o)}>
                وصّلت الأوردر
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Title({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <p className="-mb-1 flex items-center gap-1.5 px-1 font-extrabold text-ink-2">
      <Icon className="size-[18px] text-ink-3" />
      {text}
    </p>
  );
}

/** What the driver should do now, in one line. */
function StepBanner({ order }: { order: Order }) {
  const [Icon, color, title, body]: [LucideIcon, string, string, string] =
    isAwaitingPickup(order.status)
      ? [
          Store,
          'var(--color-warning)',
          'روح استلم الأوردر',
          order.isCustomOrder ? 'طلب خاص — اشتري المطلوب' : `من ${order.stores.map((s) => s.storeName).join(' و ')}`,
        ]
      : order.status === 'OutForDelivery'
        ? [Bike, 'var(--color-series-1)', 'في الطريق للزبون', 'سلّم الأوردر وحصّل المبلغ كاش']
        : order.status === 'Delivered'
          ? [CheckCheck, 'var(--color-success)', 'الأوردر اتوصّل', 'شكراً! 🙌']
          : [XCircle, 'var(--color-danger)', 'الأوردر اتلغى', order.cancellationReason ?? 'من الإدارة'];

  return (
    <SoftCard className="flex items-center gap-3 p-4" >
      <span className="absolute" />
      <IconWell icon={Icon} size={46} color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-extrabold text-ink">{title}</p>
        <p className="text-ink-2">{body}</p>
      </div>
    </SoftCard>
  );
}
