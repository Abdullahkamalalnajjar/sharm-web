import clsx from 'clsx';
import { Banknote, Bike, Mail, Map, MapPin, MinusCircle, Phone, Store, StickyNote, UserRound, UserRoundX, XCircle, ArrowLeftRight } from 'lucide-react';

import { Button, IconWell, Price, SoftCard, StatusChip } from '@/components/ui';
import { addressDetails, formatOrderDate, formatPrice } from '@/lib/format';
import { ORDER_STATUSES, orderStatus } from '@/lib/meta';
import type { Order, OrderCustomer, OrderDriver, OrderItem, OrderSummary } from '@/types';

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;
export const mapHref = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** The admin can pick or change the driver until the order is delivered. */
export const canAssignDriver = (o: Order) => o.status === 'Confirmed' || o.status === 'OutForDelivery';

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  const meta = orderStatus(status);
  return <StatusChip label={meta.label} color={meta.color} />;
}

/** Card in order lists (customer and admin). */
export function OrderSummaryCard({ order, onClick, showCustomer }: { order: OrderSummary; onClick: () => void; showCustomer?: boolean }) {
  const meta = orderStatus(order.status);
  const needsFee = order.status === 'Pending' && order.deliveryFee == null;
  const needsDriver = order.status === 'Confirmed' && order.driverName == null;
  return (
    <SoftCard as="button" onClick={onClick} className="p-3.5">
      <div className="flex items-center gap-3">
        <IconWell icon={meta.Icon} size={42} color={meta.color} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">أوردر #{order.number}</p>
          <p className="text-xs text-ink-3">{formatOrderDate(order.createdUtc)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-ink-2 truncate">
        <Store className="size-4 shrink-0 text-ink-3" />
        {order.storeNames.join(' • ')}
      </p>
      {showCustomer && order.customerEmail && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-2 flex-wrap">
          <UserRound className="size-4 text-ink-3" />
          <span dir="ltr">{order.customerEmail}</span>
          <MapPin className="ms-2 size-4 text-ink-3" />
          {order.addressLabel}
        </p>
      )}
      {showCustomer && order.driverName && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-2">
          <Bike className="size-4 text-ink-3" />
          {order.driverName}
        </p>
      )}
      <div className="my-2.5 border-t border-line" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-ink-2">{order.itemsCount} منتج</span>
        {needsFee && <StatusChip label="محتاج سعر توصيل" color="var(--color-warning)" />}
        {showCustomer && needsDriver && <StatusChip label="محتاج مندوب" color="var(--color-warning)" />}
        <span className="flex-1" />
        <Price value={order.total} className="text-base" />
      </div>
    </SoftCard>
  );
}

/** Status steps with times; a cancelled order shows why instead. */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'Cancelled') {
    return (
      <SoftCard className="flex items-start gap-2.5 p-4 bg-danger/10">
        <XCircle className="size-6 shrink-0 text-danger" />
        <div>
          <p className="font-extrabold text-ink">{order.cancelledBy === 'Customer' ? 'إنت لغيت الطلب' : 'الطلب اتلغى من الإدارة'}</p>
          {order.cancellationReason && <p className="text-ink-2">{order.cancellationReason}</p>}
          {order.cancelledUtc && <p className="text-xs text-ink-3">{formatOrderDate(order.cancelledUtc)}</p>}
        </div>
      </SoftCard>
    );
  }

  const steps = [
    { status: 'Pending', title: 'الطلب وصل', time: order.createdUtc },
    { status: 'Confirmed', title: 'اتأكد', time: order.confirmedUtc },
    { status: 'OutForDelivery', title: 'خرج للتوصيل', time: order.outForDeliveryUtc },
    { status: 'Delivered', title: 'اتوصّل', time: order.deliveredUtc },
  ] as const;
  const current = steps.findIndex((s) => s.status === order.status);

  return (
    <SoftCard className="p-4">
      {steps.map((step, i) => {
        const meta = ORDER_STATUSES.find((s) => s.value === step.status)!;
        const done = i <= current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={clsx('grid size-[34px] place-items-center rounded-full', done ? 'bg-brand text-white' : 'bg-surface-alt text-ink-3', active && 'shadow-[0_0_12px_rgb(239_42_42/0.45)]')}
              >
                <meta.Icon className="size-[18px]" />
              </span>
              {!isLast && <span className={clsx('my-0.5 w-0.5 flex-1 min-h-4', done ? 'bg-brand' : 'bg-surface-high')} />}
            </div>
            <div className={clsx('pt-1.5', !isLast && 'pb-4')}>
              <p className={clsx(active ? 'font-extrabold' : 'font-semibold', done ? 'text-ink' : 'text-ink-3')}>{step.title}</p>
              {step.time && <p className="text-xs text-ink-3">{formatOrderDate(step.time)}</p>}
            </div>
          </div>
        );
      })}
    </SoftCard>
  );
}

/** Items grouped by store. `onRemoveItem` (admin) shows a remove button per item. */
export function OrderItemsCard({ order, onRemoveItem }: { order: Order; onRemoveItem?: (item: OrderItem) => void }) {
  return (
    <SoftCard className="overflow-hidden">
      {order.stores.map((g, gi) => (
        <div key={g.storeId} className={clsx(gi > 0 && 'border-t border-line')}>
          <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-1.5">
            <Store className="size-[18px] text-accent" />
            <span className="flex-1 font-extrabold text-ink">{g.storeName}</span>
            <span className="font-bold text-ink-2">{formatPrice(g.subtotal)}</span>
          </div>
          {g.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 px-3.5 py-1.5">
              <span className="rounded-lg bg-surface-alt px-2 py-0.5 font-extrabold text-ink">{item.quantity}×</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink">{item.productName}</p>
                {item.optionsText && <p className="text-xs text-ink-2">{item.optionsText}</p>}
                {item.note && <p className="text-xs text-ink-3">📝 {item.note}</p>}
              </div>
              <span className="text-ink">{formatPrice(item.lineTotal)}</span>
              {onRemoveItem && (
                <button type="button" title="شيل المنتج" onClick={() => onRemoveItem(item)} className="-my-1 grid size-8 place-items-center rounded-full text-danger hover:bg-danger/10">
                  <MinusCircle className="size-5" />
                </button>
              )}
            </div>
          ))}
          <div className="h-2" />
        </div>
      ))}
    </SoftCard>
  );
}

export function OrderTotalsCard({ order }: { order: Order }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center py-1">
      <span className="text-ink-2">{label}</span>
      <span className="flex-1" />
      {value}
    </div>
  );
  return (
    <SoftCard className="p-4">
      <Row label="المنتجات" value={<span className="text-ink">{formatPrice(order.subtotal)}</span>} />
      <Row
        label="التوصيل"
        value={order.deliveryFee == null ? <span className="text-[13px] text-warning">هيتحدد من الإدارة</span> : <span className="text-ink">{formatPrice(order.deliveryFee)}</span>}
      />
      <div className="my-2 border-t border-line" />
      <Row label={order.deliveryFee == null ? 'الإجمالي (من غير التوصيل)' : 'الإجمالي'} value={<Price value={order.total} className="text-lg" />} />
      <Row
        label="الدفع"
        value={
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Banknote className="size-4 text-ink-2" />
            كاش عند الاستلام
          </span>
        }
      />
    </SoftCard>
  );
}

/** `showActions` adds call and map buttons (admin and driver). */
export function OrderAddressCard({ order, customer, showActions }: { order: Order; customer?: OrderCustomer | null; showActions?: boolean }) {
  const a = order.address;
  const details = addressDetails(a);
  const phone = a.contactPhone ?? customer?.phoneNumber ?? null;
  const hasMap = a.latitude != null && a.longitude != null;
  return (
    <SoftCard className="p-4">
      <div className="flex items-start gap-3">
        <IconWell icon={MapPin} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">{a.label}</p>
          <p className="text-ink-2">{a.addressLine}</p>
          {details && <p className="text-xs text-ink-2">{details}</p>}
          {a.landmark && <p className="text-xs text-ink-3">{a.landmark}</p>}
        </div>
      </div>
      {(customer?.email || phone) && (
        <>
          <div className="my-3 border-t border-line" />
          {customer?.email && (
            <p className="flex items-center gap-2 py-0.5 text-ink">
              <Mail className="size-[18px] text-ink-3" />
              <span dir="ltr">{customer.email}</span>
            </p>
          )}
          {phone && (
            <p className="flex items-center gap-2 py-0.5 text-ink">
              <Phone className="size-[18px] text-ink-3" />
              <a href={telHref(phone)} dir="ltr" className="hover:underline">
                {phone}
              </a>
            </p>
          )}
        </>
      )}
      {showActions && (phone || hasMap) && (
        <div className="mt-3 flex gap-2.5">
          {phone && (
            <a href={telHref(phone)} className="flex-1">
              <Button block size="md" icon={<Phone className="size-[18px]" />}>
                اتصل بالزبون
              </Button>
            </a>
          )}
          {hasMap && (
            <a href={mapHref(a.latitude!, a.longitude!)} target="_blank" rel="noreferrer" className="flex-1">
              <Button block size="md" variant="outline" icon={<Map className="size-[18px]" />}>
                افتح الخريطة
              </Button>
            </a>
          )}
        </div>
      )}
      {order.note && (
        <>
          <div className="my-3 border-t border-line" />
          <p className="flex items-start gap-2 text-ink-2">
            <StickyNote className="size-[18px] shrink-0 text-ink-3" />
            {order.note}
          </p>
        </>
      )}
    </SoftCard>
  );
}

/** The driver on the order: name, phone and a call button. `onChange` / `onRemove` (admin) swap or take back the driver. */
export function OrderDriverCard({
  driver,
  title = 'المندوب',
  onChange,
  onRemove,
  disabled,
}: {
  driver: OrderDriver;
  title?: string;
  onChange?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <SoftCard className="p-4">
      <div className="flex items-center gap-3">
        <IconWell icon={Bike} size={46} color="var(--color-series-1)" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-3">{title}</p>
          <p className="font-extrabold text-ink">{driver.fullName}</p>
          <p className="text-[13px] text-ink-2" dir="ltr">
            {driver.phoneNumber}
          </p>
        </div>
        <a href={telHref(driver.phoneNumber)} title="اتصل بالمندوب" className="grid size-11 place-items-center rounded-full bg-brand text-white shadow-brand hover:bg-brand-light">
          <Phone className="size-5" />
        </a>
      </div>
      {(onChange || onRemove) && (
        <>
          <div className="my-3 border-t border-line" />
          <div className="flex items-center">
            {onChange && (
              <Button variant="ghost" size="sm" disabled={disabled} icon={<ArrowLeftRight className="size-4" />} onClick={onChange}>
                غيّر المندوب
              </Button>
            )}
            <span className="flex-1" />
            {onRemove && (
              <Button variant="ghost" size="sm" disabled={disabled} className="text-danger hover:bg-danger/10" icon={<UserRoundX className="size-4" />} onClick={onRemove}>
                شيل المندوب
              </Button>
            )}
          </div>
        </>
      )}
    </SoftCard>
  );
}
