import { useState, type FormEvent } from 'react';

import { Button, InlineError, Price, Sheet, TextField } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/types';

export interface Charges {
  deliveryFee: number;
  /** e.g. 14 = 14%; charged on the products only, not the delivery fee. */
  taxPercent: number;
}

/** The delivery fee and the tax rate of an order, asked together, with the resulting total shown live. */
export function ChargesDialog({
  open,
  title,
  order,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  order: Order | undefined;
  onClose: () => void;
  onSubmit: (charges: Charges) => Promise<void> | void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && order && <ChargesForm key={order.id} order={order} onClose={onClose} onSubmit={onSubmit} />}
    </Sheet>
  );
}

function ChargesForm({ order, onClose, onSubmit }: { order: Order; onClose: () => void; onSubmit: (c: Charges) => Promise<void> | void }) {
  const [fee, setFee] = useState(order.deliveryFee == null ? '' : String(order.deliveryFee));
  const [tax, setTax] = useState(order.taxPercent > 0 ? String(order.taxPercent) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const feeValue = Number(fee) || 0;
  const taxValue = Number(tax) || 0;
  const taxAmount = (order.subtotal * taxValue) / 100;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const deliveryFee = Number(fee);
    if (fee.trim() === '' || Number.isNaN(deliveryFee) || deliveryFee < 0) return setError('اكتب سعر توصيل صحيح');
    const taxPercent = tax.trim() === '' ? 0 : Number(tax);
    if (Number.isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) return setError('الضريبة من 0 لـ 100%');
    setBusy(true);
    await onSubmit({ deliveryFee, taxPercent });
    setBusy(false);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        name="deliveryFee"
        type="number"
        inputMode="decimal"
        ltr
        autoFocus
        label="سعر التوصيل (ج.م)"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        end={<span className="text-sm">ج.م</span>}
      />
      <TextField
        name="taxPercent"
        type="number"
        inputMode="decimal"
        ltr
        label="الضريبة (%)"
        value={tax}
        onChange={(e) => setTax(e.target.value)}
        end={<span className="text-sm">%</span>}
      />
      <p className="-mt-1 text-xs text-ink-3">على سعر المنتجات بس. سيبها فاضية لو مفيش ضريبة.</p>
      <div className="flex items-center">
        <span className="text-ink-2">الإجمالي</span>
        <span className="flex-1" />
        <Price value={order.subtotal + feeValue + taxAmount} />
      </div>
      {taxValue > 0 && <p className="-mt-2 text-end text-xs text-ink-3">منها ضريبة {formatPrice(taxAmount)}</p>}
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}
