import clsx from 'clsx';
import { BookOpen, ChevronLeft, Plus, Sandwich } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { useCart, useMenu, useStore } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { AppImage, EmptyView, ErrorView, Loading, Price, SectionHeader, SoftCard, StatusChip } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { localized } from '@/lib/localized';
import { categoryOf } from '@/lib/meta';
import { RatingBadge } from '@/features/ratings/Ratings';
import type { Product, Store } from '@/types';

import { ProductSheet } from './ProductSheet';
import { StoreAvatar, canTakeOrders } from './StoreBits';

export function StorePage() {
  const id = Number(useParams().id);
  const store = useStore(id);
  const menu = useMenu(id);
  const [product, setProduct] = useState<Product | null>(null);

  const retry = () => {
    store.refetch();
    menu.refetch();
  };

  return (
    <div className="pb-24">
      <PageHeader title={store.data ? localized(store.data.name, store.data.nameEn, store.data.nameRu) : ''} />
      <div className="px-4 mx-auto max-w-3xl">
        {store.isLoading ? (
          <Loading />
        ) : store.isError || !store.data ? (
          <ErrorView message={(store.error as Error)?.message ?? 'حصل خطأ'} onRetry={retry} />
        ) : (
          <>
            <StoreHeader store={store.data} />
            {menu.isLoading ? (
              <Loading />
            ) : menu.isError ? (
              <ErrorView message={(menu.error as Error).message} onRetry={retry} />
            ) : menu.data!.categories.length === 0 ? (
              <EmptyView icon={BookOpen} message="المنيو لسه فاضي" />
            ) : (
              // Sub-categories follow their main category as smaller headings.
              menu.data!.categories.map((category) => (
                <section key={category.id}>
                  {category.parentId !== null ? (
                    <h3 className="px-3 pt-3 pb-2 font-extrabold text-ink-2">{localized(category.name, category.nameEn, category.nameRu)}</h3>
                  ) : (
                    <SectionHeader
                      title={localized(category.name, category.nameEn, category.nameRu)}
                      pill={`${category.products.length + menu.data!.categories.filter((c) => c.parentId === category.id).reduce((n, c) => n + c.products.length, 0)}`}
                      className="px-1"
                    />
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {category.products.map((p) => (
                      <ProductTile key={p.id} product={p} store={store.data!} onOpen={() => p.isAvailable && setProduct(p)} />
                    ))}
                  </div>
                </section>
              ))
            )}
            <ProductSheet product={product} store={store.data} onClose={() => setProduct(null)} />
          </>
        )}
      </div>
      <ViewCartBar />
    </div>
  );
}

function StoreHeader({ store }: { store: Store }) {
  const meta = categoryOf(store);
  return (
    <>
      {store.coverUrl && (
        <div className="mb-3 aspect-[2.4] overflow-hidden rounded-card">
          <AppImage url={store.coverUrl} alt="" fallback={null} className="size-full" />
        </div>
      )}
      <SoftCard className="p-4 flex items-center gap-3.5">
        <StoreAvatar category={store} logoUrl={store.logoUrl} size={68} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-extrabold text-ink">{localized(store.name, store.nameEn, store.nameRu)}</h2>
            <StatusChip
              label={store.isOpen ? 'مفتوح' : canTakeOrders(store) ? 'مقفول • اطلب لبعدين' : 'مقفول'}
              color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'}
            />
          </div>
          {store.description && (
            <p className="line-clamp-2 text-[13px] text-ink-2">{localized(store.description, store.descriptionEn, store.descriptionRu)}</p>
          )}
          <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-3 truncate">
            <meta.Icon className="size-3.5" style={{ color: meta.color }} />
            {meta.label} • {store.address}
          </p>
          {store.minOrderAmount > 0 && (
            <p className="mt-1 text-xs text-ink-2">
              أقل طلب <Price value={store.minOrderAmount} className="text-xs" />
            </p>
          )}
          <Link to={`/store/${store.id}/ratings`} className="mt-1.5 inline-flex items-center gap-1 text-xs hover:underline">
            {store.ratingsCount > 0 ? (
              <RatingBadge average={store.ratingAverage} count={store.ratingsCount} />
            ) : (
              <span className="text-ink-3">لسه مفيش تقييمات</span>
            )}
            <ChevronLeft className="size-4 text-ink-3" />
          </Link>
        </div>
      </SoftCard>
    </>
  );
}

function ProductTile({ product, store, onOpen }: { product: Product; store: Store; onOpen: () => void }) {
  const hasOptions = product.optionGroups.length > 0;
  const meta = categoryOf(store);
  return (
    <SoftCard as="button" onClick={onOpen} className={clsx('p-2.5 flex items-center gap-3', !product.isAvailable && 'opacity-55 cursor-default')}>
      <div className="relative size-[78px] shrink-0 overflow-hidden rounded-2xl grid place-items-center" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
        <Sandwich className="size-7" style={{ color: meta.color, opacity: 0.7 }} />
        <AppImage url={product.imageUrl} alt={product.name} fallback={null} className="absolute inset-0" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-extrabold text-ink">{localized(product.name, product.nameEn, product.nameRu)}</h3>
        {product.description && (
          <p className="line-clamp-2 text-[12.5px] text-ink-2">{localized(product.description, product.descriptionEn, product.descriptionRu)}</p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Price value={product.price} prefix={hasOptions ? 'من' : undefined} />
          {hasOptions && <span className="text-[11px] font-semibold text-ink-3">{product.optionGroups.length} اختيارات</span>}
          {!product.isAvailable && <StatusChip label="خلصان" color="var(--color-danger)" />}
        </div>
      </div>
      {product.isAvailable && (
        <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand">
          <Plus className="size-5" />
        </span>
      )}
    </SoftCard>
  );
}

/** Bottom bar on store screens: item count + total, tap to open the cart. Hidden when empty. */
function ViewCartBar() {
  const cart = useCart();
  const value = cart.data;
  if (!value || value.stores.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <Link to="/cart" className="mx-auto flex max-w-3xl items-center gap-3 rounded-card bg-brand px-4 py-3.5 text-white shadow-brand hover:bg-brand-light">
        <span className="rounded-xl bg-white/20 px-2.5 py-1 font-extrabold">{value.itemsCount}</span>
        <span className="flex-1 font-extrabold">عرض السلة</span>
        <span className="font-extrabold">{formatPrice(value.subtotal)}</span>
      </Link>
    </div>
  );
}
