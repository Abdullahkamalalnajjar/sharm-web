import clsx from 'clsx';
import {
  ArrowLeft,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useDeliveryLocation } from '@/api/queries';
import { formatPrice, storeStatusLabel } from '@/lib/format';
import type { HomeOffer } from '@/lib/home-content';
import { Button, Chip, CountPill, Sheet, Switch } from '@/components/ui';
import { localized } from '@/lib/localized';
import { SHARM_AREAS, categoryLook, categoryOf } from '@/lib/meta';
import { useBrowse } from '@/store/ui';
import type { NearbyStore, StoreCategory } from '@/types';

import { ArcPicker, useOpenCustomOrder, type ArcPickerItem } from './Showcase';
import { Cover, OpenStoreCard } from './StoreBits';

// ---------- Building blocks ----------

export function SectionTitle({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <h2 className={clsx('section-title', className)}>
      <span className="section-title-icon">
        <Icon className="size-4" />
      </span>
      {children}
    </h2>
  );
}

export function SectionHead({ title, icon, action, onAction, to }: { title: string; icon: LucideIcon; action?: string; onAction?: () => void; to?: string }) {
  const link = action ? (
    to ? (
      <Link to={to} className="section-link">
        {action}
        <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
      </Link>
    ) : (
      <button type="button" onClick={onAction} className="section-link">
        {action}
        <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
      </button>
    )
  ) : null;
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <SectionTitle icon={icon} className="min-w-0">
        {title}
      </SectionTitle>
      {link}
    </div>
  );
}

/** "التوصيل لـ" over the delivery place (opens the delivery picker), the two-tone title, then search + filter. */
export function HomeHeader({ categories }: { categories: StoreCategory[] }) {
  const { location } = useDeliveryLocation();
  const { search, setSearch, categoryId, openOnly, setPickerOpen } = useBrowse();
  const [filterOpen, setFilterOpen] = useState(false);
  const place = !location ? '...' : location.address ? `${location.title} • ${location.address.addressLine}` : location.title;
  const filtered = openOnly || categoryId !== null;

  return (
    <section className="container-site pt-3">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="تغيير مكان التوصيل"
        className="flex max-w-full flex-col items-start rounded-xl px-0.5 py-1 text-start hover:bg-surface/60"
      >
        <span className="text-[12.5px] text-ink-3">التوصيل لـ</span>
        <span className="mt-0.5 flex min-w-0 max-w-full items-center gap-1">
          <MapPin className="size-[18px] shrink-0 text-brand" />
          <span className="truncate text-base font-extrabold text-ink">{place}</span>
          <ChevronDown className="size-5 shrink-0 text-ink-2" />
        </span>
      </button>

      <h2 className="mt-4 text-[30px] leading-[1.2] md:text-[36px]">
        <span className="font-medium text-ink-3">اطلب </span>
        <span className="font-black text-ink">اللي نفسك فيه</span>
      </h2>

      <div className="mt-4 flex items-center gap-2.5">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-[26px] border border-line bg-surface ps-4 pe-2 focus-within:border-brand"
        >
          <Search className="size-5 shrink-0 text-ink-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="دور على مطعم أو سوبر ماركت أو صيدلية"
            aria-label="بحث"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-3"
          />
          {search && (
            <button type="button" aria-label="امسح البحث" onClick={() => setSearch('')} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-alt hover:text-ink">
              <X className="size-4" />
            </button>
          )}
        </form>
        <button
          type="button"
          title="فلترة"
          aria-label="فلترة"
          onClick={() => setFilterOpen(true)}
          className="relative grid size-[52px] shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand transition-colors hover:bg-brand-light active:scale-95"
        >
          <SlidersHorizontal className="size-6" />
          {filtered && <span className="absolute top-0.5 end-0.5 size-2.5 rounded-full bg-accent ring-2 ring-bg" />}
        </button>
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} categories={categories} />
    </section>
  );
}

function FilterSheet({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: StoreCategory[] }) {
  const { categoryId, openOnly, setCategoryId, setOpenOnly } = useBrowse();
  return (
    <Sheet open={open} onClose={onClose} title="فلترة">
      <p className="mb-2 font-bold text-ink-2">القسم</p>
      <div className="flex flex-wrap gap-2">
        <Chip selected={categoryId === null} onClick={() => setCategoryId(null)}>
          الكل
        </Chip>
        {categories.map((c) => {
          const look = categoryLook(c.icon);
          const on = categoryId === c.id;
          return (
            <Chip key={c.id} selected={on} onClick={() => setCategoryId(c.id)} icon={<look.Icon className="size-4" style={{ color: on ? '#fff' : look.color }} />}>
              {c.name}
            </Chip>
          );
        })}
      </div>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 py-2">
        <span className="font-bold text-ink">المفتوح دلوقتي بس</span>
        <Switch checked={openOnly} onChange={setOpenOnly} label="المفتوح دلوقتي بس" />
      </label>
      <Button block className="mt-3" onClick={onClose}>
        تمام
      </Button>
    </Sheet>
  );
}

/** Store categories on the arc: "الكل" then the admin's categories; the centered one filters the list. */
export function CategoryArc({ categories }: { categories: StoreCategory[] }) {
  const categoryId = useBrowse((s) => s.categoryId);
  const setCategoryId = useBrowse((s) => s.setCategoryId);
  const items: ArcPickerItem[] = [
    { key: 'all', label: 'الكل', icon: UtensilsCrossed, color: 'var(--color-brand)' },
    ...categories.map((c) => {
      const look = categoryLook(c.icon);
      return { key: `category-${c.id}`, label: c.name, icon: look.Icon, imageUrl: c.imageUrl, color: look.color };
    }),
  ];
  const index = categoryId === null ? 0 : categories.findIndex((c) => c.id === categoryId) + 1;
  return (
    <section className="container-site mt-3">
      {/* Rebuilt when the categories arrive so the loop has the right length. */}
      <ArcPicker
        key={items.length}
        label="الأقسام"
        items={items}
        selectedIndex={Math.max(index, 0)}
        onSelect={(i) => setCategoryId(i === 0 ? null : categories[i - 1].id)}
      />
    </section>
  );
}

/** Arrow buttons shown on hover (pointer devices) at both ends of a slider. */
function SliderArrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const base =
    'absolute top-1/2 z-[2] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#1d1b1b] shadow-[0_4px_14px_rgb(0_0_0/0.2)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:grid';
  return (
    <>
      <button type="button" aria-label="السابق" onClick={onPrev} className={clsx(base, 'start-3.5')}>
        <ChevronLeft className="size-5 rtl:-scale-x-100" />
      </button>
      <button type="button" aria-label="التالي" onClick={onNext} className={clsx(base, 'end-3.5')}>
        <ChevronRight className="size-5 rtl:-scale-x-100" />
      </button>
    </>
  );
}

/** Tracks which slide is in view in an RTL snap scroller. */
function useSlider(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0');
      setIndex(Math.min(count - 1, Math.max(0, Math.round(Math.abs(el.scrollLeft) / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [count]);

  const by = (dir: 1 | -1) => {
    const el = ref.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0');
    // RTL: the next slide is to the left, so scrollLeft decreases.
    el.scrollBy({ left: -dir * step, behavior: 'smooth' });
  };

  return { ref, index, next: () => by(1), prev: () => by(-1) };
}

// ---------- Offers carousel ----------

export function OffersCarousel({ offers, categories }: { offers: HomeOffer[]; categories: StoreCategory[] }) {
  const slider = useSlider(offers.length);
  const setCategoryId = useBrowse((s) => s.setCategoryId);
  const openCustomOrder = useOpenCustomOrder();
  // An offer points at a category by its icon; if that category is gone it shows everything.
  const categoryFor = (icon: string | null) => (icon === null ? null : (categories.find((c) => c.icon === icon)?.id ?? null));
  return (
    <section className="container-site mt-1">
      <SectionHead title="أحدث العروض" icon={Flame} />
      <div className="group relative -mx-3 sm:mx-0">
        <div ref={slider.ref} className="slider-track gap-3 px-[9%] sm:px-0 scroll-px-[9%] sm:scroll-px-0">
          {offers.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => (o.kind === 'custom-order' ? openCustomOrder() : setCategoryId(categoryFor(o.categoryIcon)))}
              aria-label={o.title}
              className="relative aspect-[1.9/1] flex-[0_0_82%] snap-start overflow-hidden rounded-[18px] border-[1.5px] border-brand/70 text-start shadow-[0_4px_12px_rgb(0_0_0/0.15)] md:aspect-[2.25/1] md:flex-[0_0_calc(50%-0.375rem)]"
              style={{ background: o.gradient }}
            >
              {o.image ? (
                <img src={o.image} alt={o.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <span className="absolute -end-10 -bottom-12 size-48 rounded-full bg-white/10" />
                  <span
                    className={clsx('absolute end-3 bottom-2 text-[68px] leading-none drop-shadow-lg md:text-[110px]', o.kind === 'custom-order' && '-rotate-12')}
                    aria-hidden="true"
                  >
                    {o.emoji}
                  </span>
                  <span className="absolute inset-0 flex flex-col justify-center gap-1 p-4 pe-24 text-white md:p-6 md:pe-40">
                    <span className="self-start rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold">{o.subtitle}</span>
                    <span className="text-[17px] font-black leading-tight sm:text-[20px] md:text-[28px]">{o.title}</span>
                    {o.line ? (
                      <span className="text-[12px] font-semibold leading-snug sm:text-[13px] md:text-[16px]">
                        {o.line}
                        {o.highlight && <span className="text-[14px] font-black text-highlight sm:text-[15px] md:text-[20px]">{o.highlight}</span>}
                      </span>
                    ) : (
                      o.highlight && <span className="text-[17px] font-extrabold text-highlight md:text-[24px]">{o.highlight}</span>
                    )}
                    {o.button && (
                      <span className="mt-1 self-start rounded-full bg-white px-4 py-1 text-[12.5px] font-extrabold text-brand-dark shadow-sm md:text-sm">
                        {o.button}
                      </span>
                    )}
                  </span>
                </>
              )}
              {o.endsAt && (
                <span className="absolute bottom-0 start-0 z-[1] rounded-te-xl bg-highlight px-3 py-0.5 text-[0.85rem] font-extrabold text-[#2b1d00]">
                  ينتهي {o.endsAt}
                </span>
              )}
            </button>
          ))}
        </div>
        {offers.length > 1 && <SliderArrows onPrev={slider.prev} onNext={slider.next} />}
      </div>
    </section>
  );
}

// ---------- Open now ----------

/** "مفتوح دلوقتي": open stores first, then the closed ones marked closed instead of disappearing. */
export function OpenNowCarousel({ stores, onAll }: { stores: NearbyStore[]; onAll: () => void }) {
  const open = stores.filter((s) => s.isOpen);
  const list = [...open, ...stores.filter((s) => !s.isOpen)];
  if (list.length === 0) return null;
  return (
    <section className="container-site mt-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SectionTitle icon={Clock} className="min-w-0">
            مفتوح دلوقتي
          </SectionTitle>
          <CountPill>{open.length} محل</CountPill>
        </div>
        <button type="button" onClick={onAll} className="section-link">
          شوف الكل
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
        </button>
      </div>
      <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 scroll-px-3 sm:mx-0 sm:px-0">
        {list.map((s) => (
          <OpenStoreCard key={s.id} store={s} />
        ))}
      </div>
    </section>
  );
}

// ---------- Purple panel: nearest stores ----------

export function PlaceTile({ store }: { store: NearbyStore }) {
  const meta = categoryOf(store);
  return (
    <Link
      to={`/store/${store.id}`}
      className="tile-scrim group/tile relative block aspect-[16/10] overflow-hidden rounded-[15px] bg-black/20 text-white shadow-[0_3px_10px_rgb(0_0_0/0.15)]"
    >
      <div className={clsx('absolute inset-0 transition-transform duration-300 group-hover/tile:scale-[1.04]', !store.isOpen && 'opacity-50 grayscale-[0.4]')}>
        <Cover category={store} logoUrl={store.coverUrl ?? store.logoUrl} />
      </div>
      <span className="absolute top-2 end-2 z-[1] grid size-[46px] place-items-center overflow-hidden rounded-xl border-2 border-white bg-white" style={{ color: meta.color }}>
        <meta.Icon className="size-6" />
      </span>
      <span
        className={clsx(
          'absolute top-2 start-2 z-[1] rounded-[5px] px-1.5 py-px text-[0.8rem] font-extrabold',
          store.isOpen ? 'bg-highlight text-[#3a2600]' : 'bg-black/70 text-white',
        )}
      >
        {store.isOpen
          ? store.minOrderAmount > 0
            ? `أقل طلب ${formatPrice(store.minOrderAmount)}`
            : 'مفتوح'
          : storeStatusLabel(store)}
      </span>
      <span className="absolute inset-x-3 bottom-2 z-[1] truncate text-[1.1rem] font-black [text-shadow:0_1px_4px_rgb(0_0_0/0.5)]">{localized(store.name, store.nameEn, store.nameRu)}</span>
    </Link>
  );
}

export function NearestPanel({ stores, onAll }: { stores: NearbyStore[]; onAll: () => void }) {
  if (stores.length === 0) return null;
  return (
    <section className="container-site mt-8">
      <div className="rounded-[24px] bg-gradient-to-b from-[#6A3FB5] to-[#5B34A3] p-[0.9rem] pb-4 text-white shadow-[0_3px_12px_rgb(0_0_0/0.25)]">
        <div className="mb-3 flex items-center gap-2">
          <BookmarkCheck className="size-6 shrink-0 text-highlight" />
          <h2 className="min-w-0 flex-1 text-[1.25rem] font-black">الأقرب ليك</h2>
          <button
            type="button"
            onClick={onAll}
            aria-label="عرض الكل"
            className="grid size-[42px] shrink-0 place-items-center rounded-full bg-highlight text-[#3a2600] shadow-[0_2px_8px_rgb(0_0_0/0.15)] hover:brightness-105"
          >
            <ArrowLeft className="size-5 rtl:-scale-x-100" />
          </button>
        </div>
        <div className="h-scroll pb-1">
          {stores.map((s) => (
            <PlaceTile key={s.id} store={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Areas ----------

export function AreaGrid({ currentTitle }: { currentTitle: string | undefined }) {
  const selection = useBrowse((s) => s.selection);
  const setSelection = useBrowse((s) => s.setSelection);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  return (
    <section className="container-site mt-8">
      <SectionTitle icon={MapPin} className="mb-3.5">
        مناطق تانية
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-3.5">
        {SHARM_AREAS.map((area, i) => {
          const selected = selection?.kind === 'area' ? selection.name === area.name : currentTitle === area.name;
          return (
            <button
              key={area.name}
              type="button"
              onClick={() => {
                setSelection({ kind: 'area', name: area.name });
                scrollTop();
              }}
              className={clsx(
                'city-scrim lift group/city relative block aspect-[4/3] overflow-hidden rounded-[18px] text-start text-white shadow-[0_4px_14px_rgb(0_0_0/0.35)] md:aspect-[16/9]',
                selected && 'ring-[3px] ring-brand ring-offset-[3px] ring-offset-bg',
              )}
              style={{ background: `linear-gradient(135deg, var(--color-brand) 0%, ${AREA_TINTS[i % AREA_TINTS.length]} 100%)` }}
            >
              <span className="absolute inset-0 grid place-items-center opacity-55">
                <MapPin className="size-12" />
              </span>
              {selected && (
                <span className="absolute top-2.5 start-2.5 z-[1] grid size-[30px] place-items-center rounded-full bg-white text-brand shadow-md">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-between gap-2 px-3 py-2.5 text-[0.95rem] font-bold [text-shadow:0_1px_3px_rgb(0_0_0/0.45)] sm:text-[1.05rem]">
                <span className="truncate">{area.name}</span>
                {selected ? (
                  <small className="shrink-0 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold [text-shadow:none]">مختارة</small>
                ) : (
                  <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/22 backdrop-blur-sm transition-colors group-hover/city:bg-brand sm:size-[30px]">
                    <ArrowLeft className="size-4 rtl:-scale-x-100" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Darker shades of the brand, so each area card differs a little and follows the theme.
const AREA_TINTS = [70, 55, 85, 45, 95].map((p) => `color-mix(in srgb, var(--color-brand-dark) ${p}%, black)`);
