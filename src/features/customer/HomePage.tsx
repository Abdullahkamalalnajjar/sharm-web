import { FilterX, MapPin, Store } from 'lucide-react';
import { useRef } from 'react';

import { useDeliveryLocation, useNearbyStores } from '@/api/queries';
import { Button, EmptyView, ErrorView, Loading, CountPill } from '@/components/ui';
import { HOME_OFFERS } from '@/lib/home-content';
import { STORE_TYPES } from '@/lib/meta';
import { useBrowse } from '@/store/ui';

import { AreaGrid, FeaturedSlider, NearestPanel, OffersCarousel, SearchBand, SectionHead, ServiceGrid } from './HomeSections';
import { StoreCard } from './StoreBits';

export function HomePage() {
  const { location, isLoading: locating } = useDeliveryLocation();
  const { storeType, openOnly, search, clearFilters, setPickerOpen } = useBrowse();
  // One query for the area; type / open / search filter on the client so the tiles can show counts.
  const stores = useNearbyStores(location, null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = search.trim().toLowerCase();
  const all = stores.data ?? [];
  let list = all;
  if (storeType) list = list.filter((s) => s.type === storeType);
  if (openOnly) list = list.filter((s) => s.isOpen);
  if (query) list = list.filter((s) => s.name.toLowerCase().includes(query));

  const filtering = query !== '' || openOnly || storeType !== null;
  const open = all.filter((s) => s.isOpen);
  const nearest = [...all].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  const typeLabel = STORE_TYPES.find((t) => t.value === storeType)?.label;

  const listTitle = query
    ? `نتايج "${search.trim()}"`
    : openOnly
      ? `${typeLabel ?? 'المحلات'} المفتوحة دلوقتي`
      : storeType
        ? `${typeLabel} قريبة منك`
        : 'كل المحلات القريبة';

  const scrollToList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      <h1 className="sr-only">شرم - {location?.title ?? ''}</h1>
      <SearchBand />

      {!filtering && <OffersCarousel offers={HOME_OFFERS} />}

      <ServiceGrid stores={all} />

      {locating || stores.isLoading ? (
        <Loading />
      ) : stores.isError ? (
        <div className="container-site">
          <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
        </div>
      ) : (
        <>
          {!filtering && (
            <>
              <FeaturedSlider stores={open} />
              <NearestPanel stores={nearest} onAll={scrollToList} />
            </>
          )}

          <section ref={listRef} className="container-site mt-8 scroll-mt-20">
            <SectionHead
              title={listTitle}
              icon={Store}
              action={filtering ? 'امسح الفلتر' : undefined}
              onAction={filtering ? clearFilters : undefined}
            />
            {list.length === 0 ? (
              <EmptyView
                icon={query ? FilterX : Store}
                message={
                  query
                    ? `مفيش نتايج لـ "${search.trim()}"`
                    : openOnly
                      ? `مفيش ${typeLabel ?? 'محلات'} مفتوحة دلوقتي`
                      : `مفيش ${typeLabel ?? 'محلات'} قريبة من ${location?.title ?? 'المكان ده'} لسه`
                }
                action={
                  filtering ? (
                    <Button variant="outline" size="md" icon={<FilterX className="size-4" />} onClick={clearFilters}>
                      اعرض الكل
                    </Button>
                  ) : (
                    <Button variant="outline" size="md" icon={<MapPin className="size-4" />} onClick={() => setPickerOpen(true)}>
                      غيّر المكان
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <div className="-mt-1 mb-3">
                  <CountPill>{list.length} محل</CountPill>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
