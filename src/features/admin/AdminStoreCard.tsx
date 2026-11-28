import clsx from 'clsx';
import { Ban, BookOpen, UserRound, CalendarClock, Check, ChevronRight, Clock, ExternalLink, IdCard, Lock, LockOpen, Pencil, Percent, Phone, ReceiptText, RotateCcw, ShoppingBag, MapPin, SlidersHorizontal, Wallet, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { AppImage, Button, Sheet, SoftCard, StatusChip, Switch } from '@/components/ui';
import { StoreAvatar } from '@/features/customer/StoreBits';
import { mapHref, telHref } from '@/features/orders/OrderWidgets';
import { formatPrice, formatStoreHours } from '@/lib/format';
import { t } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { categoryOf, storeStatus } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';
import type { Store } from '@/types';

import { StoreHoursDialog } from '@/features/owner/StoreHoursDialog';

import { StoreOwnerDialog } from './StoreOwnerDialog';
import { StoreTaxDialog } from './StoreTaxDialog';
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
      <SoftCard className="flex h-full flex-col overflow-hidden">
        <button type="button" onClick={() => setDetailsOpen(true)} className="group flex w-full flex-1 flex-col text-start">
          {/* Cover photo (the logo when there is none, else the category's color and icon). */}
          <div className="relative h-32 w-full overflow-hidden" style={{ background: `color-mix(in srgb, ${meta.color} 16%, var(--color-surface-alt))` }}>
            <div className="absolute inset-0 grid place-items-center" style={{ color: meta.color }}>
              <meta.Icon className="size-10 opacity-60" />
            </div>
            <AppImage url={store.coverUrl ?? store.logoUrl} fallback={null} className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute top-2.5 start-2.5 rounded-full bg-surface/90 backdrop-blur-sm">
              <StatusDot store={store} />
            </span>
          </div>
          <div className="flex flex-1 flex-col px-3.5 pb-3">
            <div className="-mt-7 flex items-end gap-3">
              <span className="relative rounded-[19px] bg-surface p-[3px] shadow-card">
                <StoreAvatar category={store} logoUrl={store.logoUrl} size={56} />
              </span>
              <span className="min-w-0 flex-1 pb-0.5">
                <span className="block truncate font-extrabold text-ink">{localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt)}</span>
                <span className="block truncate text-[13px] text-ink-2">{store.address}</span>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
              <Meta icon={meta.Icon} text={meta.label} />
              <Meta icon={Phone} text={store.phone} ltr />
              {store.minOrderAmount > 0 && <Meta icon={ShoppingBag} text={t('أقل طلب {p}', { p: formatPrice(store.minOrderAmount) })} />}
              {(store.commissionPercent ?? 0) > 0 && <Meta icon={Percent} text={t('عمولة {n}%', { n: store.commissionPercent ?? 0 })} />}
              {store.opensAt && store.closesAt && <Meta icon={Clock} text={formatStoreHours(store.opensAt, store.closesAt, store.secondOpensAt, store.secondClosesAt)!} />}
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
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const ownedByMe = useAuth((a) => a.session?.userId === store.ownerId);

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
      <StoreOwnerDialog store={store} currentEmail={ownedByMe ? null : (store.ownerEmail ?? null)} open={ownerOpen} onClose={() => setOwnerOpen(false)} />
      <StoreTaxDialog store={store} open={taxOpen} onClose={() => setTaxOpen(false)} />
      <Sheet open={open} onClose={onClose} wide>
        {/* Cover with the logo over its edge. */}
        <div className="-mx-5 -mt-4 relative h-32 overflow-hidden sm:h-36" style={{ background: `color-mix(in srgb, ${meta.color} 18%, var(--color-surface-alt))` }}>
          <div className="absolute inset-0 grid place-items-center" style={{ color: meta.color }}>
            <meta.Icon className="size-12 opacity-50" />
          </div>
          <AppImage url={store.coverUrl ?? store.logoUrl} fallback={null} className="absolute inset-0" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>
        <div className="relative -mt-9 flex items-end gap-3.5">
          <span className="rounded-[20px] bg-surface p-[3px] shadow-card">
            <StoreAvatar category={store} logoUrl={store.logoUrl} size={68} />
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <h3 className="truncate text-[20px] font-extrabold leading-tight text-ink">{localized(store.name, store.nameEn, store.nameRu, store.nameTr, store.nameIt)}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusChip label={status.label} color={status.color} />
              {store.status === 'Active' && <OpenChip store={store} />}
              {store.status === 'Active' && store.openSwitch && !store.isOpen && <StatusChip label={t('برا المواعيد')} color="var(--color-warning)" />}
            </div>
          </div>
        </div>
        {store.description && <p className="mt-3 text-sm leading-relaxed text-ink-2">{store.description}</p>}

        {/* What the admin does most: approve, or open / close. */}
        {store.status === 'PendingApproval' && (
          <Button block className="mt-4" icon={<Check className="size-5" />} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل'))}>
            {t('موافقة وتفعيل')}
          </Button>
        )}
        {store.status === 'Active' && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-alt/50 px-3.5 py-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl"
              style={{
                background: `color-mix(in srgb, ${store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)'} 16%, transparent)`,
                color: store.isOpen ? 'var(--color-success)' : 'var(--color-ink-3)',
              }}
            >
              {store.openSwitch ? <LockOpen className="size-5" /> : <Lock className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{switchLabel(store)}</span>
              <span className="block text-xs text-ink-2">
                {store.openSwitch && !store.isOpen
                  ? t('الزرار شغال بس المحل برا المواعيد')
                  : store.openSwitch
                    ? t('الزباين بيطلبوا منه دلوقتي')
                    : t('مش بياخد طلبات لحد ما يتفتح')}
              </span>
            </span>
            <Switch
              checked={store.openSwitch}
              label={t('مفتوح للطلبات')}
              onChange={(on) => run(() => storesApi.setOpen(store.id, on), on ? t('المحل اتفتح') : t('المحل اتقفل'))}
            />
          </div>
        )}

        {/* Shortcuts to the store's pages. */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <QuickTile icon={BookOpen} label={t('المنيو')} onClick={() => go(`/admin/stores/${store.id}/menu`)} />
          <QuickTile icon={Wallet} label={t('المحفظة')} onClick={() => go(`/admin/stores/${store.id}/wallet`)} />
          <QuickTile icon={IdCard} label={t('الكاشير')} onClick={() => go(`/admin/stores/${store.id}/employees`)} />
          <QuickTile icon={Pencil} label={t('تعديل')} onClick={() => go(`/admin/stores/${store.id}/edit`)} />
        </div>

        <SectionTitle>{t('بيانات المحل')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <InfoTile icon={meta.Icon} label={t('القسم')} value={meta.label} />
          <InfoTile icon={Phone} label={t('التليفون')} value={store.phone} ltr href={telHref(store.phone)} />
          <InfoTile icon={ShoppingBag} label={t('أقل طلب')} value={store.minOrderAmount > 0 ? formatPrice(store.minOrderAmount) : t('مفيش حد أدنى')} />
          <InfoTile icon={Percent} label={t('العمولة')} value={`${store.commissionPercent ?? 0}%`} />
          <InfoTile icon={ReceiptText} label={t('الضريبة')} value={store.taxPercent ? `${store.taxPercent}%` : t('من غير ضريبة')} />
          <InfoTile icon={CalendarClock} label={t('المجدولة')} value={store.allowsScheduledOrders ? t('بياخد طلبات مجدولة') : t('مقفولة')} />
          <InfoTile
            icon={Clock}
            label={t('المواعيد')}
            value={formatStoreHours(store.opensAt, store.closesAt, store.secondOpensAt, store.secondClosesAt) ?? t('مفيش (الزرار بس)')}
            className="col-span-2 sm:col-span-3"
          />
          <InfoTile
            icon={MapPin}
            label={t('العنوان')}
            value={store.address}
            href={mapHref(store.latitude, store.longitude)}
            linkLabel={t('افتح الخريطة')}
            className="col-span-2 sm:col-span-3"
          />
        </div>

        <SectionTitle>{t('الإعدادات')}</SectionTitle>
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line">
          <ActionRow
            icon={SlidersHorizontal}
            title={t('إعدادات المحل')}
            subtitle={t('العمولة والطلبات المجدولة')}
            onClick={() => {
              onClose();
              setSettingsOpen(true);
            }}
          />
          <ActionRow
            icon={ReceiptText}
            title={t('ضريبة المحل')}
            subtitle={store.taxPercent ? t('{p}% على المنتجات، الزبون بيدفعها', { p: store.taxPercent }) : t('من غير ضريبة')}
            onClick={() => {
              onClose();
              setTaxOpen(true);
            }}
          />
          <ActionRow
            icon={Clock}
            title={t('مواعيد الفتح والقفل')}
            subtitle={formatStoreHours(store.opensAt, store.closesAt, store.secondOpensAt, store.secondClosesAt) ?? t('مفيش مواعيد، الزرار بس اللي بيتحكم')}
            onClick={() => {
              onClose();
              setHoursOpen(true);
            }}
          />
          <ActionRow
            icon={UserRound}
            color={ownedByMe ? 'var(--color-warning)' : undefined}
            title={t('صاحب المحل')}
            subtitle={ownedByMe ? t('باسمك لسه. اربطه بإيميل وباسورد لصاحبه') : (store.ownerEmail ?? t('غيّر صاحب المحل'))}
            onClick={() => {
              onClose();
              setOwnerOpen(true);
            }}
          />
        </div>

        <div className="mt-5">
          {store.status === 'Suspended' ? (
            <Button block variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => run(() => storesApi.approve(store.id), t('المحل اتفعّل تاني'))}>
              {t('إعادة التفعيل')}
            </Button>
          ) : (
            <Button block variant="outline" className="border-danger/50 text-danger hover:bg-danger/10" icon={<Ban className="size-4" />} onClick={suspend}>
              {store.status === 'PendingApproval' ? t('رفض الطلب') : t('إيقاف المحل')}
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-5 px-1 text-[12px] font-extrabold tracking-wide text-ink-3">{children}</p>;
}

/** A shortcut button: icon over a short label. */
function QuickTile({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-1 py-3 text-[12px] font-bold text-ink-2 transition-colors hover:border-brand/40 hover:bg-surface-alt hover:text-ink"
    >
      <span className="grid size-9 place-items-center rounded-xl text-brand-ink" style={{ background: 'color-mix(in srgb, var(--color-brand) 14%, transparent)' }}>
        <Icon className="size-[18px]" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

/** One fact about the store: a small label over its value, optionally a link (call, map). */
function InfoTile({
  icon: Icon,
  label,
  value,
  ltr,
  href,
  linkLabel,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  ltr?: boolean;
  href?: string;
  /** Shown as a separate link beside the value (the value itself stays plain text). */
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={clsx('min-w-0 rounded-2xl bg-surface-alt/60 px-3 py-2.5', className)}>
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-3">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="mt-0.5 flex items-center gap-2">
        {href && !linkLabel ? (
          <a href={href} dir={ltr ? 'ltr' : undefined} className="truncate text-[14px] font-bold text-brand-ink hover:underline">
            {value}
          </a>
        ) : (
          <span dir={ltr ? 'ltr' : undefined} className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">
            {value}
          </span>
        )}
        {href && linkLabel && (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-brand-ink hover:underline">
            <ExternalLink className="size-3.5" />
            {linkLabel}
          </a>
        )}
      </span>
    </div>
  );
}

/** A settings row inside the grouped card, with a chevron. */
function ActionRow({ icon: Icon, color, title, subtitle, onClick }: { icon: LucideIcon; color?: string; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 bg-surface px-3.5 py-3 text-start transition-colors hover:bg-surface-alt">
      <Icon className="size-5 shrink-0" style={{ color: color ?? 'var(--color-ink-2)' }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold" style={{ color: color ?? 'var(--color-ink)' }}>
          {title}
        </span>
        {subtitle && <span className="block truncate text-xs text-ink-2">{subtitle}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3 rtl:-scale-x-100" />
    </button>
  );
}
