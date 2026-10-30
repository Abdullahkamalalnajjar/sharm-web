import { CalendarClock, Gift, Package, Sandwich, Store } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useOffer } from '@/api/queries';
import { AppImage, EmptyView, ErrorView, Loading } from '@/components/ui';
import { discountLabel, formatOrderDate } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import type { OfferDetails, OfferProduct } from '@/types';

import { SectionHead } from './HomeSections';
import { DiscountedPrice, SHOWCASE_GRID, ShowcaseAction, ShowcaseCard, productPrices } from './Showcase';
import { StoreCard } from './StoreBits';

/** One daily offer (from the home tiles): its picture, title, end date, stores and products. Guests too. */
export function OfferPage() {
  const id = Number(useParams().id);
  const offer = useOffer(id);

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-5xl px-4">
        {offer.isLoading ? (
          <Loading />
        ) : offer.isError || !offer.data ? (
          offer.error instanceof ApiError && offer.error.statusCode === 404 ? (
            <>
              <BackButton />
              <EmptyView icon={Gift} message={t('العرض ده خلص أو مبقاش متاح')} />
            </>
          ) : (
            <ErrorView message={(offer.error as Error | null)?.message ?? t('حصل خطأ')} onRetry={() => offer.refetch()} />
          )
        ) : (
          <OfferBody offer={offer.data} />
        )}
      </div>
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label={t('رجوع')}
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className="mt-3 grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-alt md:mt-5"
    >
      <svg viewBox="0 0 24 24" className="size-6 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

function OfferBody({ offer }: { offer: OfferDetails }) {
  const title = localized(offer.title, offer.titleEn, offer.titleRu);
  return (
    <>
      <BackButton />

      {/* The picture over a blurred copy of itself, so a square picture fills a wide header. */}
      <div className="relative mt-3 overflow-hidden rounded-[26px] border border-line bg-surface-alt">
        <div className="absolute inset-0 scale-110 opacity-60 blur-2xl" aria-hidden="true">
          <AppImage url={offer.imageUrl} fallback={null} />
        </div>
        <div className="relative grid place-items-center px-4 py-5 md:py-7">
          <span className="block size-[180px] overflow-hidden rounded-[30px] border border-white/70 bg-surface shadow-[0_6px_20px_rgb(0_0_0/0.25)] md:size-[220px]">
            <AppImage url={offer.imageUrl} alt={title} fallback={<Gift className="m-auto size-16 text-brand" />} />
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h1 className="text-[22px] font-black leading-tight text-ink md:text-[26px]">{title}</h1>
        {offer.storeName && offer.storeId !== null && <p className="mt-1 text-sm text-ink-2">{offer.storeName}</p>}
        {offer.endsAtUtc && (
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[13px] font-extrabold text-[#2b1d00]">
            <CalendarClock className="size-4" />
            {t('ينتهي {date}', { date: formatOrderDate(offer.endsAtUtc) })}
          </span>
        )}
      </div>

      {offer.stores.length > 0 && (
        <section className="mt-7">
          <SectionHead title={tIn('title', 'المحلات')} icon={Store} />
          <div className={SHOWCASE_GRID}>
            {offer.stores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        </section>
      )}

      {offer.products.length > 0 && (
        <section className="mt-7">
          <SectionHead title={t('منتجات العرض')} icon={Package} />
          <div className={SHOWCASE_GRID}>
            {offer.products.map((p) => (
              <OfferProductCard key={p.product.id} item={p} />
            ))}
          </div>
        </section>
      )}

      {offer.stores.length === 0 && offer.products.length === 0 && <EmptyView icon={Gift} message={t('العرض ده خلص أو مبقاش متاح')} />}
    </>
  );
}

/** The store menu's product card, with the store's name; opens the store's page. */
function OfferProductCard({ item }: { item: OfferProduct }) {
  const { product } = item;
  const hasOptions = product.optionGroups.length > 0;
  const { price, full } = productPrices(product);
  const badge = !product.isAvailable
    ? t('خلصان')
    : product.discountPercent > 0
      ? discountLabel(product.discountPercent)
      : hasOptions
        ? t('{n} اختيارات', { n: product.optionGroups.length })
        : null;
  return (
    <ShowcaseCard
      to={product.isAvailable ? `/store/${item.storeId}` : undefined}
      dimmed={!product.isAvailable}
      image={
        <div className="relative grid size-full place-items-center bg-brand/10">
          <Sandwich className="size-11 text-brand opacity-70" />
          <AppImage url={product.imageUrl} alt={product.name} fallback={null} className="absolute inset-0" />
        </div>
      }
      badge={badge}
      badgeClassName={!product.isAvailable ? 'bg-danger text-white' : product.discountPercent > 0 ? 'bg-brand text-white' : undefined}
      title={localized(product.name, product.nameEn, product.nameRu)}
      subtitle={localized(item.storeName, item.storeNameEn, item.storeNameRu)}
      footer={<DiscountedPrice value={price} full={full} prefix={hasOptions ? tIn('price', 'من') : undefined} className="text-[15px]" />}
      action={product.isAvailable ? <ShowcaseAction icon={Store} /> : undefined}
    />
  );
}
