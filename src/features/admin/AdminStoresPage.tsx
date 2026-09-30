import clsx from 'clsx';
import { Inbox, Plus, Search, SearchX, PlusSquare, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAdminStores } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, RoundIconButton } from '@/components/ui';
import { STORE_STATUSES, storeStatus } from '@/lib/meta';
import type { Store, StoreStatus } from '@/types';

import { AdminStoreCard } from './AdminStoreCard';

const GROUP_ORDER: StoreStatus[] = ['PendingApproval', 'Active', 'Suspended'];

/** All stores: search + status filters, grouped by status when unfiltered. */
export function AdminStoresPage() {
  const stores = useAdminStores();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as StoreStatus | null) ?? null;
  const [query, setQuery] = useState('');

  const all = stores.data ?? [];
  const openCount = all.filter((s) => s.status === 'Active' && s.isOpen).length;
  const q = query.trim().toLowerCase();
  const matches = (s: Store) => !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.phone.includes(q);
  const list = all.filter((s) => (filter === null || s.status === filter) && matches(s));
  const count = (status: StoreStatus | null) => (status === null ? all.length : all.filter((s) => s.status === status).length);

  const setFilter = (status: StoreStatus | null) => {
    if (status) params.set('status', status);
    else params.delete('status');
    setParams(params, { replace: true });
  };

  const groups: [StoreStatus, Store[]][] =
    filter === null ? GROUP_ORDER.map((s) => [s, list.filter((x) => x.status === s)]) : [[filter, list]];

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <div className="flex items-center px-4 pt-[max(env(safe-area-inset-top),8px)] md:pt-4">
        <RoundIconButton icon={Plus} filled size={40} title="محل جديد" onClick={() => navigate('/admin/stores/new')} />
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold text-ink">المحلات</h1>
          {stores.data && (
            <p className="text-xs font-medium text-ink-3">
              {all.length} محل • {openCount} مفتوح دلوقتي
            </p>
          )}
        </div>
        <span className="size-10" />
      </div>

      <div className="sticky top-0 md:top-16 z-20 bg-bg px-4 pt-2 pb-2.5">
        <label className="flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand">
          <Search className="size-5 text-ink-2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="دور باسم المحل أو العنوان أو الرقم" className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink-3 placeholder:font-medium" />
          {query && (
            <button type="button" aria-label="مسح" onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
              <X className="size-5" />
            </button>
          )}
        </label>
        <div className="mt-2.5 -mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {([['الكل', null], ...STORE_STATUSES.map((s) => [s.label === 'مفعّل' ? 'مفعّلة' : s.label === 'موقوف' ? 'موقوفة' : 'مستنية موافقة', s.value] as const)] as [string, StoreStatus | null][]).map(([label, status]) => {
            const selected = filter === status;
            const meta = status ? storeStatus(status) : null;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(status)}
                className={clsx(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors',
                  selected ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-surface-alt',
                )}
              >
                {meta && <meta.Icon className="size-[15px]" style={{ color: selected ? '#fff' : meta.color }} />}
                {label}
                <span className={clsx('rounded-full px-1.5 text-xs font-bold', selected ? 'bg-white/20 text-white' : 'bg-surface-alt text-ink-2')}>{count(status)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {stores.isLoading ? (
          <Loading />
        ) : stores.isError ? (
          <ErrorView message={(stores.error as Error).message} onRetry={() => stores.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView
            icon={q ? SearchX : Inbox}
            message={q ? `مفيش نتايج لـ "${query.trim()}"` : 'مفيش محلات هنا'}
            action={
              !q && filter === null ? (
                <Button size="md" icon={<PlusSquare className="size-4" />} onClick={() => navigate('/admin/stores/new')}>
                  أضف أول محل
                </Button>
              ) : null
            }
          />
        ) : (
          groups.map(([status, items]) =>
            items.length === 0 ? null : (
              <section key={status}>
                {filter === null && <GroupHeader status={status} count={items.length} />}
                <div className="grid gap-2.5 pb-3 md:grid-cols-2">
                  {items.map((s) => (
                    <AdminStoreCard key={s.id} store={s} />
                  ))}
                </div>
              </section>
            ),
          )
        )}
      </div>
    </div>
  );
}

function GroupHeader({ status, count }: { status: StoreStatus; count: number }) {
  const meta = storeStatus(status);
  return (
    <div className="flex items-center gap-1.5 px-1 pt-4 pb-1.5">
      <meta.Icon className="size-4" style={{ color: meta.color }} />
      <span className="text-sm font-extrabold text-ink">{meta.label}</span>
      <span className="text-[13px] text-ink-3">{count}</span>
    </div>
  );
}

export { TabHeader };
