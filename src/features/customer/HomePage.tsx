import { FilterX, Store } from 'lucide-react';
import { useRef } from 'react';

import { useDeliveryLocation, useStores, useStoreCategories } from '@/api/queries';
import { Button, EmptyView, ErrorView, Loading, CountPill } from '@/components/ui';
import { HOME_OFFERS } from '@/lib/home-content';
import { t, tIn } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { useBrowse } from '@/store/ui';

import { AreaGrid, CategoryArc, DailyOffersRow, HomeHeader, NearestPanel, OffersCarousel, OpenNowCarousel, SectionHead } from './HomeSections';
import { SHOWCASE_GRID } from './Showcase';
import { StoreCard } from './StoreBits';

export function HomePage() {
  const { location, isLoading: locating } = useDeliveryLocation();
  const { categoryId, openOnly, search, clearFilters, setOpenOnly } = useBrowse();
  const categories = useStoreCategories().data ?? [];
  // One query for every store; category / open / search filter on the client so the tiles can show counts.
  const stores = useStores(location, null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = search.trim().toLowerCase();
  const all = stores.data ?? [];
  let list = all;
  if (categoryId !== null) list = list.filter((s) => s.categoryId === categoryId);
  if (openOnly) list = list.filter((s) => s.isOpen);
  if (query) list = list.filter((s) => [s.name, s.nameEn, s.nameRu].some((n) => n?.toLowerCase().includes(query)));

  const filtering = query !== '' || openOnly || categoryId !== null;
  // Picking a category on the arc keeps the promos and the open-now row (of that category); search and "open only" hide them.
  const browsing = query === '' && !openOnly;
  const inCategory = categoryId === null ? all : all.filter((s) => s.categoryId === categoryId);
  const nearest = all
    .filter((s) => s.distanceKm !== null)
    .sort((a, b) => a.distanceKm! - b.distanceKm!)
    .slice(0, 10);
  const typeLabel =
    categoryId === null
      ? undefined
      : ((c) => (c ? localized(c.name, c.nameEn, c.nameRu, c.nameTr, c.nameIt) : undefined))(categories.find((c) => c.id === categoryId)) ??
        ((s) => (s ? localized(s.categoryName, s.categoryNameEn, s.categoryNameRu, s.categoryNameTr, s.categoryNameIt) : undefined))(all.find((s) => s.categoryId === categoryId));

  const listTitle = query
    ? t('نتايج "{q}"', { q: search.trim() })
    : openOnly
      ? typeLabel
        ? t('{type} المفتوحة دلوقتي', { type: typeLabel })
        : t('المحلات المفتوحة دلوقتي')
      : categoryId !== null
        ? (typeLabel ?? tIn('title', 'المحلات'))
        : t('كل المحلات');

  const scrollToList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      <h1 className="sr-only">MARID Egypt - {location ? t(location.title) : ''}</h1>
      <HomeHeader categories={categories} />
      <CategoryArc categories={categories} />

      {browsing && <OffersCarousel offers={HOME_OFFERS} categories={categories} />}
      {browsing && <DailyOffersRow />}

      {locating || stores.isLoading ? (
        <Loading />
      ) : stores.isError ? (
        <div className="container-site">
          <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
        </div>
      ) : (
        <>
          {browsing && (
            <>
              <OpenNowCarousel
                stores={inCategory}
                onAll={() => {
                  setOpenOnly(true);
                  scrollToList();
                }}
              />
              {!filtering && nearest.length > 0 && <NearestPanel stores={nearest} onAll={scrollToList} />}
            </>
          )}

          <section ref={listRef} className="container-site mt-8 scroll-mt-20">
            <SectionHead
              title={listTitle}
              icon={Store}
              action={filtering ? t('امسح الفلتر') : undefined}
              onAction={filtering ? clearFilters : undefined}
            />
            {list.length === 0 ? (
              <EmptyView
                icon={query ? FilterX : Store}
                message={
                  query
                    ? t('مفيش نتايج لـ "{q}"', { q: search.trim() })
                    : openOnly
                      ? typeLabel
                        ? t('مفيش {type} مفتوحة دلوقتي', { type: typeLabel })
                        : t('مفيش محلات مفتوحة دلوقتي')
                      : typeLabel
                        ? t('مفيش {type} لسه', { type: typeLabel })
                        : t('مفيش محلات لسه')
                }
                action={
                  filtering ? (
                    <Button variant="outline" size="md" icon={<FilterX className="size-4" />} onClick={clearFilters}>
                      {t('اعرض الكل')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="-mt-1 mb-3">
                  <CountPill>{t('{n} محل', { n: list.length })}</CountPill>
                </div>
                <div className={SHOWCASE_GRID}>
                  {list.map((s) => (
                    <StoreCard key={s.id} store={s} />
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      <AreaGrid currentTitle={location?.address ? undefined : location?.title} />
    </div>
  );
}
