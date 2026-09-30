import { BookOpen, Pencil, Store, PlusSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { storesApi } from '@/api';
import { keys, useMyStores } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, SoftCard, StatusChip, Switch } from '@/components/ui';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { storeStatus, storeType } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import type { Store as StoreModel } from '@/types';

export function OwnerStoresPage() {
  const stores = useMyStores();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28">
      <TabHeader
        title="محلاتي"
        actions={
          <Button size="sm" icon={<PlusSquare className="size-4" />} onClick={() => navigate('/owner/stores/new')} className="hidden md:inline-flex">
            محل جديد
          </Button>
        }
      />
      {stores.isLoading ? (
        <Loading />
      ) : stores.isError ? (
        <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
      ) : stores.data!.length === 0 ? (
        <EmptyView icon={Store} message="لسه مسجلتش أي محل" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stores.data!.map((s) => (
            <OwnerStoreCard key={s.id} store={s} basePath="/owner" />
          ))}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-24 z-30 px-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<PlusSquare className="size-5" />} onClick={() => navigate('/owner/stores/new')}>
            محل جديد
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OwnerStoreCard({ store, basePath }: { store: StoreModel; basePath: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isActive = store.status === 'Active';
  const status = storeStatus(store.status);

  async function toggleOpen(open: boolean) {
    if (await runAction(() => storesApi.setOpen(store.id, open), open ? 'المحل اتفتح' : 'المحل اتقفل')) {
      qc.invalidateQueries({ queryKey: keys.myStores });
    }
  }

  return (
    <SoftCard className="p-3.5">
      <div className="flex items-center gap-3">
        <StoreAvatar type={store.type} logoUrl={store.logoUrl} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-ink">{store.name}</p>
          <p className="text-[13px] text-ink-2">{storeType(store.type).label}</p>
        </div>
        <StatusChip label={status.label} color={status.color} />
      </div>
      {!isActive && (
        <p className="mt-2.5 text-[13px] text-ink-2">
          {store.status === 'PendingApproval' ? 'المحل مستني موافقة الأدمن قبل ما تقدر تفتحه.' : 'المحل موقوف من الإدارة.'}
        </p>
      )}
      <div className="my-3 border-t border-line" />
      <div className="flex items-center gap-2">
        <Switch checked={store.isOpen} disabled={!isActive} onChange={toggleOpen} label="مفتوح" />
        <span className="font-bold text-ink">{store.isOpen ? 'مفتوح' : 'مقفول'}</span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={() => navigate(`${basePath}/stores/${store.id}/edit`)}>
          تعديل
        </Button>
        <Button variant="secondary" size="sm" icon={<BookOpen className="size-4" />} onClick={() => navigate(`${basePath}/stores/${store.id}/menu`)}>
          المنيو
        </Button>
      </div>
    </SoftCard>
  );
}
