import clsx from 'clsx';
import { CalendarClock, EyeOff, Gift, Globe, Package, Pencil, Plus, Search, SearchX, Store, Trash2, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { offersApi } from '@/api';
import { useAdminOffers, useRefreshOffers } from '@/api/queries';
import { AppImage, Button, EmptyView, ErrorView, Loading, SoftCard, StatusChip, Switch } from '@/components/ui';
import { OfferFormSheet, deleteOffer, isExpired } from '@/features/owner/OfferEditor';
import { formatOrderDate } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { OfferAdmin } from '@/types';

type Filter = 'all' | 'platform' | 'stores' | 'hidden' | 'expired';

function passes(o: OfferAdmin, f: Filter): boolean {
  if (f === 'platform') return o.storeId === null;
  if (f === 'stores') return o.storeId !== null;
  if (f === 'hidden') return !o.isActive;
  if (f === 'expired') return isExpired(o);
  return true;
}

const ownerLabel = (o: OfferAdmin) => (o.storeId === null ? t('عرض عام') : (o.storeName ?? t('محل #{n}', { n: o.storeId })));

/** Every daily offer: the admin's platform offers and the stores' own. Hide / show, edit, delete, add platform offers. */
export function AdminOffersPage() {
  const offers = useAdminOffers();
  const refresh = useRefreshOffers();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<OfferAdmin | null | undefined>(undefined); // undefined = closed, null = new
  const [busyId, setBusyId] = useState<number | null>(null);

  const all = offers.data ?? [];
  const q = query.trim().toLowerCase();
  const list = all.filter(
    (o) =>
      passes(o, filter) &&
      (!q || [o.title, o.storeName, ...o.stores.map((s) => s.name), ...o.products.map((p) => p.name)].some((f) => f?.toLowerCase().includes(q))),
  );
  const nextOrder = all.reduce((max, o) => Math.max(max, o.displayOrder), 0) + 1;
  const live = all.filter((o) => o.isActive && !isExpired(o)).length;

  async function toggle(o: OfferAdmin, active: boolean) {
    setBusyId(o.id);
    if (await runAction(() => offersApi.setActive(o.id, active), active ? t('العرض ظاهر') : t('العرض اتخفى'))) refresh();
    setBusyId(null);
  }

  async function remove(o: OfferAdmin) {
    setBusyId(o.id);
    if (await deleteOffer(o, true)) refresh();
    setBusyId(null);
  }

  const stats: { key: Filter; label: string; color: string; icon: LucideIcon }[] = [
    { key: 'all', label: t('كل العروض'), color: 'var(--color-brand)', icon: Gift },
    { key: 'platform', label: t('عروض عامة'), color: 'var(--color-series-1)', icon: Globe },
    { key: 'stores', label: t('عروض المحلات'), color: 'var(--color-accent)', icon: Store },
    { key: 'hidden', label: t('مخفية'), color: 'var(--color-ink-3)', icon: EyeOff },
    { key: 'expired', label: t('منتهية'), color: 'var(--color-warning)', icon: CalendarClock },
  ];

  return (
    <div className="pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('العروض')}</h1>
          <p className="text-[13px] font-medium text-ink-3">
            {offers.data ? t('{n} عرض ظاهر للزبون دلوقتي', { n: live }) : t('العروض اليومية في رئيسية الزبون')}
          </p>
        </div>
        <Button size="md" icon={<Plus className="size-4" />} title={t('عرض عام جديد')} onClick={() => setEditing(null)}>
          <span className="hidden sm:inline">{t('عرض عام جديد')}</span>
        </Button>
      </div>

      <div className="px-4 pt-4">
        {offers.isLoading ? (
          <Loading />
        ) : offers.isError ? (
          <ErrorView message={(offers.error as Error).message} onRetry={() => offers.refetch()} />
        ) : all.length === 0 ? (
          <EmptyView icon={Gift} message={t('مفيش عروض لسه.\nضيف عرض عام من أي محلات ومنتجات.')} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* The counts double as filters. */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((s) => {
                const selected = filter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilter(s.key)}
                    aria-pressed={selected}
                    className={clsx(
                      'flex items-center gap-3 rounded-card border bg-surface p-3.5 text-start shadow-card transition-colors',
                      selected ? 'border-brand ring-1 ring-brand' : 'border-transparent hover:bg-surface-alt',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[22px] font-extrabold leading-tight text-ink tabular-nums">{all.filter((o) => passes(o, s.key)).length}</span>
                      <span className="block truncate text-xs font-semibold text-ink-2">{s.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand md:w-[380px]">
                <Search className="size-5 text-ink-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('دور باسم العرض أو المحل أو المنتج')}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
                />
                {query && (
                  <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
                    <X className="size-5" />
                  </button>
                )}
              </label>
              <p className="text-xs leading-relaxed text-ink-3 md:max-w-md md:text-end">
                {t('عروض المحلات بتظهر على طول من غير موافقة؛ تقدر تخفي أي عرض بالزرار. الترتيب: الأصغر الأول، وبعدين الأحدث.')}
              </p>
            </div>

            {list.length === 0 ? (
              <EmptyView
                icon={q ? SearchX : Gift}
                message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : filter === 'stores' ? t('مفيش محل عامل عروض لسه') : t('مفيش عروض هنا')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {list.map((o) => (
                  <OfferCard key={o.id} offer={o} busy={busyId === o.id} onEdit={() => setEditing(o)} onToggle={(v) => toggle(o, v)} onDelete={() => remove(o)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <OfferFormSheet
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        offer={editing ?? null}
        // A store's offer stays that store's (its products only); a new one from here is a platform offer.
        storeId={editing?.storeId ?? null}
        storeName={editing?.storeName ?? undefined}
        asAdmin
        defaultDisplayOrder={nextOrder}
        onClose={() => setEditing(undefined)}
        onSaved={refresh}
      />
    </div>
  );
}

/** An offer as a card: its picture, whose it is, what is in it, until when; show / hide, edit, delete. */
function OfferCard({
  offer: o,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  offer: OfferAdmin;
  busy: boolean;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const expired = isExpired(o);
  const platform = o.storeId === null;
  return (
    <SoftCard className="flex h-full flex-col overflow-hidden">
      <button type="button" onClick={onEdit} className={clsx('group flex flex-1 flex-col text-start', (!o.isActive || expired) && 'opacity-70')}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
          <div className="absolute inset-0 grid place-items-center text-ink-3">
            <Gift className="size-10 opacity-60" />
          </div>
          <AppImage url={o.imageUrl} alt={o.title} fallback={null} className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]" />
          <span className="absolute top-2.5 start-2.5 flex flex-wrap gap-1.5">
            {!o.isActive && <span className="rounded-full bg-surface/90 backdrop-blur-sm"><StatusChip label={t('مخفي')} color="var(--color-ink-3)" /></span>}
            {expired && <span className="rounded-full bg-surface/90 backdrop-blur-sm"><StatusChip label={t('منتهي')} color="var(--color-warning)" /></span>}
            {!o.imageUrl && <span className="rounded-full bg-surface/90 backdrop-blur-sm"><StatusChip label={t('من غير صورة')} color="var(--color-danger)" /></span>}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
          <span
            className="inline-flex w-fit max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold"
            style={{
              background: `color-mix(in srgb, ${platform ? 'var(--color-series-1)' : 'var(--color-accent)'} 15%, transparent)`,
              color: platform ? 'var(--color-series-1)' : 'var(--color-accent)',
            }}
          >
            {platform ? <Globe className="size-3.5 shrink-0" /> : <Store className="size-3.5 shrink-0" />}
            <span className="truncate">{ownerLabel(o)}</span>
          </span>
          <span className="line-clamp-2 font-extrabold leading-snug text-ink">{o.title}</span>
          <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-ink-2">
            {o.products.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Package className="size-3.5 text-ink-3" />
                {t('{n} منتج', { n: o.products.length })}
              </span>
            )}
            {o.stores.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Store className="size-3.5 text-ink-3" />
                {t('{n} محل', { n: o.stores.length })}
              </span>
            )}
            {o.products.length === 0 && o.stores.length === 0 && <span className="text-ink-3">{tIn('owner', 'فاضي')}</span>}
            <span className={clsx('inline-flex items-center gap-1', expired && 'text-warning')}>
              <CalendarClock className="size-3.5 text-ink-3" />
              {o.endsAtUtc
                ? expired
                  ? t('انتهى {date}', { date: formatOrderDate(o.endsAtUtc) })
                  : t('ينتهي {date}', { date: formatOrderDate(o.endsAtUtc) })
                : t('من غير تاريخ انتهاء')}
            </span>
          </span>
        </div>
      </button>
      <div className="flex items-center gap-2 border-t border-line bg-surface-alt/60 px-3 py-2">
        <Switch checked={o.isActive} disabled={busy} onChange={onToggle} label={o.isActive ? tIn('owner', 'إخفاء') : t('إظهار')} />
        <span className="text-[13px] text-ink-2">{o.isActive ? t('ظاهر') : t('مخفي')}</span>
        <span className="flex-1" />
        <button type="button" title={t('تعديل')} aria-label={t('تعديل')} onClick={onEdit} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface hover:text-ink">
          <Pencil className="size-[18px]" />
        </button>
        <button
          type="button"
          title={t('مسح')}
          aria-label={t('مسح')}
          disabled={busy}
          onClick={onDelete}
          className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="size-[18px]" />
        </button>
      </div>
    </SoftCard>
  );
}
