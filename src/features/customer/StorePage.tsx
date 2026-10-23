import clsx from 'clsx';
import { BookOpen, Clock, LayoutGrid, Plus, Sandwich, Search, SearchX, ShoppingBag, Star, UtensilsCrossed, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useCart, useMenu, useStore } from '@/api/queries';
import { AppImage, EmptyView, ErrorView, Loading, SectionHeader } from '@/components/ui';
import { discountLabel, formatPrice, formatStoreHours } from '@/lib/format';
import { localized } from '@/lib/localized';
import { categoryOf } from '@/lib/meta';
import type { Menu, MenuCategory, Product, Store } from '@/types';

import { ProductSheet } from './ProductSheet';
import { ArcPicker, DiscountedPrice, SHOWCASE_GRID, ShowcaseAction, ShowcaseCard, productPrices } from './Showcase';
import { StoreAvatar, StoreStatusChip } from './StoreBits';

/** A store's menu: header, search, info chips, featured products, category arc and the product cards. */
export function StorePage() {
  const id = Number(useParams().id);
  const store = useStore(id);
  const menu = useMenu(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');

  const retry = () => {
    store.refetch();
    menu.refetch();
  };

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-5xl px-4">
        {store.isLoading ? (
          <Loading />
        ) : store.isError || !store.data ? (
          <ErrorView message={(store.error as Error)?.message ?? 'حصل خطأ'} onRetry={retry} />
        ) : (
          <>
            <TopBar store={store.data} />
            <SearchField value={query} onChange={setQuery} />
            <StoreInfo store={store.data} />
            {menu.isLoading ? (
              <Loading />
            ) : menu.isError ? (
              <ErrorView message={(menu.error as Error).message} onRetry={retry} />
            ) : menu.data!.categories.length === 0 ? (
              <EmptyView icon={BookOpen} message="المنيو لسه فاضي" />
            ) : (
              <MenuBody menu={menu.data!} store={store.data} query={query.trim().toLowerCase()} onOpen={setProduct} />
            )}
            <ProductSheet product={product} store={store.data} onClose={() => setProduct(null)} />
          </>
        )}
      </div>
      <ViewCartBar />
    </div>
  );
}

function MenuBody({ menu, store, query, onOpen }: { menu: Menu; store: Store; query: string; onOpen: (p: Product) => void }) {
  // Selected main category; null shows all.
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const name = (c: MenuCategory) => localized(c.name, c.nameEn, c.nameRu);
  const mains = menu.categories.filter((c) => c.parentId === null);
  const withSubs = (main: MenuCategory) => [main, ...menu.categories.filter((c) => c.parentId === main.id)];
  const grid = (products: Product[]) => (
    <div className={SHOWCASE_GRID}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} store={store} onOpen={() => onOpen(p)} />
      ))}
    </div>
  );

  // Search: one grid of matches across the whole menu.
  if (query) {
    const matches = menu.categories.flatMap((c) =>
      c.products.filter((p) => [p.name, p.nameEn, p.nameRu, p.description].some((t) => t?.toLowerCase().includes(query))),
    );
    return (
      <section>
        <SectionHeader title="نتايج البحث" pill={`${matches.length} صنف`} />
        {matches.length === 0 ? <EmptyView icon={SearchX} message="مفيش أصناف بالاسم ده" /> : grid(matches)}
      </section>
    );
  }

  const featured = featuredProducts(menu);
  const selected = mains.findIndex((c) => c.id === categoryId);
  const shown = categoryId === null ? mains : mains.filter((c) => c.id === categoryId);

  return (
    <>
      {featured.length > 0 && <FeaturedCarousel products={featured} onOpen={onOpen} />}
      {mains.length > 1 && (
        <div className="mt-3.5">
          <ArcPicker
            key={mains.length}
            label="أقسام المنيو"
            items={[
              { key: 'all', label: 'الكل', icon: LayoutGrid, color: 'var(--color-brand)' },
              ...mains.map((c) => ({
                key: `c${c.id}`,
                label: name(c),
                icon: UtensilsCrossed,
                imageUrl: withSubs(c)
                  .flatMap((x) => x.products)
                  .find((p) => p.imageUrl)?.imageUrl,
              })),
            ]}
            selectedIndex={selected + 1}
            onSelect={(i) => setCategoryId(i === 0 ? null : mains[i - 1].id)}
          />
        </div>
      )}
      {shown.map((main) =>
        // Sub-categories follow their main category as smaller headings.
        withSubs(main).map((category) => (
          <section key={category.id}>
            {category.parentId !== null ? (
              <h3 className="px-3 pt-2 pb-2.5 font-extrabold text-ink-2">{name(category)}</h3>
            ) : (
              <SectionHeader title={name(category)} pill={`${withSubs(category).reduce((n, c) => n + c.products.length, 0)} أصناف`} />
            )}
            {grid(category.products)}
          </section>
        )),
      )}
    </>
  );
}

/** Up to five available products for the carousel, those with a photo first. */
function featuredProducts(menu: Menu): Product[] {
  const available = menu.categories.flatMap((c) => c.products.filter((p) => p.isAvailable));
  const withImage = available.filter((p) => p.imageUrl);
  return (withImage.length > 0 ? withImage : available).slice(0, 5);
}

function TopBar({ store }: { store: Store }) {
  const navigate = useNavigate();
  const meta = categoryOf(store);
  return (
    <div className="flex items-center gap-2.5 pt-3 pb-3 md:pt-5">
      <button
        type="button"
        aria-label="رجوع"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-alt"
      >
        <svg viewBox="0 0 24 24" className="size-6 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="shrink-0 rounded-full border-2 border-brand p-[2.5px]">
        <span className="block overflow-hidden rounded-full">
          <StoreAvatar category={store} logoUrl={store.logoUrl} size={44} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black text-ink md:text-lg">{localized(store.name, store.nameEn, store.nameRu)}</h1>
        <p className="truncate text-xs text-ink-3">{meta.label}</p>
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[15px] font-extrabold text-ink">أهلاً بيك 👋</p>
        <p className="text-[11.5px] text-ink-2">اختار وجبتك المفضلة</p>
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className="flex h-[52px] items-center gap-2 rounded-[28px] border border-line bg-surface ps-4 pe-2 focus-within:border-brand"
    >
      <Search className="size-5 shrink-0 text-ink-2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="دوّر على وجبتك المفضلة"
        aria-label="بحث في المنيو"
        className="min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
      />
      {value && (
        <button type="button" aria-label="امسح البحث" onClick={() => onChange('')} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-alt hover:text-ink">
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

/** Description, then open state, hours, minimum order and rating as one row of chips. */
function StoreInfo({ store }: { store: Store }) {
  const hours = formatStoreHours(store.opensAt, store.closesAt);
  return (
    <div className="pt-3.5">
      {store.description && (
        <p className="mb-2.5 line-clamp-2 text-[13px] text-ink-2">{localized(store.description, store.descriptionEn, store.descriptionRu)}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StoreStatusChip store={store} className="py-1" />
        {hours && <InfoPill icon={Clock}>{hours}</InfoPill>}
        {store.minOrderAmount > 0 && <InfoPill icon={ShoppingBag}>أقل طلب {formatPrice(store.minOrderAmount)}</InfoPill>}
        <InfoPill icon={Star} iconClassName="text-warning fill-warning" to={`/store/${store.id}/ratings`}>
          {store.ratingsCount > 0 ? `${store.ratingAverage.toFixed(1)} (${store.ratingsCount})` : 'لسه مفيش تقييمات'}
        </InfoPill>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, iconClassName = 'text-ink-3', to, children }: { icon: LucideIcon; iconClassName?: string; to?: string; children: ReactNode }) {
  const className = 'inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2';
  const body = (
    <>
      <Icon className={clsx('size-3.5 shrink-0', iconClassName)} />
      {children}
    </>
  );
  return to ? (
    <Link to={to} className={clsx(className, 'hover:border-surface-high hover:text-ink')}>
      {body}
    </Link>
  ) : (
    <span className={className}>{body}</span>
  );
}

/** Brand-gradient cards of a few products, one per slide, with dots under them. */
function FeaturedCarousel({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setPage(Math.min(products.length - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [products.length]);

  const goTo = (i: number) => {
    const el = ref.current;
    // Right-to-left: later slides are at negative scroll positions.
    el?.scrollTo({ left: -i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section className="mt-[18px]">
      <div ref={ref} className="slider-track">
        {products.map((p) => (
          <div key={p.id} className="flex-[0_0_100%] snap-center">
            <FeaturedCard product={p} onOpen={() => onOpen(p)} />
          </div>
        ))}
      </div>
      {products.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => goTo(i)}
              className={clsx('h-[7px] rounded-full transition-all duration-300', i === page ? 'w-[18px] bg-brand' : 'w-[7px] bg-surface-high')}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FeaturedCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { price, full } = productPrices(product);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-[200px] w-full overflow-hidden rounded-[26px] bg-gradient-to-l from-brand-light via-brand to-brand-dark text-start text-white md:h-[230px]"
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center ps-[18px] pe-2 py-4 md:ps-8">
        <span className="text-xs font-bold text-white/75">مميز عندنا</span>
        <span className="mt-1 truncate text-[19px] font-black leading-tight md:text-2xl">{localized(product.name, product.nameEn, product.nameRu)}</span>
        <DiscountedPrice
          value={price}
          full={full}
          prefix={product.optionGroups.length > 0 ? 'من' : undefined}
          className="mt-1 text-lg"
          priceClassName="!text-highlight"
          strikeClassName="text-white/70"
        />
        <span className="mt-2.5 self-start rounded-full bg-white px-[18px] py-2 text-[13px] font-extrabold text-brand-dark shadow-sm">اطلب دلوقتي</span>
      </span>
      <span className="relative grid w-[150px] shrink-0 place-items-center md:w-[300px]">
        <UtensilsCrossed className="size-16 text-white/35" />
        <AppImage url={product.imageUrl} alt={product.name} fallback={null} className="absolute inset-0" />
      </span>
    </button>
  );
}

function ProductCard({ product, store, onOpen }: { product: Product; store: Store; onOpen: () => void }) {
  const hasOptions = product.optionGroups.length > 0;
  const meta = categoryOf(store);
  const { price, full } = productPrices(product);
  // Sold out > discount > options count.
  const badge = !product.isAvailable
    ? 'خلصان'
    : product.discountPercent > 0
      ? discountLabel(product.discountPercent)
      : hasOptions
        ? `${product.optionGroups.length} اختيارات`
        : null;
  return (
    <ShowcaseCard
      onClick={product.isAvailable ? onOpen : undefined}
      dimmed={!product.isAvailable}
      image={
        <div className="relative grid size-full place-items-center" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
          <Sandwich className="size-11" style={{ color: meta.color, opacity: 0.7 }} />
          <AppImage url={product.imageUrl} alt={product.name} fallback={null} className="absolute inset-0" />
        </div>
      }
      badge={badge}
      badgeClassName={!product.isAvailable ? 'bg-danger text-white' : product.discountPercent > 0 ? 'bg-brand text-white' : undefined}
      title={localized(product.name, product.nameEn, product.nameRu)}
      subtitle={product.description ? localized(product.description, product.descriptionEn, product.descriptionRu) : null}
      footer={<DiscountedPrice value={price} full={full} prefix={hasOptions ? 'من' : undefined} className="text-[15px]" />}
      action={product.isAvailable ? <ShowcaseAction icon={Plus} /> : undefined}
    />
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
