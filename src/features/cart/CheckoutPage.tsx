import clsx from 'clsx';
import { Banknote, Circle, CircleDot, Info, MapPinPlus, Store } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { ordersApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAddresses, useCart } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, IconWell, Loading, SectionHeader, SoftCard, TextArea } from '@/components/ui';
import { AddressFormSheet } from '@/features/addresses/AddressForm';
import { addressIcon } from '@/features/customer/DeliveryPicker';
import { addressDetails, formatPrice } from '@/lib/format';
import { showMessage } from '@/store/ui';
import { EMPTY_CART, type Address } from '@/types';

/** Choose the delivery address, add a note, and place the order (cash on delivery). */
export function CheckoutPage() {
  const addresses = useAddresses();
  const cart = useCart().data ?? EMPTY_CART;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const list = addresses.data ?? [];
  const selected = list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0];

  async function place() {
    if (!selected) return;
    setPlacing(true);
    try {
      const order = await ordersApi.place(selected.id, note.trim() || null);
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
          <Row label="التوصيل" value={<span className="text-[13px] text-warning">هيتحدد من الإدارة</span>} />
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
          بعد ما تأكد، الإدارة هتراجع الطلب وتحدد سعر التوصيل، وهتقدر تتابع الحالة من "طلباتي".
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-2xl">
          <Button block loading={placing} disabled={!selected || !cart.canCheckout} onClick={place}>
            تأكيد الطلب • {formatPrice(cart.subtotal)}
          </Button>
        </div>
      </div>

      <AddressFormSheet open={formOpen} onClose={() => setFormOpen(false)} onSaved={(a) => setAddressId(a.id)} />
    </div>
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
