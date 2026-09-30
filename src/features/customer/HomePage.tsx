import { Bike, ChevronDown, Filter, FilterX, MapPin, Search, SlidersHorizontal, Store, Utensils } from 'lucide-react';
import { useRef, useState } from 'react';

import { useDeliveryLocation, useNearbyStores } from '@/api/queries';
import { Button, Chip, EmptyView, ErrorView, Loading, RoundIconButton, SectionHeader, Sheet, Switch } from '@/components/ui';
import { STORE_TYPES } from '@/lib/meta';
import { useBrowse } from '@/store/ui';

import { DeliveryPicker } from './DeliveryPicker';
import { OpenStoreCard, StoreCard, TypeTiles } from './StoreBits';

export function HomePage() {
  const { location, isLoading: locating } = useDeliveryLocation();
  const { storeType, openOnly, search, setStoreType, setOpenOnly, setSearch } = useBrowse();
  const stores = useNearbyStores(location, storeType);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const nearbyRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const query = search.trim().toLowerCase();

  const all = stores.data ?? [];
  let list = query ? all.filter((s) => s.name.toLowerCase().includes(query)) : all;
  if (openOnly) list = list.filter((s) => s.isOpen);
  const open = all.filter((s) => s.isOpen);
  const showCarousel = open.length > 0 && !query && !openOnly;

  const locationTitle = !location
    ? '...'
    : location.address
      ? `${location.title} • ${location.address.addressLine}`
      : location.title;

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),12px)] md:pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="grid size-[50px] place-items-center rounded-full bg-brand p-[2.5px]">
          <span className="grid size-full place-items-center rounded-full bg-brand-dark text-white">
            <Bike className="size-6" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] font-extrabold text-ink leading-tight">{greeting} 👋</h1>
          <p className="text-[13px] text-ink-2">نفسك في إيه النهارده؟</p>
        </div>
        <RoundIconButton icon={SlidersHorizontal} title="فلترة" badge={openOnly || storeType !== null} onClick={() => setFilterOpen(true)} />
        <RoundIconButton icon={MapPin} title="مكان التوصيل" onClick={() => setPickerOpen(true)} />
      </div>

      {/* Search */}
      <label className="mt-4 flex h-[52px] items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand">
        <Search className="size-5 text-ink-2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دور على مطعم أو سوبر ماركت أو صيدلية"
          className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink-3 placeholder:font-medium"
        />
      </label>

      {/* Delivery location */}
      <button type="button" onClick={() => setPickerOpen(true)} className="mt-2.5 flex w-full items-center gap-1.5 rounded-xl px-0.5 py-1 text-start hover:bg-surface/60">
        <MapPin className="size-[19px] text-brand shrink-0" />
        <span className="text-[13px] text-ink-3">التوصيل لـ</span>
        <span className="truncate text-[13.5px] font-bold text-ink">{locationTitle}</span>
        <ChevronDown className="size-5 text-ink-2 shrink-0" />
      </button>

      {/* Categories */}
      <div className="mt-4">
        <TypeTiles selected={storeType} onSelect={setStoreType} />
      </div>

      {/* Promo banner */}
      <div className="mt-4.5 relative h-[176px] md:h-[200px] overflow-hidden rounded-card bg-gradient-to-br from-brand-light via-brand to-brand-dark">
        <span className="absolute -end-12 -bottom-12 size-48 rounded-full bg-white/10" />
        <Utensils className="absolute -end-2 -bottom-3 size-[130px] text-white/90 -rotate-[20deg]" />
        <div className="relative flex h-full flex-col p-4.5 md:p-6">
          <span className="self-start rounded-lg bg-white/20 px-2.5 py-0.5 text-[11.5px] font-bold text-white">عرض الويك إند!</span>
          <h2 className="mt-2 text-[22px] md:text-[26px] font-black text-white leading-tight">عروض مخصوص ليك</h2>
          <p className="text-white text-sm font-semibold">
            خصم لحد <span className="text-[30px] font-black text-accent leading-none align-middle">30%</span>
          </p>
          <span className="flex-1" />
          <Button
            size="sm"
            className="self-start bg-[#151517] hover:bg-black text-white shadow-none h-10 px-6 text-sm"
            onClick={() => nearbyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            اطلب دلوقتي
          </Button>
        </div>
      </div>

      {/* Stores */}
      {locating || stores.isLoading ? (
        <Loading />
      ) : stores.isError ? (
        <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
      ) : list.length === 0 ? (
        <EmptyView
          icon={query ? FilterX : Store}
          message={
            query
              ? `مفيش نتايج لـ "${search.trim()}"`
              : openOnly
                ? `مفيش ${STORE_TYPES.find((t) => t.value === storeType)?.label ?? 'محلات'} مفتوحة دلوقتي`
                : `مفيش ${STORE_TYPES.find((t) => t.value === storeType)?.label ?? 'محلات'} قريبة من المكان ده لسه`
          }
          action={
            query ? null : openOnly ? (
              <Button variant="outline" size="md" icon={<FilterX className="size-4" />} onClick={() => setOpenOnly(false)}>
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
          {showCarousel && (
            <>
              <SectionHeader title="مفتوح دلوقتي" pill={`${open.length} محل`} action="شوف الكل" onAction={() => setOpenOnly(true)} />
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x">
                {open.map((s) => (
                  <OpenStoreCard key={s.id} store={s} />
                ))}
              </div>
            </>
          )}
          <div ref={nearbyRef} className="scroll-mt-4">
            <SectionHeader
              title={
                openOnly
                  ? `${STORE_TYPES.find((t) => t.value === storeType)?.label ?? 'المحلات'} المفتوحة`
                  : storeType === null
                    ? 'كل المحلات القريبة'
                    : `${STORE_TYPES.find((t) => t.value === storeType)?.label} قريبة منك`
              }
              action={openOnly ? 'اعرض الكل' : 'مرتبة بالأقرب ليك'}
              onAction={openOnly ? () => setOpenOnly(false) : undefined}
            />
          </div>
          <div className="grid gap-3.5 pb-7 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        </>
      )}

      <DeliveryPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="فلترة" footer={<Button block onClick={() => setFilterOpen(false)}>تمام</Button>}>
        <p className="text-sm font-bold text-ink-2 mb-2">نوع المحل</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={storeType === null} onClick={() => setStoreType(null)}>
            الكل
          </Chip>
          {STORE_TYPES.map((t) => (
            <Chip
              key={t.value}
              selected={storeType === t.value}
              onClick={() => setStoreType(t.value)}
              icon={<t.Icon className="size-4" style={{ color: storeType === t.value ? '#fff' : t.color }} />}
            >
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="font-bold text-ink inline-flex items-center gap-2">
            <Filter className="size-4 text-ink-2" />
            المفتوح دلوقتي بس
          </span>
          <Switch checked={openOnly} onChange={setOpenOnly} label="المفتوح دلوقتي بس" />
        </div>
      </Sheet>
    </div>
  );
}
