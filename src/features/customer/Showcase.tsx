import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';

import { AppImage, Price } from '@/components/ui';
import { applyDiscount, formatPrice } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useLoginPrompt } from '@/store/ui';
import type { Product } from '@/types';

// ---------- Prices ----------

/** A product's base price after its discount, and the price before it (null when not discounted). */
export function productPrices(product: Product): { price: number; full: number | null } {
  if (product.discountPercent <= 0) return { price: product.price, full: null };
  return { price: product.finalPrice ?? applyDiscount(product.price, product.discountPercent), full: product.price };
}

/** Price with the price before the discount struck through next to it. The font size comes from `className`. */
export function DiscountedPrice({
  value,
  full,
  prefix,
  className,
  priceClassName,
  strikeClassName = 'text-ink-3',
}: {
  value: number;
  full?: number | null;
  prefix?: string;
  className?: string;
  priceClassName?: string;
  strikeClassName?: string;
}) {
  const discounted = full != null && full > value;
  return (
    <span className={clsx('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      <Price value={value} prefix={prefix} className={priceClassName} />
      {discounted && <s className={clsx('text-[0.72em] font-semibold', strikeClassName)}>{formatPrice(full)}</s>}
    </span>
  );
}

// ---------- Custom order ----------

export const CUSTOM_ORDER_LOGIN_REASON = 'عشان تطلب أي حاجة مش موجودة في المحلات، واحنا نجيبهالك.';

/** The custom order (طلب خاص): guests see it too, but sign in before writing one. */
export function useOpenCustomOrder() {
  const signedIn = useAuth((s) => s.session !== null);
  const openLogin = useLoginPrompt((s) => s.open);
  const navigate = useNavigate();
  return () => (signedIn ? navigate('/custom-order') : openLogin(CUSTOM_ORDER_LOGIN_REASON));
}

// ---------- Grid card ----------

/** Phones two across, more on wider screens. */
export const SHOWCASE_GRID = 'grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

/**
 * Grid card: a big rounded photo, a small badge on its bottom edge, the title and subtitle centered,
 * and a footer (e.g. the price) with a round `action` at the end. `dimmed` fades the photo (closed / sold out).
 */
export function ShowcaseCard({
  image,
  title,
  subtitle,
  badge,
  badgeClassName = 'bg-brand-dark text-white',
  footer,
  action,
  to,
  onClick,
  dimmed,
}: {
  image: ReactNode;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  badgeClassName?: string;
  footer: ReactNode;
  action?: ReactNode;
  to?: string;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const body = (
    <>
      <div className="relative h-[128px] sm:h-[150px]">
        <div className={clsx('absolute inset-0 overflow-hidden rounded-[20px] bg-surface-alt', dimmed && 'opacity-45')}>{image}</div>
        {badge && (
          <span
            className={clsx(
              'absolute -bottom-[11px] left-1/2 z-[1] max-w-[92%] -translate-x-1/2 truncate whitespace-nowrap rounded-full border-2 border-surface px-2.5 py-px text-[11px] font-extrabold',
              badgeClassName,
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-[18px] truncate text-center text-[15px] font-extrabold text-ink">{title}</h3>
      {subtitle && <p className="mt-0.5 truncate text-center text-xs text-ink-3">{subtitle}</p>}
      <span className="min-h-2 flex-1" />
      <div className="flex min-h-9 items-center gap-2">
        <div className="min-w-0 flex-1 text-start">{footer}</div>
        {action}
      </div>
    </>
  );
  const className = clsx(
    'flex h-full w-full min-w-0 flex-col rounded-[26px] border border-line bg-surface p-2.5 text-start shadow-card transition-all',
    (to || onClick) && 'hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]',
    !to && !onClick && 'cursor-default',
  );
  if (to)
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={className}>
      {body}
    </button>
  );
}

/** The round "+" / "↗" at the end of a ShowcaseCard. */
export function ShowcaseAction({ icon: Icon, size = 36 }: { icon: LucideIcon | ((props: React.SVGProps<SVGSVGElement>) => ReactNode); size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand" style={{ width: size, height: size }}>
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

// ---------- Arc picker ----------

export interface ArcPickerItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the circle instead of the icon when set. */
  imageUrl?: string | null;
  color?: string;
}

const ARC_HEIGHT = 178;
const ARC_CIRCLE = 80;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Category circles laid along an arc on a thin curved line: the centered one is the selection,
 * bigger and higher, with its label underlined. Dragging, a sideways wheel, the arrow keys or a
 * click center (select) an item. With 3+ items it loops, so the selection always has neighbours.
 */
export function ArcPicker({
  items,
  selectedIndex,
  onSelect,
  label,
}: {
  items: ArcPickerItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  const count = items.length;
  const loops = count >= 3;
  const boxRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const [width, setWidth] = useState(360);
  // Fractional position: the virtual index at the middle. Virtual index k shows item k mod count.
  const [pos, setPosState] = useState(selectedIndex);
  const posRef = useRef(selectedIndex);
  const frame = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; pos: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const wheelTimer = useRef<number | null>(null);
  const selected = useRef({ selectedIndex, onSelect });
  selected.current = { selectedIndex, onSelect };

  const spacing = Math.min(Math.max(width * 0.29, 92), 124);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const setPos = useCallback(
    (p: number) => {
      const next = loops ? p : Math.min(Math.max(p, 0), count - 1);
      posRef.current = next;
      setPosState(next);
    },
    [loops, count],
  );

  /** Reports the item where a move settles (not every item passed on the way). */
  const settle = useCallback(() => {
    const item = mod(Math.round(posRef.current), count);
    if (item !== selected.current.selectedIndex) selected.current.onSelect(item);
  }, [count]);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const animateTo = useCallback(
    (target: number) => {
      stop();
      const from = posRef.current;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 300);
        setPos(from + (target - from) * (1 - (1 - t) ** 3));
        if (t < 1) frame.current = requestAnimationFrame(step);
        else {
          frame.current = null;
          settle();
        }
      };
      frame.current = requestAnimationFrame(step);
    },
    [setPos, settle],
  );

  // Selected from elsewhere (e.g. the filter sheet): bring the nearest copy of it to the middle.
  useEffect(() => {
    if (drag.current || count === 0) return;
    const current = Math.round(posRef.current);
    if (mod(current, count) === selectedIndex) return;
    let delta = selectedIndex - mod(current, count);
    if (loops && Math.abs(delta) > count / 2) delta -= Math.sign(delta) * count;
    animateTo(current + delta);
  }, [selectedIndex, count, loops, animateTo]);

  // Sideways wheel / trackpad swipes move the arc; vertical ones keep scrolling the page.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      stop();
      setPos(posRef.current - e.deltaX / spacing);
      if (wheelTimer.current !== null) clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => animateTo(Math.round(posRef.current)), 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [spacing, setPos, animateTo]);

  useEffect(() => () => stop(), []);

  const onKeyDown = (e: KeyboardEvent) => {
    // Right-to-left: the next item is to the left.
    const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    animateTo(Math.round(posRef.current) + dir);
  };

  if (count === 0) return null;

  // Every virtual index that can be on screen.
  const reach = Math.ceil(width / 2 / spacing) + 1;
  const visible: number[] = [];
  for (let k = Math.floor(pos) - reach; k <= Math.ceil(pos) + reach; k++) if (loops || (k >= 0 && k < count)) visible.push(k);

  return (
    <div
      ref={boxRef}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative mx-auto w-full max-w-[600px] touch-pan-y select-none overflow-hidden"
      style={{ height: ARC_HEIGHT }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        stop();
        drag.current = { id: e.pointerId, x: e.clientX, pos: posRef.current, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) > 6) {
          d.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        // Items follow the finger; right-to-left, so dragging right brings the next ones in.
        if (d.moved) setPos(d.pos + dx / spacing);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d?.moved) return;
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        e.currentTarget.releasePointerCapture(e.pointerId);
        animateTo(Math.round(posRef.current));
      }}
      onPointerCancel={() => {
        if (!drag.current) return;
        drag.current = null;
        animateTo(Math.round(posRef.current));
      }}
    >
      <ArcLine width={width} gradientId={gradientId} />
      {visible.map((k) => {
        const offset = k - pos;
        const d = Math.min(Math.abs(offset), 2);
        const item = items[mod(k, count)];
        return (
          <ArcItem
            key={k}
            item={item}
            selected={Math.abs(offset) < 0.5}
            scale={1 - 0.16 * d}
            // Lower and smaller away from the middle, following the curve.
            dy={18 + 16 * d * d}
            x={width / 2 - offset * spacing - spacing / 2}
            // Items reaching the edges fade out instead of showing a clipped label.
            opacity={1 - Math.min(1, Math.max(0, Math.abs(offset) - 1.4) / 0.6)}
            width={spacing}
            onClick={() => {
              if (suppressClick.current) return;
              animateTo(k);
            }}
          />
        );
      })}
    </div>
  );
}

function ArcItem({
  item,
  selected,
  scale,
  dy,
  x,
  width,
  opacity,
  onClick,
}: {
  item: ArcPickerItem;
  selected: boolean;
  scale: number;
  dy: number;
  x: number;
  width: number;
  opacity: number;
  onClick: () => void;
}) {
  const color = item.color ?? 'var(--color-brand)';
  const placeholder = (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 35%, transparent), var(--color-surface))` }}
    >
      <item.icon style={{ width: ARC_CIRCLE * 0.38, height: ARC_CIRCLE * 0.38, color }} />
    </span>
  );
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="group absolute top-0 flex flex-col items-center outline-none"
      style={{ left: x, width, opacity, transform: `translateY(${dy}px)` }}
      tabIndex={opacity < 0.5 ? -1 : undefined}
    >
      {/* Ring (brand gradient when selected) with a gap, then the photo. */}
      <span
        className={clsx(
          'grid shrink-0 place-items-center rounded-full p-[3px] transition-[background,box-shadow] duration-200 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand',
          selected ? 'bg-gradient-to-b from-brand-light to-brand-dark shadow-[0_5px_18px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]' : 'bg-surface-high shadow-card',
        )}
        style={{ width: ARC_CIRCLE, height: ARC_CIRCLE, transform: `scale(${scale})` }}
      >
        <span className={clsx('block size-full rounded-full bg-bg transition-[padding] duration-200', selected && 'p-[3px]')}>
          <span className="relative block size-full overflow-hidden rounded-full">
            {placeholder}
            {item.imageUrl && <AppImage url={item.imageUrl} alt={item.label} fallback={null} className="absolute inset-0" />}
          </span>
        </span>
      </span>
      <span
        className={clsx(
          'mt-2 max-w-full truncate px-1 leading-tight transition-colors',
          selected ? 'text-[14.5px] font-extrabold text-ink' : 'text-[12.5px] font-semibold text-ink-3 group-hover:text-ink-2',
        )}
      >
        {item.label}
      </span>
      <span className={clsx('mt-[5px] h-[3px] rounded-sm bg-brand transition-all duration-200', selected ? 'w-[22px]' : 'w-0')} />
    </button>
  );
}

/** One thin brand curve behind the circles with a faint glow, fading out at both sides. */
function ArcLine({ width, gradientId }: { width: number; gradientId: string }) {
  const height = ARC_HEIGHT - 34;
  const cx = width / 2;
  const cy = width * 0.95;
  const rx = width * 1.2;
  const ry = width * 0.95;
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-[34px]" width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={width} y1={0} y2={0}>
          <stop offset="0" style={{ stopColor: 'var(--color-brand)', stopOpacity: 0 }} />
          <stop offset="0.5" style={{ stopColor: 'var(--color-brand)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-brand)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={`url(#${gradientId})`} strokeWidth={14} opacity={0.22} style={{ filter: 'blur(8px)' }} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={`url(#${gradientId})`} strokeWidth={1.5} />
    </svg>
  );
}
