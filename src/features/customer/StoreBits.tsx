import clsx from 'clsx';
import { MapPin, Navigation, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router';

import { AppImage, Price, StatusChip } from '@/components/ui';
import { STORE_TYPES, SHARM_AREAS, storeType } from '@/lib/meta';
import type { NearbyStore, StoreType } from '@/types';

/** Store cover filling its (relative) parent: the logo when there is one, else a dark tint of the type color with its icon. */
export function Cover({ type, logoUrl, className, iconSize = 56 }: { type: StoreType; logoUrl: string | null; className?: string; iconSize?: number }) {
  const meta = storeType(type);
  return (
    <div className={clsx('absolute inset-0 overflow-hidden bg-surface-alt', className)}>
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${meta.color} 32%, transparent), var(--color-surface-alt))` }}
      >
        <meta.Icon style={{ width: iconSize, height: iconSize, color: meta.color, opacity: 0.85 }} />
      </div>
      <AppImage url={logoUrl} fallback={null} className="absolute inset-0" />
    </div>
  );
}

/** Store avatar tinted with the type's fixed color. */
export function StoreAvatar({ type, logoUrl, size = 56 }: { type: StoreType; logoUrl: string | null; size?: number }) {
  const meta = storeType(type);
  return (
    <div
      className="relative shrink-0 overflow-hidden grid place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `color-mix(in srgb, ${meta.color} 18%, transparent)`,
        color: meta.color,
      }}
    >
      <meta.Icon style={{ width: size * 0.48, height: size * 0.48 }} />
      <AppImage url={logoUrl} fallback={null} className="absolute inset-0" />
    </div>
  );
}

export function TypeTag({ type }: { type: StoreType }) {
  const meta = storeType(type);
  return (
    <span className="pill bg-surface-alt text-ink text-[11.5px]">
      <meta.Icon className="size-3.5" style={{ color: meta.color }} />
      {meta.label}
    </span>
  );
}

export function RedCircle({ size = 42, icon: Icon = ArrowOut }: { size?: number; icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> }) {
  return (
    <span className="grid place-items-center rounded-full bg-brand text-white shadow-brand shrink-0" style={{ width: size, height: size }}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

/** Portrait card in the "open now" carousel: name and minimum order over the cover. */
export function OpenStoreCard({ store }: { store: NearbyStore }) {
  return (
    <Link
      to={`/store/${store.id}`}
      className="relative block w-[166px] h-[210px] shrink-0 overflow-hidden rounded-card border border-line hover:border-surface-high snap-start"
    >
      <Cover type={store.type} logoUrl={store.logoUrl} />
      <div className="absolute inset-0 scrim" />
      <div className="absolute inset-0 p-3 flex flex-col">
        <h3 className="font-extrabold text-white text-[15px] truncate">{store.name}</h3>
        {store.minOrderAmount > 0 ? (
          <Price value={store.minOrderAmount} prefix="من" className="text-[12.5px]" />
        ) : (
          <span className="text-xs text-white/85">{storeType(store.type).label}</span>
        )}
        <span className="flex-1" />
        <div className="flex items-center gap-1 text-white text-xs font-semibold">
          <Navigation className="size-3.5 text-brand-light" />
          {store.distanceKm.toFixed(1)} كم
          <span className="flex-1" />
          <RedCircle size={34} icon={ArrowOut} />
        </div>
      </div>
    </Link>
  );
}

function ArrowOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Full-width store card for the nearby list. */
export function StoreCard({ store }: { store: NearbyStore }) {
  return (
    <Link to={`/store/${store.id}`} className="card block overflow-hidden hover:border-surface-high transition-colors">
      <div className="relative h-[150px]">
        <Cover type={store.type} logoUrl={store.logoUrl} className={clsx(!store.isOpen && 'opacity-45')} />
        <div className="absolute inset-0 scrim" />
        <div className="absolute top-3 start-3">
          <StatusChip label={store.isOpen ? 'مفتوح' : 'مقفول'} color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} />
        </div>
        <span className="absolute top-3 end-3 pill bg-black/55 text-white">
          <Navigation className="size-3.5 text-brand-light" />
          {store.distanceKm.toFixed(1)} كم
        </span>
        <h3 className="absolute inset-x-3.5 bottom-2.5 text-lg font-black text-white truncate">{store.name}</h3>
      </div>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] text-ink-2">{store.address}</p>
          <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
            <TypeTag type={store.type} />
            {store.minOrderAmount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-2">
                <ShoppingBag className="size-3.5 text-ink-3" />
                أقل طلب <Price value={store.minOrderAmount} className="text-xs" />
              </span>
            )}
          </div>
        </div>
        {store.isOpen ? (
          <RedCircle icon={ArrowOut} />
        ) : (
          <span className="text-[11px] font-bold text-ink-3 text-center leading-tight">
            مقفول
            <br />
            دلوقتي
          </span>
        )}
      </div>
    </Link>
  );
}

/** Rounded-square category tile; the selected one gets a red frame and tint. */
export function TypeTiles({ selected, onSelect }: { selected: StoreType | null; onSelect: (t: StoreType | null) => void }) {
  const tiles = [
    { value: null as StoreType | null, label: 'الكل', Icon: UtensilsCrossed, color: 'var(--color-accent)' },
    ...STORE_TYPES.map((t) => ({ value: t.value as StoreType | null, label: t.label, Icon: t.Icon, color: t.color })),
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
      {tiles.map((t) => {
        const isSelected = selected === t.value;
        return (
          <button
            key={t.label}
            type="button"
            onClick={() => onSelect(isSelected && t.value !== null ? null : t.value)}
            className={clsx(
              'aspect-[0.92] sm:aspect-[1.4] rounded-[18px] border flex flex-col items-center justify-end pb-2 transition-all',
              isSelected ? 'border-brand border-[1.6px]' : 'border-line hover:border-surface-high',
            )}
            style={{
              background: isSelected
                ? 'linear-gradient(to bottom, rgb(239 42 42 / 0.45), rgb(184 20 27 / 0.6))'
                : `linear-gradient(to bottom, color-mix(in srgb, ${t.color} 22%, transparent), var(--color-surface))`,
            }}
          >
            <span className="flex-1 grid place-items-center">
              <t.Icon className="size-8" style={{ color: isSelected ? '#fff' : t.color }} />
            </span>
            <span className="text-xs font-bold text-ink truncate px-1">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const areaIcon = MapPin;
export const areas = SHARM_AREAS;
export const plusIcon = Plus;
