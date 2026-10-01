import clsx from 'clsx';
import { Bike } from 'lucide-react';

import { useAdminDrivers } from '@/api/queries';
import { EmptyView, ErrorView, IconWell, Loading, Sheet, StatusChip } from '@/components/ui';
import type { Driver } from '@/types';

/** Sheet listing the active drivers, least busy first. */
export function DriverPicker({
  open,
  onClose,
  currentDriverId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  currentDriverId?: number | null;
  onPick: (driver: Driver) => void;
}) {
  const drivers = useAdminDrivers();
  const active = (drivers.data ?? []).filter((d) => d.isActive).sort((a, b) => a.activeOrders - b.activeOrders);

  return (
    <Sheet open={open} onClose={onClose} title="اختار المندوب">
      <p className="-mt-2 mb-3 text-[13px] text-ink-3">الأقل شغل الأول</p>
      {drivers.isLoading ? (
        <Loading className="py-8" />
      ) : drivers.isError ? (
        <ErrorView message={(drivers.error as Error).message} onRetry={() => drivers.refetch()} />
      ) : active.length === 0 ? (
        <EmptyView icon={Bike} message={'مفيش مندوبين مفعّلين.\nضيف مندوب من صفحة "المندوبين".'} />
      ) : (
        <div className="flex flex-col gap-2.5 pb-2">
          {active.map((d) => {
            const current = d.id === currentDriverId;
            const free = d.activeOrders === 0;
            return (
              <button
                key={d.id}
                type="button"
                disabled={current}
                onClick={() => {
                  onPick(d);
                  onClose();
                }}
                className={clsx('card flex w-full items-center gap-3 p-3 text-start', current ? 'bg-brand/15 border-brand/40' : 'hover:border-surface-high')}
              >
                <IconWell icon={Bike} size={42} color={free ? 'var(--color-success)' : 'var(--color-series-1)'} />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-ink">{d.fullName}</span>
                  <span className="block text-xs text-ink-3" dir="ltr">
                    {d.phoneNumber}
                  </span>
                </span>
                {current ? (
                  <StatusChip label="الحالي" color="var(--color-brand)" />
                ) : free ? (
                  <StatusChip label="فاضي" color="var(--color-success)" />
                ) : (
                  <StatusChip label={`معاه ${d.activeOrders}`} color="var(--color-series-1)" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
