import { Gift, Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';

import { offersApi } from '@/api';
import { useRefreshOffers, useStore, useStoreOffers } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading } from '@/components/ui';
import { runAction } from '@/lib/run-action';
import type { OfferAdmin } from '@/types';

import { OfferFormSheet, OfferRow, deleteOffer, offerSaveBody } from './OfferEditor';

/** A store's daily offers (العروض): its own products shown as a tile on the customers' home. */
export function StoreOffersPage() {
  const storeId = Number(useParams().id);
  const store = useStore(storeId);
  const offers = useStoreOffers(storeId);
  const refresh = useRefreshOffers();
  const [editing, setEditing] = useState<OfferAdmin | null | undefined>(undefined); // undefined = closed, null = new
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggle(o: OfferAdmin, active: boolean) {
    setBusyId(o.id);
    // Owners have no separate switch endpoint: the offer is saved as it is with the new state.
    if (await runAction(() => offersApi.updateForStore(storeId, o.id, offerSaveBody(o, { isActive: active })), active ? 'العرض ظاهر' : 'العرض اتخفى'))
      refresh();
    setBusyId(null);
  }

  async function remove(o: OfferAdmin) {
    setBusyId(o.id);
    if (await deleteOffer(o, false)) refresh();
    setBusyId(null);
  }

  const list = offers.data ?? [];

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={store.data ? `عروض ${store.data.name}` : 'العروض'}
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            عرض جديد
          </Button>
        }
      />
      <div className="px-4">
        {offers.isLoading ? (
          <Loading />
        ) : offers.isError ? (
          <ErrorView message={(offers.error as Error).message} onRetry={() => offers.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView
            icon={Gift}
            message={'مفيش عروض لسه.\nالعرض صورة بتظهر للزباين في "العروض اليومية" وبتوديهم لمنتجاتك.'}
            action={
              <Button size="md" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
                عرض جديد
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm leading-relaxed text-ink-2">
              العرض بيظهر للزباين على طول. الخصم نفسه بيتظبط من المنيو (خصم المنتج)، والعرض بيجمّع المنتجات في صورة واحدة.
            </p>
            <div className="flex flex-col gap-2.5">
              {list.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
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
            عرض جديد
          </Button>
        </div>
      </div>

      <OfferFormSheet
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        offer={editing ?? null}
        storeId={storeId}
        storeName={store.data?.name}
        asAdmin={false}
        onClose={() => setEditing(undefined)}
        onSaved={refresh}
      />
    </div>
  );
}
