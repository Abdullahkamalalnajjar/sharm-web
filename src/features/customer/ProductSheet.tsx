import clsx from 'clsx';
import { Check, Circle, CircleDot, Minus, Plus, Square, SquareCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useCartMutations } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppImage, Button, InlineError, Price, Sheet, StatusChip } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { isSignedIn } from '@/store/auth';
import { useLoginPrompt, useToasts } from '@/store/ui';
import type { Product, ProductOptionGroup, Store } from '@/types';

/** Mirrors the backend price rules so the UI can show the price live and explain what is missing. */
export function priceFor(product: Product, selected: Set<number>): { price: number; error: string | null } {
  let total = product.price;
  for (const group of product.optionGroups) {
    const chosen = group.options.filter((o) => selected.has(o.id));
    if (chosen.length < group.minSelections) return { price: total, error: `اختار ${group.name}` };
    if (chosen.length > group.maxSelections) return { price: total, error: `${group.name}: لحد ${group.maxSelections} بس` };
    total += chosen.reduce((sum, o) => sum + o.extraPrice, 0);
  }
  return { price: total, error: null };
}

export function groupRule(g: ProductOptionGroup): string {
  if (g.minSelections === g.maxSelections) return `اختار ${g.minSelections}`;
  if (g.minSelections === 0) return `اختياري • لحد ${g.maxSelections}`;
  return `من ${g.minSelections} لـ ${g.maxSelections}`;
}

function initialSelection(product: Product): Set<number> {
  const set = new Set<number>();
  for (const group of product.optionGroups) {
    if (group.isRequired && group.maxSelections === 1) {
      const first = group.options.find((o) => o.isAvailable);
      if (first) set.add(first.id);
    }
  }
  return set;
}

export function ProductSheet({ product, store, onClose }: { product: Product | null; store: Store; onClose: () => void }) {
  return (
    <Sheet open={product !== null} onClose={onClose}>
      {product && <ProductSheetBody key={product.id} product={product} store={store} onClose={onClose} />}
    </Sheet>
  );
}

function ProductSheetBody({ product, store, onClose }: { product: Product; store: Store; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { add } = useCartMutations();
  const openLogin = useLoginPrompt((s) => s.open);
  const toast = useToasts((s) => s.show);
  const navigate = useNavigate();

  const pricing = priceFor(product, selected);
  const total = pricing.price * quantity;
  const canAdd = pricing.error === null && store.canAcceptOrders;

  function toggle(group: ProductOptionGroup, optionId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (group.maxSelections === 1) {
        group.options.forEach((o) => next.delete(o.id));
        next.add(optionId);
        return next;
      }
      if (next.has(optionId)) next.delete(optionId);
      else if (group.options.filter((o) => next.has(o.id)).length < group.maxSelections) next.add(optionId);
      else toast(`${group.name}: لحد ${group.maxSelections} بس`, { isError: true });
      return next;
    });
  }

  async function addToCart() {
    if (!isSignedIn()) {
      onClose();
      openLogin(`عشان تضيف "${product.name}" للسلة وتطلب.`);
      return;
    }
    setError(null);
    try {
      await add.mutateAsync({ productId: product.id, optionIds: [...selected], quantity });
      onClose();
      toast(`${product.name} اتضاف للسلة`, { action: { label: 'عرض السلة', onClick: () => navigate('/cart') } });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="-mx-5 -my-4 flex flex-col max-h-[inherit]">
      <div className="overflow-y-auto px-5 pt-3 pb-4">
        {product.imageUrl && (
          <div className="mb-4 aspect-video overflow-hidden rounded-card bg-surface-alt">
            <AppImage url={product.imageUrl} alt={product.name} fallback={null} />
          </div>
        )}
        <h3 className="text-[22px] font-extrabold text-ink">{product.name}</h3>
        {product.description && <p className="text-ink-2">{product.description}</p>}
        <Price value={product.price} className="mt-1.5 block text-lg" />

        {product.optionGroups.map((group) => (
          <div key={group.id} className="mt-5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-ink">{group.name}</span>
              <StatusChip label={group.isRequired ? 'مطلوب' : 'اختياري'} color={group.isRequired ? 'var(--color-brand)' : 'var(--color-ink-3)'} />
              <span className="flex-1" />
              <span className="text-xs text-ink-3">{groupRule(group)}</span>
            </div>
            {group.options.map((option) => {
              const on = selected.has(option.id);
              const single = group.maxSelections === 1;
              const Icon = single ? (on ? CircleDot : Circle) : on ? SquareCheck : Square;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.isAvailable}
                  onClick={() => toggle(group, option.id)}
                  className={clsx('flex w-full items-center gap-3 py-2.5 text-start', !option.isAvailable && 'opacity-40')}
                >
                  <Icon className={clsx('size-6', on ? 'text-brand' : 'text-ink-3')} />
                  <span className={clsx('flex-1', on ? 'font-bold' : 'font-medium')}>
                    {option.isAvailable ? option.name : `${option.name} (خلصان)`}
                  </span>
                  {option.extraPrice > 0 && <Price value={option.extraPrice} prefix="+" className="text-[13px]" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        {!store.canAcceptOrders ? (
          <p className="mb-2 text-sm text-danger font-semibold">المحل مقفول دلوقتي</p>
        ) : pricing.error ? (
          <p className="mb-2 text-sm text-danger font-semibold">{pricing.error}</p>
        ) : error ? (
          <div className="mb-2.5">
            <InlineError message={error} />
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="flex h-[54px] items-center rounded-full bg-surface-alt">
            <button type="button" aria-label="أقل" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)} className="grid size-12 place-items-center disabled:opacity-40">
              <Minus className="size-5" />
            </button>
            <span className="w-6 text-center font-extrabold text-ink">{quantity}</span>
            <button type="button" aria-label="أكتر" onClick={() => setQuantity((q) => q + 1)} className="grid size-12 place-items-center">
              <Plus className="size-5" />
            </button>
          </div>
          <Button block disabled={!canAdd} loading={add.isPending} onClick={addToCart} icon={<Check className="size-5" />}>
            إضافة للسلة • {formatPrice(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
