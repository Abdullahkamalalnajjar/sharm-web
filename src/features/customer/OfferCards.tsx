import { Clock, Tag } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { AppImage } from '@/components/ui';
import { t } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import type { OfferTile } from '@/types';

const CARD_WIDTH = 150;
const GAP = 12;

/** Time left in its largest unit ("5 ساعة"), for the chip on the photo. */
function timeLeft(endsAtUtc: string | null): string | null {
  if (!endsAtUtc) return null;
  const end = new Date(/Z|[+-]\d\d:?\d\d$/.test(endsAtUtc) ? endsAtUtc : `${endsAtUtc}Z`).getTime();
  const minutes = Math.floor((end - Date.now()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes >= 1440) return t('{n} يوم', { n: Math.floor(minutes / 1440) });
  if (minutes >= 60) return t('{n} ساعة', { n: Math.floor(minutes / 60) });
  return t('{n} دقيقة', { n: minutes });
}

/** An offer like in the apps: its photo filling a tall card, the title and store over a dark fade, a gold chip. */
export function OfferCard({ offer }: { offer: OfferTile }) {
  const title = localized(offer.title, offer.titleEn, offer.titleRu, offer.titleTr, offer.titleIt);
  const left = timeLeft(offer.endsAtUtc);
  return (
    <Link
      to={`/offers/${offer.id}`}
      aria-label={title}
      className="relative block h-[190px] shrink-0 overflow-hidden rounded-[22px] bg-surface-alt shadow-[0_4px_10px_rgb(0_0_0/0.16)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ width: CARD_WIDTH }}
    >
      <AppImage url={offer.imageUrl} alt={title} fallback={<Tag className="m-auto mt-16 size-10 text-accent" />} className="size-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a0509cc]" />
      <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 rounded-full bg-[#F2C14E] px-2 py-1 text-[11px] font-extrabold text-[#3B0A16]">
        {left ? <Clock className="size-3.5" /> : <Tag className="size-3.5" />}
        {left}
      </span>
      <span className="absolute inset-x-3 bottom-3 text-white">
        <span className="line-clamp-2 text-sm font-extrabold leading-tight">{title}</span>
        {offer.storeName && <span className="mt-0.5 block truncate text-[11.5px] text-white/80">{offer.storeName}</span>}
      </span>
    </Link>
  );
}

/**
 * A row of offers that moves on by one card every 3 s in an endless loop (the list is repeated, so it never jumps
 * back). A touch or the mouse over it pauses it; it can still be scrolled by hand. Still when the visitor asks
 * for less motion, or with one offer.
 */
export function AutoSwipeOffers({ offers }: { offers: OfferTile[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resume = useRef<number | undefined>(undefined);
  const loops = offers.length > 1;
  // Enough copies to keep scrolling: the position is reset by one copy's width when it passes it.
  const copies = loops ? 4 : 1;

  useEffect(() => {
    if (!loops || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    const step = CARD_WIDTH + GAP;
    const copyWidth = offers.length * step;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const timer = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      // In RTL the scroll position runs negative.
      const pos = Math.abs(el.scrollLeft);
      if (pos >= copyWidth * 2) el.scrollLeft = (rtl ? -1 : 1) * (pos - copyWidth);
      const next = (Math.floor(Math.abs(el.scrollLeft) / step) + 1) * step;
      el.scrollTo({ left: (rtl ? -1 : 1) * next, behavior: 'smooth' });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loops, offers.length]);

  const pause = () => {
    window.clearTimeout(resume.current);
    paused.current = true;
  };
  const resumeLater = () => {
    window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => (paused.current = false), 2000);
  };

  return (
    <div
      ref={ref}
      onPointerDown={pause}
      onPointerUp={resumeLater}
      onPointerLeave={resumeLater}
      onMouseEnter={pause}
      onMouseLeave={resumeLater}
      className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pt-1 pb-3 sm:mx-0 sm:px-0"
    >
      {Array.from({ length: copies }, (_, c) =>
        offers.map((o) => <OfferCard key={`${c}-${o.id}`} offer={o} />),
      )}
    </div>
  );
}
