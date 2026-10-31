import { Ban, BookOpen, CalendarClock, Check, Clock, IdCard, Lock, LockOpen, Pencil, Percent, Phone, RotateCcw, ShoppingBag, MapPin, Crosshair, SlidersHorizontal, Wallet, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { Button, IconWell, Sheet, SoftCard, StatusChip, Switch } from '@/components/ui';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { formatPrice, formatStoreHours } from '@/lib/format';
import { t } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { categoryOf, storeStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { Store } from '@/types';

import { StoreHoursDialog } from '@/features/owner/StoreHoursDialog';

import { StoreSettingsDialog } from './StoreSettingsDialog';

/** Open right now (`isOpen` = switch on and within the hours) as a chip. */
function OpenChip({ store }: { store: Store }) {
  return <StatusChip label={store.isOpen ? t('مفتوح') : t('مقفول')} color={store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} />;
}

/** The open switch's state: the switch can be on while the store is closed for its hours. */
const switchLabel = (store: Store) => (store.isOpen ? t('مفتوح للطلبات') : store.openSwitch ? t('برا المواعيد') : t('مقفول'));

/** Status as a colored dot + label; for active stores it shows open/closed instead. */
function StatusDot({ store }: { store: Store }) {
  if (store.status === 'Active') return <OpenChip store={store} />;
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
    if (!(await confirm(t('ترفض طلب "{name}"؟', { name: localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt) }), t('رفض')))) return;
    await run(() => storesApi.suspend(store.id), t('الطلب اترفض'));
  }

  return (
    <>
      <SoftCard className="overflow-hidden">
        <button type="button" onClick={() => setDetailsOpen(true)} className="flex w-full items-start gap-3 px-3.5 pt-3.5 pb-3 text-start">
          <StoreAvatar category={store} logoUrl={store.logoUrl} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-extrabold text-ink">{localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt)}</span>
              <StatusDot store={store} />
            </div>
            <p className="truncate text-[13px] text-ink-2">{store.address}</p>
            <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
              <Meta icon={meta.Icon} text={meta.label} />
              <Meta icon={Phone} text={store.phone} ltr />
              {store.minOrderAmount > 0 && <Meta icon={ShoppingBag} text={t('أقل طلب {p}', { p: formatPrice(store.minOrderAmount) })} />}
              {(store.commissionPercent ?? 0) > 0 && <Meta icon={Percent} text={t('عمولة {n}%', { n: store.commissionPercent ?? 0 })} />}
              {store.opensAt && store.closesAt && <Meta icon={Clock} text={formatStoreHours(store.opensAt, store.closesAt)!} />}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 border-t border-line bg-surface-alt/60 px-3 py-2.5">
          {store.status === 'PendingApproval' ? (
            <>
              <Button size="sm" className="flex-[3]" icon={<Check className="size-4" />} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل'))}>
                {t('موافقة')}
              </Button>
              <Button size="sm" variant="outline" className="flex-[2] text-danger border-danger/50 hover:bg-danger/10" onClick={reject}>
                {t('رفض')}
              </Button>
            </>
          ) : store.status === 'Active' ? (
            <>
              <Switch checked={store.openSwitch} label={t('مفتوح للطلبات')} onChange={(open) => run(() => storesApi.setOpen(store.id, open), open ? t('المحل اتفتح') : t('المحل اتقفل'))} />
              <span className="text-[13px] text-ink-2">{switchLabel(store)}</span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" icon={<BookOpen className="size-4" />} onClick={() => navigate(`/admin/stores/${store.id}/menu`)}>
                {t('المنيو')}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="flex-1" icon={<RotateCcw className="size-4" />} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل تاني'))}>
                {t('إعادة التفعيل')}
              </Button>
              <Button size="sm" variant="outline" icon={<BookOpen className="size-4" />} onClick={() => navigate(`/admin/stores/${store.id}/menu`)}>
                {t('المنيو')}
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    onClose();
    if (await runAction(action, success)) refresh();
  };

  async function suspend() {
    if (!(await confirm(t('توقف "{name}"؟ هيتقفل ويختفي من الزباين.', { name: localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt) }), t('إيقاف')))) return;
    await run(() => storesApi.suspend(store.id), t('المحل اتوقف'));
  }

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <StoreSettingsDialog store={store} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <StoreHoursDialog store={store} open={hoursOpen} onClose={() => setHoursOpen(false)} />
      <Sheet open={open} onClose={onClose}>
        <div className="flex items-center gap-3.5">
          <StoreAvatar category={store} logoUrl={store.logoUrl} size={56} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] font-extrabold text-ink">{localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt)}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusChip label={status.label} color={status.color} />
              {store.status === 'Active' && <OpenChip store={store} />}
              {store.status === 'Active' && store.openSwitch && !store.isOpen && <StatusChip label={t('برا المواعيد')} color="var(--color-warning)" />}
            </div>
          </div>
        </div>
        {store.description && <p className="mt-3.5 text-ink-2">{store.description}</p>}
        <div className="mt-4 flex flex-col gap-2">
          <InfoRow icon={meta.Icon} label={t('القسم')} value={meta.label} />
          <InfoRow icon={MapPin} label={t('العنوان')} value={store.address} />
          <InfoRow icon={Phone} label={t('التليفون')} value={store.phone} ltr />
          <InfoRow icon={ShoppingBag} label={t('أقل طلب')} value={store.minOrderAmount > 0 ? formatPrice(store.minOrderAmount) : t('مفيش حد أدنى')} />
          <InfoRow icon={Percent} label={t('العمولة')} value={`${store.commissionPercent ?? 0}%`} />
          <InfoRow icon={Clock} label={t('المواعيد')} value={formatStoreHours(store.opensAt, store.closesAt) ?? t('مفيش (الزرار بس)')} />
          <InfoRow icon={CalendarClock} label={t('المجدولة')} value={store.allowsScheduledOrders ? t('بياخد طلبات مجدولة') : t('مقفولة')} />
          <InfoRow icon={Crosshair} label={t('الإحداثيات')} value={`${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}`} ltr />
        </div>
        <div className="my-4 border-t border-line" />
        <div className="flex flex-col">
          {store.status === 'PendingApproval' && (
            <ActionTile icon={Check} color="var(--color-success)" title={t('موافقة وتفعيل')} subtitle={t('المحل هيظهر للزباين بعد ما صاحبه يفتحه')} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل'))} />
          )}
          {store.status === 'Active' && (
            <ActionTile
              icon={store.openSwitch ? Lock : LockOpen}
              color="var(--color-ink)"
              title={store.openSwitch ? t('قفل المحل') : t('فتح المحل')}
              subtitle={store.openSwitch && !store.isOpen ? t('الزرار شغال بس المحل برا المواعيد') : undefined}
              onClick={() => run(() => storesApi.setOpen(store.id, !store.openSwitch), store.openSwitch ? t('المحل اتقفل') : t('المحل اتفتح'))}
            />
          )}
          <ActionTile
            icon={SlidersHorizontal}
            color="var(--color-ink)"
            title={t('إعدادات المحل')}
            subtitle={t('العمولة والطلبات المجدولة')}
            onClick={() => {
              onClose();
              setSettingsOpen(true);
            }}
          />
          <ActionTile
            icon={Clock}
            color="var(--color-ink)"
            title={t('مواعيد الفتح والقفل')}
            subtitle={formatStoreHours(store.opensAt, store.closesAt) ?? t('مفيش مواعيد، الزرار بس اللي بيتحكم')}
            onClick={() => {
              onClose();
              setHoursOpen(true);
            }}
          />
          <ActionTile
            icon={IdCard}
            color="var(--color-ink)"
            title={t('حسابات الكاشير')}
            subtitle={t('بيشتغلوا على أوردرات المحل من غير ما يشوفوا فلوسه')}
            onClick={() => go(`/admin/stores/${store.id}/employees`)}
          />
          <ActionTile icon={Wallet} color="var(--color-ink)" title={t('المحفظة')} subtitle={t('رصيده وطلبات السحب والحركات')} onClick={() => go(`/admin/stores/${store.id}/wallet`)} />
          <ActionTile icon={BookOpen} color="var(--color-ink)" title={t('إدارة المنيو')} subtitle={t('الأقسام والمنتجات والإضافات')} onClick={() => go(`/admin/stores/${store.id}/menu`)} />
          <ActionTile icon={Pencil} color="var(--color-ink)" title={t('تعديل البيانات')} onClick={() => go(`/admin/stores/${store.id}/edit`)} />
          {store.status === 'Suspended' ? (
            <ActionTile icon={RotateCcw} color="var(--color-success)" title={t('إعادة التفعيل')} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل تاني'))} />
          ) : (
            <ActionTile icon={Ban} color="var(--color-danger)" title={store.status === 'PendingApproval' ? t('رفض الطلب') : t('إيقاف المحل')} onClick={suspend} />
          )}
        </div>
      </Sheet>
    </>
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
