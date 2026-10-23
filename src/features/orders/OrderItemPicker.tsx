import { ArrowRight, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { useMenu } from '@/api/queries';
import { Button, Chip, ErrorView, Loading, Sheet, TextField } from '@/components/ui';
import { applyDiscount, formatPercent, formatPrice } from '@/lib/format';
import type { Product, ProductOptionGroup } from '@/types';

/** A product chosen to add to an existing order, with its options, quantity and note. */
export interface PickedOrderItem {
  productId: number;
  optionIds: number[];
  quantity: number;
  note: string | null;
}

/** Mirrors the backend price rules so the button shows the price or what is missing. The discount covers base + extras. */
function priceFor(product: Product, selected: Set<number>): { price: number; error: string | null } {
  let total = product.price;
  for (const g of product.optionGroups) {
    const chosen = g.options.filter((o) => selected.has(o.id));
    if (chosen.length < g.minSelections) return { price: applyDiscount(total, product.discountPercent), error: `اختار ${g.name}` };
    if (chosen.length > g.maxSelections) return { price: applyDiscount(total, product.discountPercent), error: `${g.name}: لحد ${g.maxSelections} بس` };
    total += chosen.reduce((sum, o) => sum + o.extraPrice, 0);
  }
  return { price: applyDiscount(total, product.discountPercent), error: null };
}

const rule = (g: ProductOptionGroup) =>
  g.minSelections === g.maxSelections
    ? `اختار ${g.minSelections}`
    : g.minSelections === 0
      ? `اختياري • لحد ${g.maxSelections}`
      : `من ${g.minSelections} لـ ${g.maxSelections}`;

/**
 * The store's menu to pick a product for an order (e.g. the customer called to swap one):
 * the product, then its sizes / add-ons, the quantity and a note.
 */
export function OrderItemPicker({
  storeId,
  open,
  onClose,
  onPick,
}: {
  storeId: number;
  open: boolean;
  onClose: () => void;
  onPick: (item: PickedOrderItem) => void;
}) {
  const menu = useMenu(storeId);
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  function choose(p: Product) {
    setProduct(p);
    // Pre-pick the first choice of each single-choice required group (e.g. the default size).
    setSelected(
      new Set(
        p.optionGroups
          .filter((g) => g.minSelections === 1 && g.maxSelections === 1)
          .flatMap((g) => g.options.filter((o) => o.isAvailable).slice(0, 1).map((o) => o.id)),
      ),
    );
    setQuantity(1);
    setNote('');
  }

  function toggle(g: ProductOptionGroup, optionId: number) {
    const next = new Set(selected);
    if (g.maxSelections === 1) {
      g.options.forEach((o) => next.delete(o.id));
      next.add(optionId);
    } else if (next.has(optionId)) {
      next.delete(optionId);
    } else if (g.options.filter((o) => next.has(o.id)).length < g.maxSelections) {
      next.add(optionId);
    }
    setSelected(next);
  }

  function close() {
    setProduct(null);
    onClose();
  }

  const pricing = product ? priceFor(product, selected) : null;

  return (
    <Sheet
      open={open}
      onClose={close}
      title={product ? product.name : 'اختار المنتج'}
      footer={
        product && pricing ? (
          <Button
            className="w-full"
            disabled={pricing.error !== null}
            onClick={() => {
              onPick({ productId: product.id, optionIds: [...selected], quantity, note: note.trim() || null });
              setProduct(null);
            }}
          >
            {pricing.error ?? `أضف للأوردر • ${formatPrice(pricing.price * quantity)}`}
          </Button>
        ) : undefined
      }
    >
      {!product ? (
        menu.isLoading ? (
          <Loading />
        ) : menu.isError || !menu.data ? (
          <ErrorView message={(menu.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => menu.refetch()} />
        ) : (
          <div className="flex flex-col">
            {menu.data.categories
              .filter((c) => c.products.length > 0)
              .map((c) => (
                <div key={c.id}>
                  <p className={c.parentId ? 'px-5 pt-3 pb-1 font-bold text-ink-2' : 'px-2 pt-4 pb-1 font-extrabold text-ink'}>{c.name}</p>
                  {c.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.isAvailable}
                      onClick={() => choose(p)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-surface-alt disabled:opacity-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-ink">{p.name}</span>
                        <span className="block text-xs text-ink-2">
                          {p.isAvailable
                            ? [
                                formatPrice(applyDiscount(p.price, p.discountPercent)),
                                p.discountPercent > 0 && `خصم ${formatPercent(p.discountPercent)}`,
                                p.optionGroups.length > 0 && 'ليه اختيارات',
                              ]
                                .filter(Boolean)
                                .join(' • ')
                            : 'مش متاح'}
                        </span>
                      </span>
                      <ChevronLeft className="size-4 text-ink-3" />
                    </button>
                  ))}
                </div>
              ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => setProduct(null)} className="inline-flex items-center gap-1 self-start text-sm font-bold text-brand-ink">
            <ArrowRight className="size-4" /> كل المنتجات
          </button>
          {product.optionGroups.map((g) => (
            <div key={g.id}>
              <p className="mb-2 font-extrabold text-ink">
                {g.name} <span className="text-xs font-bold text-ink-3">• {rule(g)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <Chip
                    key={o.id}
                    selected={selected.has(o.id)}
                    onClick={o.isAvailable ? () => toggle(g, o.id) : undefined}
                    className={o.isAvailable ? undefined : 'opacity-50'}
                  >
                    {o.extraPrice > 0 ? `${o.name} +${formatPrice(o.extraPrice)}` : o.name}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="flex-1 font-extrabold text-ink">الكمية</span>
            <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)} className="grid size-9 place-items-center rounded-full bg-surface-alt disabled:opacity-40">
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-lg font-extrabold">{quantity}</span>
            <button type="button" disabled={quantity >= 50} onClick={() => setQuantity((q) => q + 1)} className="grid size-9 place-items-center rounded-full bg-surface-alt disabled:opacity-40">
              <Plus className="size-4" />
            </button>
          </div>
          <TextField label="ملاحظة (اختياري)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Sheet>
  );
}

/** − quantity + for editing an order line (1 to 50). */
export function QuantityStepper({ quantity, onChange, disabled }: { quantity: number; onChange: (q: number) => void; disabled?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-alt px-1 py-0.5">
      <button type="button" disabled={disabled || quantity <= 1} onClick={() => onChange(quantity - 1)} className="grid size-6 place-items-center text-brand-ink disabled:text-ink-3">
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-4 text-center font-extrabold text-ink">{quantity}</span>
      <button type="button" disabled={disabled || quantity >= 50} onClick={() => onChange(quantity + 1)} className="grid size-6 place-items-center text-brand-ink disabled:text-ink-3">
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}
