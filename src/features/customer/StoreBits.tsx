import clsx from 'clsx';
import { MapPin, Navigation, Plus } from 'lucide-react';
import { Link } from 'react-router';

import { AppImage, Price, StatusChip } from '@/components/ui';
import { storeStatusLabel } from '@/lib/format';
import { localized } from '@/lib/localized';
import { SHARM_AREAS, categoryOf } from '@/lib/meta';
import { RatingBadge } from '@/features/ratings/Ratings';
import type { CategoryRef, NearbyStore, Store } from '@/types';

import { ShowcaseAction, ShowcaseCard } from './Showcase';

/** Store cover filling its (relative) parent: the logo when there is one, else a dark tint of the category color with its icon. */
export function Cover({ category, logoUrl, className, iconSize = 56 }: { category: CategoryRef; logoUrl: string | null; className?: string; iconSize?: number }) {
  const meta = categoryOf(category);
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

/** Store avatar tinted with the category's fixed color. */
export function StoreAvatar({ category, logoUrl, size = 56 }: { category: CategoryRef; logoUrl: string | null; size?: number }) {
  const meta = categoryOf(category);
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

export function TypeTag({ category }: { category: CategoryRef }) {
  const meta = categoryOf(category);
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

/** Portrait card in the "open now" carousel: name and minimum order over the cover. A closed store is dimmed and marked closed. */
export function OpenStoreCard({ store }: { store: NearbyStore }) {
  return (
    <Link
      to={`/store/${store.id}`}
      className="relative block w-[166px] h-[210px] shrink-0 overflow-hidden rounded-card border border-line bg-surface hover:border-surface-high snap-start"
    >
      <Cover category={store} logoUrl={store.coverUrl ?? store.logoUrl} className={clsx(!store.isOpen && 'opacity-45')} />
      <div className="absolute inset-0 scrim" />
      <div className="absolute inset-0 p-3 flex flex-col">
        <h3 className="font-extrabold text-white text-[15px] truncate">{localized(store.name, store.nameEn, store.nameRu)}</h3>
        {store.minOrderAmount > 0 ? (
          <Price value={store.minOrderAmount} prefix="من" className="text-[12.5px] !text-highlight" />
        ) : (
          <span className="text-xs text-white/85">{store.categoryName}</span>
        )}
        <span className="flex-1" />
        <div className="flex items-center gap-1 text-white text-xs font-semibold">
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <RatingBadge average={store.ratingAverage} count={store.ratingsCount} onDark className="me-1.5 shrink-0" />
            {store.distanceKm !== null && (
              <>
                <Navigation className="size-3.5 shrink-0 text-brand-light" />
                <span className="truncate">{store.distanceKm.toFixed(1)} كم</span>
              </>
            )}
          </span>
          {store.isOpen ? <RedCircle size={34} icon={ArrowOut} /> : <StoreStatusChip store={store} onDark />}
        </div>
      </div>
    </Link>
  );
}

/** "مفتوح" in green; closed states ("مقفول", "بيفتح 10:00 ص", ...) muted. */
export function StoreStatusChip({ store, onDark, className }: { store: NearbyStore | Store; onDark?: boolean; className?: string }) {
  return (
    <StatusChip
      label={storeStatusLabel(store)}
      color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'}
      className={clsx('shrink-0 whitespace-nowrap', onDark && '!text-white bg-black/55', className)}
    />
  );
}

function ArrowOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Grid card of the store list: cover, open state badge, name, category and distance, then the rating or minimum order. */
export function StoreCard({ store }: { store: NearbyStore }) {
  return (
    <ShowcaseCard
      to={`/store/${store.id}`}
      dimmed={!store.isOpen}
      image={<Cover category={store} logoUrl={store.coverUrl ?? store.logoUrl} />}
      badge={storeStatusLabel(store)}
      badgeClassName={store.isOpen ? 'bg-success text-white' : 'bg-surface-alt text-ink-2'}
      title={localized(store.name, store.nameEn, store.nameRu)}
      subtitle={[store.categoryName, store.distanceKm !== null ? `${store.distanceKm.toFixed(1)} كم` : null].filter(Boolean).join(' • ')}
      footer={
        store.ratingsCount > 0 ? (
          <RatingBadge average={store.ratingAverage} count={store.ratingsCount} />
        ) : store.minOrderAmount > 0 ? (
          <Price value={store.minOrderAmount} prefix="من" className="text-[13px]" />
        ) : (
          <span className="text-xs font-bold text-ink-3">جديد</span>
        )
      }
      action={store.isOpen ? <ShowcaseAction icon={ArrowOut} /> : undefined}
    />
  );
}

export const areaIcon = MapPin;
export const areas = SHARM_AREAS;
export const plusIcon = Plus;

/** Open now, or closed but taking orders for later. */
export const canTakeOrders = (store: Store) => store.canAcceptOrders || (store.status === 'Active' && store.allowsScheduledOrders);
