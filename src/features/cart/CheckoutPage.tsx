import clsx from 'clsx';
import { Banknote, CalendarClock, Circle, CircleDot, Clock, Info, MapPinPlus, Store } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';

import { ordersApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAddresses, useCart, useDeliveryQuote, useScheduleSlots, useScheduledCart } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, EmptyView, ErrorView, IconWell, Loading, SectionHeader, Sheet, SoftCard, TextArea } from '@/components/ui';
import { AddressFormSheet } from '@/features/addresses/AddressForm';
import { addressIcon } from '@/features/customer/DeliveryPicker';
import { addressDetails, formatPrice } from '@/lib/format';
import { formatScheduledTime } from '@/lib/localized';
import { showMessage } from '@/store/ui';
import { EMPTY_CART, type Address } from '@/types';

/** Choose the delivery address and time, add a note, and place the order (cash on delivery). */
export function CheckoutPage() {
  const addresses = useAddresses();
  // The store is closed now: the order must be for a later time.
  const scheduleOnly = useSearchParams()[0].get('schedule') === '1';
  /** The chosen delivery time (UTC ISO, as the API listed it); null = as soon as possible. */
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const scheduling = scheduleOnly || scheduledFor !== null;
  const regularCart = useCart().data ?? EMPTY_CART;
  // A closed store's lines only count when ordering for later.
  const scheduledCart = useScheduledCart(scheduling).data;
  const cart = scheduling ? (scheduledCart ?? EMPTY_CART) : regularCart;
  const store = cart.stores[0] ?? regularCart.stores[0];
  const needsTime = scheduleOnly && scheduledFor === null;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const list = addresses.data ?? [];
  const selected = list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0];
  const quote = useDeliveryQuote(selected?.id);
  const total = cart.subtotal + (quote.data?.deliveryFee ?? 0);

  async function place() {
    if (!selected) return;
    setPlacing(true);
    try {
      const order = await ordersApi.place(selected.id, note.trim() || null, scheduledFor);
      qc.invalidateQueries({ queryKey: keys.cart });
      qc.invalidateQueries({ queryKey: keys.myOrders });
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      showMessage(errorMessage(e), true);
      qc.invalidateQueries({ queryKey: keys.cart });
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <PageHeader title="تأكيد الطلب" />
      <div className="px-4">
        <SectionHeader title="التوصيل لـ" action="إضافة عنوان" onAction={() => setFormOpen(true)} className="pt-2" />
        {addresses.isLoading ? (
          <Loading className="py-6" />
        ) : addresses.isError ? (
          <ErrorView message={(addresses.error as Error).message} onRetry={() => addresses.refetch()} />
        ) : list.length === 0 ? (
          <SoftCard as="button" onClick={() => setFormOpen(true)} className="flex items-center gap-3 p-4">
            <IconWell icon={MapPinPlus} filled />
            <span className="font-bold text-ink">ضيف عنوان التوصيل الأول</span>
          </SoftCard>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((a) => (
              <AddressOption key={a.id} address={a} selected={a.id === selected?.id} onSelect={() => setAddressId(a.id)} />
            ))}
          </div>
        )}

        {store?.allowsScheduledOrders && (
          <>
            <SectionHeader title="ميعاد التوصيل" />
            <SoftCard className="p-1.5">
              {!scheduleOnly && (
                <TimeOption selected={scheduledFor === null} onClick={() => setScheduledFor(null)} title="في أسرع وقت" />
              )}
              <TimeOption
                selected={scheduledFor !== null}
                onClick={() => setSlotsOpen(true)}
                title={scheduledFor ? formatScheduledTime(scheduledFor) : 'حدد ميعاد'}
                subtitle={scheduledFor ? 'دوس عشان تغيّر' : 'النهارده أو بكرة'}
              />
            </SoftCard>
          </>
        )}

        <SectionHeader title="ملخص الطلب" />
        <SoftCard className="p-4">
          {cart.stores.map((s) => (
            <div key={s.storeId} className="flex items-center gap-2 py-1">
              <Store className="size-[18px] text-accent" />
              <span className="flex-1 text-ink">
                {s.storeName} ({s.lines.reduce((n, l) => n + l.quantity, 0)} منتج)
              </span>
              <span className="text-ink-2">{formatPrice(s.subtotal)}</span>
            </div>
          ))}
          <div className="my-2.5 border-t border-line" />
          <Row label="المنتجات" value={formatPrice(cart.subtotal)} />
          <Row
            label={quote.data ? `التوصيل (${quote.data.distanceKm.toFixed(1)} كم)` : 'التوصيل'}
            value={
              !selected ? (
                <span className="text-[13px] text-warning">اختار العنوان</span>
              ) : quote.data ? (
                formatPrice(quote.data.deliveryFee)
              ) : quote.isError ? (
                <span className="text-[13px] text-danger">مش قادر أحسبه</span>
              ) : (
                <span className="text-[13px] text-ink-3">بيتحسب…</span>
              )
            }
          />
          <div className="my-2.5 border-t border-line" />
          <Row label="الإجمالي" value={<span className="text-lg font-extrabold text-ink">{formatPrice(total)}</span>} />
          <Row
            label="الدفع"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="size-4 text-ink-2" />
                كاش عند الاستلام
              </span>
            }
          />
        </SoftCard>

        <SectionHeader title="ملاحظة للطلب" />
        <TextArea name="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: رن الجرس مرتين، أو اتصل قبل ما توصل" />
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-3">
          <Info className="size-4 shrink-0" />
          سعر التوصيل حسب المسافة من المحل لعنوانك. بعد ما تأكد، الإدارة هتراجع الطلب وتقدر تتابع الحالة من "طلباتي".
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-2xl">
          <Button block loading={placing} disabled={!selected || !cart.canCheckout || needsTime} onClick={place}>
            {needsTime ? 'اختار ميعاد التوصيل' : `تأكيد الطلب • ${formatPrice(total)}`}
          </Button>
        </div>
      </div>

      <AddressFormSheet open={formOpen} onClose={() => setFormOpen(false)} onSaved={(a) => setAddressId(a.id)} />
      <SlotsSheet
        storeId={store?.storeId}
        open={slotsOpen}
        selected={scheduledFor}
        onClose={() => setSlotsOpen(false)}
        onPick={(slot) => {
          setScheduledFor(slot);
          setSlotsOpen(false);
        }}
      />
    </div>
  );
}

function TimeOption({ selected, onClick, title, subtitle }: { selected: boolean; onClick: () => void; title: string; subtitle?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl p-3 text-start hover:bg-surface-alt">
      {selected ? <CircleDot className="size-6 text-brand" /> : <Circle className="size-6 text-ink-3" />}
      <span className="flex-1">
        <span className="block font-bold text-ink">{title}</span>
        {subtitle && <span className="block text-xs text-ink-2">{subtitle}</span>}
      </span>
      {subtitle !== undefined && <Clock className="size-5 text-brand" />}
    </button>
  );
}

/** The store's bookable delivery times, grouped by day. */
function SlotsSheet({
  storeId,
  open,
  selected,
  onClose,
  onPick,
}: {
  storeId: number | undefined;
  open: boolean;
  selected: string | null;
  onClose: () => void;
  onPick: (slot: string) => void;
}) {
  const slots = useScheduleSlots(open ? storeId : undefined);
  const days = new Map<string, string[]>();
  for (const s of slots.data ?? []) {
    const day = formatScheduledTime(s).split(' ')[0];
    days.set(day, [...(days.get(day) ?? []), s]);
  }
  const timeOf = (s: string) =>
    new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });

  return (
    <Sheet open={open} onClose={onClose} title="ميعاد التوصيل">
      {slots.isLoading ? (
        <Loading className="py-6" />
      ) : slots.isError ? (
        <ErrorView message={(slots.error as Error).message} onRetry={() => slots.refetch()} />
      ) : days.size === 0 ? (
        <EmptyView icon={CalendarClock} message="مفيش مواعيد متاحة دلوقتي" />
      ) : (
        <div className="flex flex-col gap-4">
          {[...days.entries()].map(([day, list]) => (
            <div key={day}>
              <p className="mb-2 font-extrabold text-ink-2">{day}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <Chip key={s} selected={s === selected} onClick={() => onPick(s)}>
                    {timeOf(s)}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center py-1 text-ink">
      <span className="text-ink-2">{label}</span>
      <span className="flex-1" />
      {value}
    </div>
  );
}

function AddressOption({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  const Icon = addressIcon(address.label);
  const details = addressDetails(address);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx('card flex w-full items-center gap-3 p-3.5 text-start transition-colors', selected ? 'border-brand' : 'hover:border-surface-high')}
    >
      <IconWell icon={Icon} size={42} filled={selected} />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-ink">{address.label}</span>
        <span className="line-clamp-2 text-[13px] text-ink-2">{[address.addressLine, details].filter(Boolean).join(' • ')}</span>
      </span>
      {selected ? <CircleDot className="size-6 text-brand" /> : <Circle className="size-6 text-ink-3" />}
    </button>
  );
}
