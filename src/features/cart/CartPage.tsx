import clsx from 'clsx';
import { AlertCircle, Info, Loader2, Minus, Plus, Sandwich, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { useCart, useCartMutations } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { AppImage, Button, EmptyView, ErrorView, Loading, Price, SoftCard, StatusChip } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { formatPrice } from '@/lib/format';
import { CART_ISSUE_MESSAGE } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';
import type { Cart, CartLine, CartStoreGroup } from '@/types';

export function CartPage() {
  const session = useAuth((s) => s.session);
  const cart = useCart();
  const { clear } = useCartMutations();
  const navigate = useNavigate();

  if (!session) {
    return <LoginRequired title="السلة" icon={ShoppingBag} message="سجّل دخول عشان تضيف منتجات للسلة وتطلب." />;
  }

  const value = cart.data;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <TabHeader
        title="السلة"
        actions={
          value && value.stores.length > 0 ? (
            <button
              type="button"
              className="text-sm font-bold text-danger px-2"
              onClick={async () => {
                if (await confirm('تفضّي السلة كلها؟', 'فضّي')) await runAction(() => clear.mutateAsync());
              }}
            >
              فضّي السلة
            </button>
          ) : null
        }
      />
      {cart.isLoading ? (
        <Loading />
      ) : cart.isError ? (
        <ErrorView message={(cart.error as Error).message} onRetry={() => cart.refetch()} />
      ) : !value || value.stores.length === 0 ? (
        <EmptyView
          icon={ShoppingBag}
          message={'السلة فاضية.\nضيف حاجات من أي محل وهتلاقيها هنا.'}
          action={
            <Button size="md" icon={<Store className="size-4" />} onClick={() => navigate('/')}>
              تصفح المحلات
            </Button>
          }
        />
      ) : (
        <div className="px-4 grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="flex flex-col gap-3.5">
            {value.stores.length > 1 && (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <Info className="size-4 text-ink-3" />
                طلبك من {value.stores.length} محلات، وهيوصلك في أوردر واحد.
              </p>
            )}
            {value.stores.map((g) => (
              <StoreGroupCard key={g.storeId} group={g} />
            ))}
          </div>
          <CheckoutBar cart={value} />
        </div>
      )}
    </div>
  );
}

function StoreGroupCard({ group }: { group: CartStoreGroup }) {
  return (
    <SoftCard className="overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <StoreAvatar type={group.storeType} logoUrl={group.logoUrl} size={40} />
        <h3 className="flex-1 truncate font-extrabold text-ink">{group.storeName}</h3>
        <StatusChip label={group.isOpen ? 'مفتوح' : 'مقفول'} color={group.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} />
      </div>
      {group.lines.map((line) => (
        <div key={line.id} className="border-t border-line mx-3.5">
          <LineTile line={line} />
        </div>
      ))}
      <div className="border-t border-line px-3.5 py-3">
        <div className="flex items-center text-ink-2">
          <span>إجمالي المحل</span>
          <span className="flex-1" />
          <span className="font-extrabold text-ink">{formatPrice(group.subtotal)}</span>
        </div>
        {!group.meetsMinimum && group.subtotal > 0 && (
          <div className="mt-2">
            <p className="flex items-start gap-1.5 text-xs text-ink-2">
              <AlertCircle className="size-4 shrink-0 text-warning" />
              ضيف {formatPrice(group.minOrderAmount - group.subtotal)} كمان من المحل ده عشان توصل لأقل طلب ({formatPrice(group.minOrderAmount)})
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-warning/20">
              <div className="h-full bg-warning" style={{ width: `${Math.min(100, (group.subtotal / group.minOrderAmount) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </SoftCard>
  );
}

function LineTile({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCartMutations();
  const busy = setQuantity.isPending || remove.isPending;
  const orderable = line.issue === 'None';
  const issue = CART_ISSUE_MESSAGE[line.issue];

  const dec = () =>
    runAction(() =>
      line.quantity > 1 ? setQuantity.mutateAsync({ itemId: line.id, quantity: line.quantity - 1, note: line.note }) : remove.mutateAsync(line.id),
    );
  const inc = () => runAction(() => setQuantity.mutateAsync({ itemId: line.id, quantity: line.quantity + 1, note: line.note }));

  return (
    <div className={clsx('flex items-start gap-3 py-3', !orderable && 'opacity-55')}>
      <div className="relative size-16 shrink-0 overflow-hidden rounded-[14px] bg-surface-alt grid place-items-center text-ink-3">
        <Sandwich className="size-6" />
        <AppImage url={line.imageUrl} fallback={null} className="absolute inset-0" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{line.productName}</p>
        {line.optionNames.length > 0 && <p className="text-xs text-ink-2">{line.optionNames.join(' • ')}</p>}
        {line.note && <p className="text-xs text-ink-3">📝 {line.note}</p>}
        {issue && (
          <div className="mt-1">
            <StatusChip label={issue} color="var(--color-danger)" />
          </div>
        )}
        <p className="mt-2 flex items-baseline gap-1.5">
          <Price value={line.lineTotal} />
          {line.quantity > 1 && <span className="text-[11px] text-ink-3">({formatPrice(line.unitPrice)} للواحدة)</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex h-9 items-center rounded-full bg-surface-alt">
          <button type="button" aria-label="أقل" disabled={busy} onClick={dec} className="grid h-9 w-[34px] place-items-center text-ink disabled:text-ink-3">
            {line.quantity > 1 ? <Minus className="size-[18px]" /> : <Trash2 className="size-[18px]" />}
          </button>
          <span className="w-[26px] text-center font-extrabold text-ink">
            {busy ? <Loader2 className="mx-auto size-3.5 animate-spin" /> : line.quantity}
          </span>
          <button type="button" aria-label="أكتر" disabled={busy || !orderable} onClick={inc} className="grid h-9 w-[34px] place-items-center text-ink disabled:text-ink-3">
            <Plus className="size-[18px]" />
          </button>
        </div>
        <button type="button" disabled={busy} onClick={() => runAction(() => remove.mutateAsync(line.id))} className="text-xs font-bold text-ink-3 px-2 py-1 hover:text-ink">
          شيل
        </button>
      </div>
    </div>
  );
}

function CheckoutBar({ cart }: { cart: Cart }) {
  const hasUnavailable = cart.stores.some((s) => s.lines.some((l) => l.issue !== 'None'));
  const blocker = hasUnavailable ? 'شيل المنتجات اللي مش متاحة عشان تكمّل' : !cart.canCheckout ? 'فيه محل لسه ماوصلش لأقل طلب' : null;

  return (
    <SoftCard className="p-4 lg:sticky lg:top-20">
      <div className="flex items-center text-ink-2">
        <span>{cart.itemsCount} منتج</span>
        <span className="flex-1" />
        <span className="me-2">المجموع</span>
        <Price value={cart.subtotal} className="text-lg" />
      </div>
      <p className="text-[11px] text-ink-3 mt-0.5">سعر التوصيل بيتحسب لما تأكد الطلب</p>
      {blocker && <p className="mt-1.5 text-xs text-warning font-semibold">{blocker}</p>}
      <Link to="/checkout" className={clsx(!cart.canCheckout && 'pointer-events-none')}>
        <Button block className="mt-3" disabled={!cart.canCheckout}>
          كمّل الطلب
        </Button>
      </Link>
    </SoftCard>
  );
}
