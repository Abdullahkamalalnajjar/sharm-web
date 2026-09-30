import { MapPinOff, MapPinPlus, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { addressesApi } from '@/api';
import { keys, useAddresses } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, IconWell, Loading, Sheet, SoftCard, StatusChip } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { addressIcon } from '@/features/customer/DeliveryPicker';
import { addressDetails } from '@/lib/format';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';
import type { Address } from '@/types';

import { AddressFormSheet } from './AddressForm';

export function AddressesPage() {
  const session = useAuth((s) => s.session);
  const addresses = useAddresses();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Address | null | undefined>(undefined); // undefined = closed, null = new
  const [menuFor, setMenuFor] = useState<Address | null>(null);

  if (!session) return <LoginRequired title="عناويني" icon={MapPinPlus} message="سجّل دخول عشان تحفظ عناوين التوصيل." />;

  const reload = () => qc.invalidateQueries({ queryKey: keys.addresses });

  async function act(action: 'edit' | 'default' | 'delete', a: Address) {
    setMenuFor(null);
    if (action === 'edit') return setEditing(a);
    if (action === 'default') {
      if (await runAction(() => addressesApi.setDefault(a.id))) reload();
      return;
    }
    if (!(await confirm(`تمسح عنوان "${a.label}"؟`, 'مسح'))) return;
    if (await runAction(() => addressesApi.delete(a.id), 'العنوان اتمسح')) reload();
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <PageHeader title="عناويني" />
      <div className="px-4">
        {addresses.isLoading ? (
          <Loading />
        ) : addresses.isError ? (
          <ErrorView message={(addresses.error as Error).message} onRetry={() => addresses.refetch()} />
        ) : addresses.data!.length === 0 ? (
          <EmptyView icon={MapPinOff} message="لسه مضفتش أي عنوان" />
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.data!.map((a) => {
              const Icon = addressIcon(a.label);
              const details = addressDetails(a);
              return (
                <SoftCard key={a.id} className="flex items-center gap-3 p-3.5">
                  <IconWell icon={Icon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-ink">{a.label}</span>
                      {a.isDefault && <StatusChip label="الأساسي" color="var(--color-accent)" />}
                    </div>
                    <p className="text-ink-2 text-sm">{a.addressLine}</p>
                    {details && <p className="text-xs text-ink-2">{details}</p>}
                    {a.landmark && <p className="text-xs text-ink-3">{a.landmark}</p>}
                  </div>
                  <button type="button" aria-label="خيارات" onClick={() => setMenuFor(a)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                    <MoreVertical className="size-5" />
                  </button>
                </SoftCard>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none">
        <div className="mx-auto max-w-2xl flex justify-end">
          <Button className="pointer-events-auto" icon={<MapPinPlus className="size-5" />} onClick={() => setEditing(null)}>
            عنوان جديد
          </Button>
        </div>
      </div>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.label}>
        {menuFor && (
          <div className="flex flex-col">
            <MenuItem onClick={() => act('edit', menuFor)}>تعديل</MenuItem>
            {!menuFor.isDefault && <MenuItem onClick={() => act('default', menuFor)}>خليه الأساسي</MenuItem>}
            <MenuItem danger onClick={() => act('delete', menuFor)}>
              مسح
            </MenuItem>
          </div>
        )}
      </Sheet>

      <AddressFormSheet open={editing !== undefined} address={editing ?? null} onClose={() => setEditing(undefined)} />
    </div>
  );
}

export function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-3 py-3 text-start font-bold hover:bg-surface-alt ${danger ? 'text-danger' : 'text-ink'}`}>
      {children}
    </button>
  );
}
