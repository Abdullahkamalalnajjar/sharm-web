import { Ban, BookOpen, Check, Lock, LockOpen, Pencil, Phone, RotateCcw, ShoppingBag, MapPin, Crosshair, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { Button, IconWell, Sheet, SoftCard, StatusChip, Switch } from '@/components/ui';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { formatPrice } from '@/lib/format';
import { categoryOf, storeStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { Store } from '@/types';

/** Status as a colored dot + label; for active stores it shows open/closed instead. */
function StatusDot({ store }: { store: Store }) {
  if (store.status === 'Active') {
    return <StatusChip label={store.isOpen ? 'مفتوح' : 'مقفول'} color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} />;
  }
  const meta = storeStatus(store.status);
  return <StatusChip label={meta.label} color={meta.color} />;
}

function Meta({ icon: Icon, text, ltr }: { icon: LucideIcon; text: string; ltr?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
      <Icon className="size-3.5 text-ink-3" />
      <span dir={ltr ? 'ltr' : undefined}>{text}</span>
    </span>
  );
}

/** Compact store card. Tap opens the details sheet; the footer holds the actions for the store's status. */
export function AdminStoreCard({ store }: { store: Store }) {
  const refresh = useRefreshAdmin();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = categoryOf(store);

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (await runAction(action, success)) refresh();
  };

  async function reject() {
    if (!(await confirm(`ترفض طلب "${store.name}"؟`, 'رفض'))) return;
    await run(() => storesApi.suspend(store.id), 'الطلب اترفض');
  }

  return (
    <>
      <SoftCard className="overflow-hidden">
        <button type="button" onClick={() => setDetailsOpen(true)} className="flex w-full items-start gap-3 px-3.5 pt-3.5 pb-3 text-start">
          <StoreAvatar category={store} logoUrl={store.logoUrl} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-extrabold text-ink">{store.name}</span>
              <StatusDot store={store} />
            </div>
            <p className="truncate text-[13px] text-ink-2">{store.address}</p>
            <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
              <Meta icon={meta.Icon} text={meta.label} />
              <Meta icon={Phone} text={store.phone} ltr />
              {store.minOrderAmount > 0 && <Meta icon={ShoppingBag} text={`أقل طلب ${formatPrice(store.minOrderAmount)}`} />}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 border-t border-line bg-surface-alt/60 px-3 py-2.5">
          {store.status === 'PendingApproval' ? (
            <>
              <Button size="sm" className="flex-[3]" icon={<Check className="size-4" />} onClick={() => run(() => storesApi.approve(store.id), 'المحل اتفعّل')}>
                موافقة
              </Button>
              <Button size="sm" variant="outline" className="flex-[2] text-danger border-danger/50 hover:bg-danger/10" onClick={reject}>
                رفض
              </Button>
            </>
          ) : store.status === 'Active' ? (
            <>
              <Switch checked={store.isOpen} label="مفتوح للطلبات" onChange={(open) => run(() => storesApi.setOpen(store.id, open), open ? 'المحل اتفتح' : 'المحل اتقفل')} />
              <span className="text-[13px] text-ink-2">{store.isOpen ? 'مفتوح للطلبات' : 'مقفول'}</span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" icon={<BookOpen className="size-4" />} onClick={() => navigate(`/admin/stores/${store.id}/menu`)}>
                المنيو
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="flex-1" icon={<RotateCcw className="size-4" />} onClick={() => run(() => storesApi.approve(store.id), 'المحل اتفعّل تاني')}>
                إعادة التفعيل
              </Button>
              <Button size="sm" variant="outline" icon={<BookOpen className="size-4" />} onClick={() => navigate(`/admin/stores/${store.id}/menu`)}>
                المنيو
              </Button>
            </>
          )}
        </div>
      </SoftCard>
      <StoreDetailsSheet store={store} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </>
  );
}

/** Store details plus every admin action, as a bottom sheet. */
function StoreDetailsSheet({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const navigate = useNavigate();
  const meta = categoryOf(store);
  const status = storeStatus(store.status);

  const run = async (action: () => Promise<unknown>, success: string) => {
    onClose();
    if (await runAction(action, success)) refresh();
  };

  async function suspend() {
    if (!(await confirm(`توقف "${store.name}"؟ هيتقفل ويختفي من الزباين.`, 'إيقاف'))) return;
    await run(() => storesApi.suspend(store.id), 'المحل اتوقف');
  }

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex items-center gap-3.5">
        <StoreAvatar category={store} logoUrl={store.logoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-extrabold text-ink">{store.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusChip label={status.label} color={status.color} />
            {store.status === 'Active' && <StatusChip label={store.isOpen ? 'مفتوح' : 'مقفول'} color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} />}
          </div>
        </div>
      </div>
      {store.description && <p className="mt-3.5 text-ink-2">{store.description}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <InfoRow icon={meta.Icon} label="القسم" value={meta.label} />
        <InfoRow icon={MapPin} label="العنوان" value={store.address} />
        <InfoRow icon={Phone} label="التليفون" value={store.phone} ltr />
        <InfoRow icon={ShoppingBag} label="أقل طلب" value={store.minOrderAmount > 0 ? formatPrice(store.minOrderAmount) : 'مفيش حد أدنى'} />
        <InfoRow icon={Crosshair} label="الإحداثيات" value={`${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}`} ltr />
      </div>
      <div className="my-4 border-t border-line" />
      <div className="flex flex-col">
        {store.status === 'PendingApproval' && (
          <ActionTile icon={Check} color="var(--color-success)" title="موافقة وتفعيل" subtitle="المحل هيظهر للزباين بعد ما صاحبه يفتحه" onClick={() => run(() => storesApi.approve(store.id), 'المحل اتفعّل')} />
        )}
        {store.status === 'Active' && (
          <ActionTile
            icon={store.isOpen ? Lock : LockOpen}
            color="var(--color-ink)"
            title={store.isOpen ? 'قفل المحل' : 'فتح المحل'}
            onClick={() => run(() => storesApi.setOpen(store.id, !store.isOpen), store.isOpen ? 'المحل اتقفل' : 'المحل اتفتح')}
          />
        )}
        <ActionTile icon={BookOpen} color="var(--color-ink)" title="إدارة المنيو" subtitle="الأقسام والمنتجات والإضافات" onClick={() => go(`/admin/stores/${store.id}/menu`)} />
        <ActionTile icon={Pencil} color="var(--color-ink)" title="تعديل البيانات" onClick={() => go(`/admin/stores/${store.id}/edit`)} />
        {store.status === 'Suspended' ? (
          <ActionTile icon={RotateCcw} color="var(--color-success)" title="إعادة التفعيل" onClick={() => run(() => storesApi.approve(store.id), 'المحل اتفعّل تاني')} />
        ) : (
          <ActionTile icon={Ban} color="var(--color-danger)" title={store.status === 'PendingApproval' ? 'رفض الطلب' : 'إيقاف المحل'} onClick={suspend} />
        )}
      </div>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value, ltr }: { icon: LucideIcon; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-[18px] text-ink-3" />
      <span className="w-[74px] text-[13px] text-ink-3">{label}</span>
      <span className="flex-1 font-semibold text-ink" dir={ltr ? 'ltr' : undefined} style={{ textAlign: ltr ? 'end' : undefined }}>
        {value}
      </span>
    </div>
  );
}

function ActionTile({ icon, color, title, subtitle, onClick }: { icon: LucideIcon; color: string; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-start hover:bg-surface-alt">
      <IconWell icon={icon} size={42} color={color} />
      <span className="flex-1">
        <span className="block font-bold" style={{ color }}>
          {title}
        </span>
        {subtitle && <span className="block text-xs text-ink-2">{subtitle}</span>}
      </span>
    </button>
  );
}
