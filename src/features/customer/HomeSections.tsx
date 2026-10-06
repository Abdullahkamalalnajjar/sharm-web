import clsx from 'clsx';
import {
  ArrowLeft,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  LayoutGrid,
  MapPin,
  Navigation,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { formatPrice } from '@/lib/format';
import type { HomeOffer } from '@/lib/home-content';
import { AppImage } from '@/components/ui';
import { SHARM_AREAS, categoryLook, categoryOf } from '@/lib/meta';
import { useBrowse } from '@/store/ui';
import type { NearbyStore, StoreCategory } from '@/types';

import { Cover } from './StoreBits';

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

/** Red band under the header holding the white search pill. */
export function SearchBand() {
  const search = useBrowse((s) => s.search);
  const setSearch = useBrowse((s) => s.setSearch);
  return (
    <div className="bg-brand rounded-b-[35px] pb-[1.15rem] pt-1.5">
      <div className="container-site">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="flex h-[50px] items-center gap-2 rounded-[25px] bg-white ps-[1.1rem] pe-1.5 shadow-[0_4px_14px_rgb(0_0_0/0.12)] dark:bg-surface-alt"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="دوّر على مطعم أو محل..."
            aria-label="بحث"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
          />
          <button type="submit" aria-label="بحث" className="grid size-[42px] shrink-0 place-items-center rounded-full text-ink-2 hover:bg-black/10 hover:text-brand-ink">
            <Search className="size-5" />
          </button>
        </form>
      </div>
    </div>
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
              onClick={() => setCategoryId(categoryFor(o.categoryIcon))}
              aria-label={o.title}
              className="relative aspect-[2.25/1] flex-[0_0_82%] snap-start overflow-hidden rounded-[18px] border-[1.5px] border-brand/70 text-start shadow-[0_4px_12px_rgb(0_0_0/0.15)] md:flex-[0_0_calc(50%-0.375rem)]"
              style={{ background: o.gradient }}
            >
              {o.image ? (
                <img src={o.image} alt={o.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <span className="absolute -end-10 -bottom-12 size-48 rounded-full bg-white/10" />
                  <span className="absolute end-4 bottom-2 text-[76px] leading-none drop-shadow-lg md:text-[110px]" aria-hidden="true">
                    {o.emoji}
                  </span>
                  <span className="absolute inset-0 flex flex-col justify-center gap-1 p-4 pe-28 text-white md:p-6 md:pe-40">
                    <span className="self-start rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold">{o.subtitle}</span>
                    <span className="text-[20px] font-black leading-tight md:text-[28px]">{o.title}</span>
                    {o.highlight && <span className="text-[17px] font-extrabold text-highlight md:text-[24px]">{o.highlight}</span>}
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

// ---------- Service tiles (categories) ----------

interface ServiceTile {
  key: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  /** The admin's picture for the category; the icon shows while it loads or when there is none. */
  imageUrl?: string | null;
  badge?: string;
  badgeColor?: string;
  selected: boolean;
  onClick: () => void;
}

export function ServiceGrid({ stores, categories }: { stores: NearbyStore[]; categories: StoreCategory[] }) {
  const { categoryId: selected, openOnly, setCategoryId, setOpenOnly } = useBrowse();
  const openCount = stores.filter((s) => s.isOpen).length;

  const tiles: ServiceTile[] = [
    {
      key: 'all',
      label: 'كل المحلات',
      Icon: LayoutGrid,
      color: 'var(--color-accent)',
      badge: stores.length > 0 ? `${stores.length}` : undefined,
      badgeColor: '#1E6FE0',
      selected: selected === null && !openOnly,
      onClick: () => {
        setCategoryId(null);
        setOpenOnly(false);
      },
    },
    ...categories.map((c) => {
      const count = stores.filter((s) => s.categoryId === c.id).length;
      const look = categoryLook(c.icon);
      return {
        key: `category-${c.id}`,
        label: c.name,
        Icon: look.Icon,
        color: look.color,
        imageUrl: c.imageUrl,
        badge: count > 0 ? `${count}` : undefined,
        selected: selected === c.id,
        onClick: () => setCategoryId(selected === c.id ? null : c.id),
      };
    }),
    {
      key: 'open',
      label: 'مفتوح دلوقتي',
      Icon: Clock,
      color: 'var(--color-success)',
      badge: openCount > 0 ? `${openCount} مفتوح` : 'مقفول',
      badgeColor: openCount > 0 ? 'var(--color-success)' : 'var(--color-ink-3)',
      selected: openOnly,
      onClick: () => setOpenOnly(!openOnly),
    },
  ];

  return (
    <section className="container-site mt-6">
      <h2 className="sr-only">الأقسام</h2>
      {/* Phones and tablets: one row, five across, sliding sideways when the admin adds more categories. */}
      <div className="no-scrollbar -mx-3 grid snap-x auto-cols-[calc((100%-2rem-4*0.5rem)/5)] grid-flow-col gap-x-2 overflow-x-auto px-3 pb-1 pt-1 scroll-px-3 sm:auto-cols-[calc((100%-2rem-4*0.875rem)/5)] sm:gap-x-3.5 lg:mx-0 lg:grid-flow-row lg:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] lg:gap-x-3 lg:gap-y-4 lg:overflow-visible lg:px-0">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            aria-pressed={t.selected}
            className="group flex snap-start flex-col items-center gap-1.5 text-center outline-none"
          >
            <span
              className={clsx(
                'relative grid aspect-[1/1.04] w-full place-items-center overflow-hidden rounded-[20px] shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-all group-hover:-translate-y-[3px] group-hover:shadow-[0_8px_18px_rgb(0_0_0/0.35)] group-active:scale-[0.97]',
                t.selected && 'ring-[3px] ring-brand-light ring-offset-2 ring-offset-bg',
              )}
              style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${t.color} 42%, transparent), var(--color-surface) 90%)` }}
            >
              <t.Icon className="size-8 sm:size-10 drop-shadow" style={{ color: t.selected ? '#fff' : t.color }} strokeWidth={2.2} />
              {t.imageUrl && <AppImage url={t.imageUrl} alt={t.label} fallback={null} className="absolute inset-0" />}
              {t.imageUrl && t.selected && <span className="absolute inset-0 bg-brand/25" />}
              {t.badge && (
                <span
                  className="absolute top-0 end-0 z-[1] max-w-[90%] truncate rounded-es-xl px-1.5 py-px text-[0.62rem] font-extrabold text-white sm:px-2 sm:text-[0.72rem]"
                  style={{ background: t.badgeColor ?? t.color }}
                >
                  {t.badge}
                </span>
              )}
            </span>
            <span className={clsx('text-[0.8rem] font-extrabold leading-tight sm:text-[0.95rem]', t.selected ? 'text-brand-ink' : 'text-ink/85 group-hover:text-brand-ink')}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Featured slider (open stores) ----------

export function FeaturedSlider({ stores }: { stores: NearbyStore[] }) {
  const slider = useSlider(stores.length);
  if (stores.length === 0) return null;
  return (
    <section className="container-site mt-8">
      <div className="group relative">
        <div ref={slider.ref} className="slider-track rounded-[20px] bg-surface shadow-card">
          {stores.map((s) => {
            const meta = categoryOf(s);
            return (
              <Link
                key={s.id}
                to={`/store/${s.id}`}
                aria-label={s.name}
                className="relative aspect-[2/1] flex-[0_0_100%] snap-center overflow-hidden lg:aspect-auto lg:h-[min(320px,42vh)] lg:min-h-[240px]"
              >
                {/* Blurred copy of the cover as the backdrop. */}
                <div className="absolute inset-0 scale-[1.2] blur-[28px] saturate-[1.2] opacity-90">
                  <Cover category={s} logoUrl={s.logoUrl} iconSize={0} />
                </div>
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-y-4 inset-x-[18%] overflow-hidden rounded-2xl sm:inset-y-5 sm:inset-x-[28%]">
                  <Cover category={s} logoUrl={s.logoUrl} iconSize={96} />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black drop-shadow md:text-2xl">{s.name}</h3>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-white/85 md:text-sm">
                      <meta.Icon className="size-3.5" style={{ color: meta.color }} />
                      {meta.label}
                      {s.distanceKm !== null && (
                        <>
                          <span className="opacity-60">•</span>
                          <Navigation className="size-3.5 text-accent" />
                          {s.distanceKm.toFixed(1)} كم
                        </>
                      )}
                    </p>
                  </div>
                  <span className="rounded-[5px] bg-success px-2 py-0.5 text-[0.8rem] font-extrabold text-white">مفتوح</span>
                </div>
              </Link>
            );
          })}
        </div>
        {stores.length > 1 && (
          <>
            <SliderArrows onPrev={slider.prev} onNext={slider.next} />
            <div className="pointer-events-none absolute bottom-3 end-3 z-[2] flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <span className="flex h-1 w-14 justify-end overflow-hidden rounded-full bg-white/35">
                <span className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${((slider.index + 1) / stores.length) * 100}%` }} />
              </span>
              <span dir="ltr">
                {slider.index + 1} / {stores.length}
              </span>
            </div>
          </>
        )}
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
        <Cover category={store} logoUrl={store.logoUrl} />
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
        {store.isOpen ? (store.minOrderAmount > 0 ? `أقل طلب ${formatPrice(store.minOrderAmount)}` : 'مفتوح') : 'مقفول دلوقتي'}
      </span>
      <span className="absolute inset-x-3 bottom-2 z-[1] truncate text-[1.1rem] font-black [text-shadow:0_1px_4px_rgb(0_0_0/0.5)]">{store.name}</span>
    </Link>
  );
}

export function NearestPanel({ stores, onAll }: { stores: NearbyStore[]; onAll: () => void }) {
  if (stores.length === 0) return null;
  return (
    <section className="container-site mt-8">
      <div className="rounded-[24px] bg-gradient-to-b from-[#6A3FB5] to-[#5B34A3] p-[0.9rem] pb-4 text-white shadow-[0_3px_12px_rgb(0_0_0/0.25)]">
        <div className="mb-3 flex items-center gap-2">
          <BookmarkCheck className="size-6 shrink-0 text-accent" />
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
