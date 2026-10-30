import { Gift, Plus } from 'lucide-react';
import { useState } from 'react';

import { offersApi } from '@/api';
import { useAdminOffers, useRefreshOffers } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, Segmented } from '@/components/ui';
import { OfferFormSheet, OfferRow, deleteOffer } from '@/features/owner/OfferEditor';
import { runAction } from '@/lib/run-action';
import type { OfferAdmin } from '@/types';

type Filter = 'all' | 'platform' | 'stores';

/** Every daily offer: the admin's platform offers and the stores' own. Hide / show, edit, delete, add platform offers. */
export function AdminOffersPage() {
  const offers = useAdminOffers();
  const refresh = useRefreshOffers();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<OfferAdmin | null | undefined>(undefined); // undefined = closed, null = new
  const [busyId, setBusyId] = useState<number | null>(null);

  const all = offers.data ?? [];
  const list = all.filter((o) => (filter === 'platform' ? o.storeId === null : filter === 'stores' ? o.storeId !== null : true));
  const nextOrder = all.reduce((max, o) => Math.max(max, o.displayOrder), 0) + 1;

  async function toggle(o: OfferAdmin, active: boolean) {
    setBusyId(o.id);
    if (await runAction(() => offersApi.setActive(o.id, active), active ? 'العرض ظاهر' : 'العرض اتخفى')) refresh();
    setBusyId(null);
  }

  async function remove(o: OfferAdmin) {
    setBusyId(o.id);
    if (await deleteOffer(o, true)) refresh();
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title="العروض"
        subtitle="العروض اليومية في رئيسية الزبون"
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            عرض عام جديد
          </Button>
        }
      />
      <div className="px-4">
        <div className="mb-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `الكل (${all.length})` },
              { value: 'platform', label: 'عروض عامة' },
              { value: 'stores', label: 'عروض المحلات' },
            ]}
          />
        </div>
        {offers.isLoading ? (
          <Loading />
        ) : offers.isError ? (
          <ErrorView message={(offers.error as Error).message} onRetry={() => offers.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView icon={Gift} message={filter === 'stores' ? 'مفيش محل عامل عروض لسه' : 'مفيش عروض لسه.\nضيف عرض عام من أي محلات ومنتجات.'} />
        ) : (
          <>
            <p className="mb-3 text-sm leading-relaxed text-ink-2">
              عروض المحلات بتظهر على طول من غير موافقة؛ تقدر تخفي أي عرض بالزرار. الترتيب: الأصغر الأول، وبعدين الأحدث.
            </p>
            <div className="flex flex-col gap-2.5">
              {list.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  storeLabel={o.storeId === null ? 'عرض عام' : (o.storeName ?? `محل #${o.storeId}`)}
                  busy={busyId === o.id}
                  onEdit={() => setEditing(o)}
                  onToggle={(v) => toggle(o, v)}
                  onDelete={() => remove(o)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-24 z-30 px-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<Plus className="size-5" />} onClick={() => setEditing(null)}>
            عرض عام جديد
          </Button>
        </div>
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
