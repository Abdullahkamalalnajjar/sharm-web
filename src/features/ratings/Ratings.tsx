import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { ordersApi } from '@/api';
import { keys, useStore, useStoreRatings } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, Sheet, SoftCard, TextArea } from '@/components/ui';
import { parseUtc } from '@/lib/notifications';
import { runAction } from '@/lib/run-action';
import type { Order, OrderStoreGroup } from '@/types';

const STAR = '#F5A623';
const LABELS = ['', 'وحش', 'مش أحسن حاجة', 'كويس', 'حلو جداً', 'ممتاز'];

/** "★ 4.5 (12)"; nothing when the store has no ratings yet. */
export function RatingBadge({ average, count, onDark, className }: { average: number; count: number; onDark?: boolean; className?: string }) {
  if (!count) return null;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-extrabold', onDark ? 'text-white' : 'text-ink', className)}>
      <Star className="size-3.5" fill={STAR} stroke={STAR} />
      {average.toFixed(1)}
      <span className={clsx('font-medium', onDark ? 'text-white/70' : 'text-ink-3')}>({count})</span>
    </span>
  );
}

/** Read-only row of stars. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} fill={i <= value ? STAR : 'none'} stroke={STAR} />
      ))}
    </span>
  );
}

/** On a delivered order: rate each of its stores (or change the rating). */
export function RateOrderCard({ order }: { order: Order }) {
  const [rating, setRating] = useState<OrderStoreGroup | null>(null);
  const allRated = order.stores.every((s) => s.myStars != null);

  return (
    <SoftCard className="p-4">
      <div className="flex items-center gap-2">
        <Star className="size-5" fill={STAR} stroke={STAR} />
        <h3 className="font-extrabold text-ink">{allRated ? 'شكراً على تقييمك' : 'قيّم المحلات'}</h3>
      </div>
      {!allRated && <p className="mt-1 text-[13px] text-ink-2">رأيك بيساعد الزباين التانيين يختاروا.</p>}
      <div className="mt-2 flex flex-col">
        {order.stores.map((s) => (
          <button
            key={s.storeId}
            type="button"
            onClick={() => setRating(s)}
            className="flex items-center gap-3 rounded-xl px-1 py-2.5 text-start hover:bg-surface-alt"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-ink">{s.storeName}</span>
              <Stars value={s.myStars ?? 0} size={20} />
            </span>
            <span className="font-extrabold text-brand-ink">{s.myStars == null ? 'قيّم' : 'عدّل'}</span>
          </button>
        ))}
      </div>
      <Sheet open={rating !== null} onClose={() => setRating(null)} title={rating ? `إيه رأيك في ${rating.storeName}؟` : ''}>
        {rating && <RateForm key={rating.storeId} order={order} store={rating} onClose={() => setRating(null)} />}
      </Sheet>
    </SoftCard>
  );
}

function RateForm({ order, store, onClose }: { order: Order; store: OrderStoreGroup; onClose: () => void }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(store.myStars ?? 0);
  const [comment, setComment] = useState(store.myComment ?? '');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stars) return;
    setBusy(true);
    const ok = await runAction(async () => {
      const updated = await ordersApi.rateMine(order.id, [{ storeId: store.storeId, stars, comment: comment.trim() || null }]);
      qc.setQueryData(keys.myOrder(order.id), updated);
    }, 'شكراً! التقييم اتسجّل');
    setBusy(false);
    if (ok) {
      qc.invalidateQueries({ queryKey: ['stores'] });
      onClose();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="عدد النجوم">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i}`} onClick={() => setStars(i)} className="p-0.5">
            <Star className="size-10" fill={i <= stars ? STAR : 'none'} stroke={STAR} />
          </button>
        ))}
      </div>
      <p className="h-5 text-center font-bold text-ink-2">{LABELS[stars]}</p>
      <TextArea
        name="comment"
        label="تعليق (اختياري)"
        rows={3}
        maxLength={500}
        placeholder="الأكل، التغليف، الكميات..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button type="submit" block loading={busy} disabled={!stars}>
        إرسال التقييم
      </Button>
    </form>
  );
}

/** Everything customers said about a store, newest first. */
export function StoreRatingsPage() {
  const id = Number(useParams().id);
  const store = useStore(id);
  const ratings = useStoreRatings(id);
  const first = ratings.data?.pages[0];
  const items = ratings.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={store.data ? `تقييمات ${store.data.name}` : 'التقييمات'} />
      <div className="flex flex-col gap-3 px-4">
        {ratings.isLoading ? (
          <Loading />
        ) : ratings.isError || !first ? (
          <ErrorView message={(ratings.error as Error)?.message ?? 'حصل خطأ'} onRetry={() => ratings.refetch()} />
        ) : (
          <>
            <SoftCard className="flex items-center gap-4 p-4">
              <span className="text-[40px] font-black text-ink">{first.count ? first.average.toFixed(1) : '—'}</span>
              <span>
                <Stars value={Math.round(first.average)} size={22} />
                <span className="block text-ink-2">{first.count ? `${first.count} تقييم` : 'لسه محدش قيّم'}</span>
              </span>
            </SoftCard>
            {items.length === 0 ? (
              <EmptyView icon={Star} message="لسه مفيش تقييمات للمحل ده" />
            ) : (
              items.map((r) => (
                <SoftCard key={r.id} className="p-4">
                  <div className="flex items-center">
                    <Stars value={r.stars} />
                    <span className="flex-1" />
                    <span className="text-xs text-ink-3">
                      {parseUtc(r.createdUtc).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 leading-relaxed text-ink">{r.comment}</p>}
                </SoftCard>
              ))
            )}
            {ratings.hasNextPage && (
              <Button variant="ghost" loading={ratings.isFetchingNextPage} onClick={() => ratings.fetchNextPage()}>
                اعرض أقدم
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
