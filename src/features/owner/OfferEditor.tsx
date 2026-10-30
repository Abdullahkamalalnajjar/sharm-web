import clsx from 'clsx';
import { CalendarClock, Check, Gift, Search, Store as StoreIcon, Trash2, X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { offersApi } from '@/api';
import { errorMessage } from '@/api/client';
import { useAdminStores, useManagedMenu } from '@/api/queries';
import { AppImage, Button, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { discountLabel, formatOrderDate, formatPrice, parseUtc } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { OfferAdmin, OfferProductSummary, OfferSaveInput } from '@/types';

import { ImagePickerField, noImageEdit, type ImageEdit } from './ImagePicker';
import { TranslationFields, translationValues } from './TranslationFields';

// The backend's limits (see the offers contract).
const MAX_PRODUCTS = 100;
const MAX_STORES = 30;

/** Past its end date: the customers no longer see it. */
export const isExpired = (o: Pick<OfferAdmin, 'endsAtUtc'>) => o.endsAtUtc !== null && parseUtc(o.endsAtUtc).getTime() <= Date.now();

/** The save body of an offer as it is, with `changes` on top (e.g. the owner's active switch). */
export function offerSaveBody(o: OfferAdmin, changes: Partial<OfferSaveInput> = {}): OfferSaveInput {
  return {
    title: o.title,
    endsAtUtc: o.endsAtUtc,
    isActive: o.isActive,
    displayOrder: o.displayOrder,
    productIds: o.productIds,
    ...(o.storeId === null ? { storeIds: o.storeIds } : {}),
    ...changes,
  };
}

/** UTC from the server → the value of a datetime-local input (local time). */
function toLocalInput(utc: string | null): string {
  if (!utc) return '';
  const d = parseUtc(utc);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}

// ---------- List row ----------

/** An offer in the owner's / admin's list: picture, title, state and counts; the switch hides / shows it. */
export function OfferRow({
  offer: o,
  storeLabel,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  offer: OfferAdmin;
  /** The admin list shows whose offer it is. */
  storeLabel?: string;
  busy?: boolean;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const expired = isExpired(o);
  const counts = [
    o.products.length > 0 && t('{n} منتج', { n: o.products.length }),
    o.stores.length > 0 && t('{n} محل', { n: o.stores.length }),
    o.endsAtUtc && (expired ? t('انتهى {date}', { date: formatOrderDate(o.endsAtUtc) }) : t('ينتهي {date}', { date: formatOrderDate(o.endsAtUtc) })),
  ]
    .filter(Boolean)
    .join(' • ');
  return (
    <SoftCard className={clsx('flex items-center gap-3 p-2.5', (!o.isActive || expired) && 'opacity-70')}>
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <span className="relative grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-[18px] border border-line bg-surface-alt">
          <Gift className="size-6 text-ink-3" />
          <AppImage url={o.imageUrl} alt={o.title} fallback={null} className="absolute inset-0" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">{o.title}</span>
          {storeLabel && <span className="block truncate text-xs font-bold text-brand-ink">{storeLabel}</span>}
          <span className="block truncate text-xs text-ink-3">{counts || tIn('owner', 'فاضي')}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {!o.isActive && <StatusChip label={t('مخفي')} color="var(--color-ink-3)" />}
            {expired && <StatusChip label={t('منتهي')} color="var(--color-warning)" />}
            {!o.imageUrl && <StatusChip label={t('من غير صورة')} color="var(--color-danger)" />}
          </span>
        </span>
      </button>
      <button type="button" aria-label={t('مسح')} disabled={busy} onClick={onDelete} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-alt hover:text-danger disabled:opacity-40">
        <Trash2 className="size-[18px]" />
      </button>
      <Switch checked={o.isActive} disabled={busy} onChange={onToggle} label={o.isActive ? tIn('owner', 'إخفاء') : t('إظهار')} />
    </SoftCard>
  );
}

/** Asks, then deletes; true when it was deleted. */
export async function deleteOffer(o: OfferAdmin, asAdmin: boolean): Promise<boolean> {
  if (!(await confirm(t('تمسح عرض "{title}"؟', { title: o.title }), t('امسح')))) return false;
  return runAction(
    () => (asAdmin || o.storeId === null ? offersApi.delete(o.id) : offersApi.deleteForStore(o.storeId, o.id)),
    t('العرض اتمسح'),
  );
}

// ---------- Form ----------

/**
 * Add or edit an offer. `storeId` set: a store's offer, of that store's products only (owner, or the admin
 * editing a store's offer). `storeId` null: a platform offer (admin) of any stores and products.
 */
export function OfferFormSheet({
  open,
  offer,
  storeId,
  storeName,
  asAdmin,
  defaultDisplayOrder = 0,
  onClose,
  onSaved,
}: {
  open: boolean;
  offer: OfferAdmin | null;
  storeId: number | null;
  storeName?: string;
  asAdmin: boolean;
  defaultDisplayOrder?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  // A new offer saved before its picture failed to upload: saving again updates it instead of adding another.
  const [created, setCreated] = useState<OfferAdmin | null>(null);
  const existing = offer ?? created;
  const isNew = offer === null;
  const isPlatform = storeId === null;
  const [title, setTitle] = useState(offer?.title ?? '');
  const [translations, setTranslations] = useState(() => translationValues({ nameEn: offer?.titleEn, nameRu: offer?.titleRu }));
  const [endsAt, setEndsAt] = useState(toLocalInput(offer?.endsAtUtc ?? null));
  const [isActive, setIsActive] = useState(offer?.isActive ?? true);
  const [displayOrder, setDisplayOrder] = useState(String(offer?.displayOrder ?? defaultDisplayOrder));
  const [image, setImage] = useState<ImageEdit>(noImageEdit);
  const [products, setProducts] = useState<Map<number, OfferProductSummary>>(
    () => new Map((offer?.products ?? []).map((p) => [p.id, p])),
  );
  const [storeIds, setStoreIds] = useState<number[]>(offer?.storeIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProduct = (p: OfferProductSummary) =>
    setProducts((current) => {
      const next = new Map(current);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError(t('اكتب عنوان العرض'));
    if (image.kind !== 'picked' && !existing?.imageUrl) return setError(t('اختار صورة للعرض (بتظهر للزبون في الرئيسية)'));
    if (products.size === 0 && (!isPlatform || storeIds.length === 0))
      return setError(isPlatform ? t('اختار محل أو منتج واحد على الأقل') : t('اختار منتج واحد على الأقل'));
    if (products.size > MAX_PRODUCTS) return setError(t('أقصى عدد {n} منتج', { n: MAX_PRODUCTS }));
    if (storeIds.length > MAX_STORES) return setError(t('أقصى عدد {n} محل', { n: MAX_STORES }));
    const order = Number(displayOrder);
    if (asAdmin && (!Number.isInteger(order) || order < 0)) return setError(t('الترتيب لازم يكون رقم صحيح'));

    const body: OfferSaveInput = {
      title: title.trim(),
      // "" clears a translation.
      titleEn: translations.nameEn.trim(),
      titleRu: translations.nameRu.trim(),
      endsAtUtc: endsAt ? new Date(endsAt).toISOString() : null,
      isActive,
      displayOrder: asAdmin ? order : existing?.displayOrder,
      productIds: [...products.keys()],
      ...(isPlatform ? { storeIds } : {}),
    };

    setBusy(true);
    setError(null);
    try {
      const saved = asAdmin
        ? existing
          ? await offersApi.update(existing.id, body)
          : await offersApi.create(body)
        : existing
          ? await offersApi.updateForStore(storeId!, existing.id, body)
          : await offersApi.createForStore(storeId!, body);
      if (!existing) setCreated(saved);
      // Saved first, so a failed upload never loses the rest.
      if (image.kind === 'picked') {
        if (asAdmin) await offersApi.uploadImage(saved.id, image.file);
        else await offersApi.uploadStoreImage(storeId!, saved.id, image.file);
      }
      showMessage(isNew ? t('العرض اتضاف') : t('العرض اتحفظ'));
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      // The offer may be saved and only the picture failed; reload so the list shows it.
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!offer) return;
    setBusy(true);
    if (await deleteOffer(offer, asAdmin)) {
      onSaved();
      onClose();
    }
    setBusy(false);
  }

  return (
    <Sheet open={open} onClose={onClose} title={isNew ? (isPlatform ? t('عرض عام جديد') : t('عرض جديد')) : t('تعديل العرض')} wide>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {!isPlatform && storeName && (
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
            <StoreIcon className="size-4" />
            {storeName}
          </p>
        )}

        <div className="mx-auto w-full max-w-[220px]">
          <ImagePickerField
            label={t('صورة العرض (مربعة)')}
            currentUrl={offer?.imageUrl}
            edit={image}
            onChange={setImage}
            placeholderIcon={Gift}
            aspect="aspect-square"
            removable={false}
          />
        </div>

        <TextField name="title" label={t('عنوان العرض (عربي)')} placeholder={t('مثلاً: خصم 20% على البيتزا')} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TranslationFields value={translations} onChange={setTranslations} withDescription={false} nameLabels={['Title (English)', 'Заголовок (Русский)']} nameMaxLength={100} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-ink-2">{t('ينتهي في (اختياري)')}</span>
            <span className="relative block">
              <input type="datetime-local" className="field pe-12" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              {endsAt ? (
                <button type="button" aria-label={t('من غير تاريخ انتهاء')} onClick={() => setEndsAt('')} className="absolute inset-y-0 end-3 grid place-items-center text-ink-3 hover:text-ink">
                  <X className="size-4" />
                </button>
              ) : (
                <CalendarClock className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-ink-3" />
              )}
            </span>
            <span className="mt-1 block text-xs text-ink-3">{endsAt ? t('بيختفي لوحده بعد الميعاد ده') : t('من غير تاريخ: يفضل ظاهر لحد ما تخفيه')}</span>
          </label>
          {asAdmin && (
            <TextField
              name="displayOrder"
              type="number"
              inputMode="numeric"
              min={0}
              label={t('الترتيب')}
              hint={t('الأصغر بيظهر الأول')}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line p-3">
          <span>
            <span className="block text-sm font-extrabold text-ink">{t('ظاهر للزباين')}</span>
            <span className="block text-xs text-ink-3">{isActive ? t('بيظهر في "العروض اليومية"') : t('مخفي لحد ما تشغّله')}</span>
          </span>
          <Switch checked={isActive} onChange={setIsActive} label={t('ظاهر للزباين')} />
        </label>

        {isPlatform && <StoresPicker selected={storeIds} onChange={setStoreIds} />}

        <div>
          <p className="mb-2 text-sm font-extrabold text-ink">
            {t('منتجات العرض')} <span className="font-bold text-ink-3">({products.size})</span>
          </p>
          <SelectedProducts products={[...products.values()]} showStore={isPlatform} onRemove={toggleProduct} />
          {isPlatform ? (
            <PlatformProductsPicker selected={products} onToggle={toggleProduct} />
          ) : (
            <ProductsPicker storeId={storeId} storeName={storeName ?? offer?.storeName ?? ''} selected={products} onToggle={toggleProduct} />
          )}
          <p className="mt-1.5 text-xs text-ink-3">{t('الخصم نفسه بيتظبط من صفحة المنتج في المنيو؛ العرض بيعرض المنتجات بس.')}</p>
        </div>

        {error && <InlineError message={error} />}

        <Button type="submit" loading={busy} block className="mt-1">
          {isNew ? t('إضافة العرض') : t('حفظ')}
        </Button>
        {!isNew && (
          <Button type="button" variant="ghost" disabled={busy} icon={<Trash2 className="size-4" />} className="text-danger" onClick={remove}>
            {t('امسح العرض')}
          </Button>
        )}
      </form>
    </Sheet>
  );
}

/** The picked products as removable chips. */
function SelectedProducts({ products, showStore, onRemove }: { products: OfferProductSummary[]; showStore: boolean; onRemove: (p: OfferProductSummary) => void }) {
  if (products.length === 0) return null;
  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5">
      {products.map((p) => (
        <span key={p.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand/12 py-1 ps-3 pe-1 text-xs font-bold text-ink">
          <span className="truncate">
            {p.name}
            {showStore && <span className="font-semibold text-ink-3"> • {p.storeName}</span>}
          </span>
          <button type="button" aria-label={t('شيل {name}', { name: p.name })} onClick={() => onRemove(p)} className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-surface-alt">
            <X className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextField name="search" start={<Search className="size-4" />} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

/** A checkbox row of the pickers. */
function PickRow({ checked, onClick, image, title, subtitle }: { checked: boolean; onClick: () => void; image: ReactNode; title: string; subtitle?: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-surface-alt">
      <span className={clsx('grid size-5 shrink-0 place-items-center rounded-md border-2', checked ? 'border-brand bg-brand text-white' : 'border-surface-high')}>
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-alt">{image}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-ink-3">{subtitle}</span>}
      </span>
    </button>
  );
}

/** A store's products (from its managed menu, hidden ones included) with search. */
function ProductsPicker({
  storeId,
  storeName,
  selected,
  onToggle,
}: {
  storeId: number;
  storeName: string;
  selected: Map<number, OfferProductSummary>;
  onToggle: (p: OfferProductSummary) => void;
}) {
  const menu = useManagedMenu(storeId);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const products = useMemo(
    () =>
      (menu.data?.categories ?? [])
        .flatMap((c) => c.products)
        .filter((p) => !q || [p.name, p.nameEn, p.nameRu].some((n) => n?.toLowerCase().includes(q))),
    [menu.data, q],
  );

  return (
    <div className="rounded-2xl border border-line">
      <div className="p-2">
        <SearchBox value={query} onChange={setQuery} placeholder={t('دوّر على منتج')} />
      </div>
      {menu.isLoading ? (
        <Loading className="py-6" />
      ) : menu.isError ? (
        <p className="px-3 pb-3 text-sm text-danger">{(menu.error as Error).message}</p>
      ) : products.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-ink-3">{q ? t('مفيش منتجات بالاسم ده') : t('المنيو فاضي')}</p>
      ) : (
        <div className="max-h-72 overflow-y-auto border-t border-line py-1">
          {products.map((p) => (
            <PickRow
              key={p.id}
              checked={selected.has(p.id)}
              onClick={() =>
                onToggle({ id: p.id, name: p.name, storeId, storeName, imageUrl: p.imageUrl, price: p.price, discountPercent: p.discountPercent })
              }
              image={<AppImage url={p.imageUrl} fallback={<Gift className="size-4 text-ink-3" />} />}
              title={p.name}
              subtitle={
                <>
                  {formatPrice(p.price)}
                  {p.discountPercent > 0 && <span className="font-bold text-brand-ink"> • {discountLabel(p.discountPercent)}</span>}
                  {!p.isAvailable && ` • ${t('خلصان')}`}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Platform offer: pick a store, then its products; picks from other stores are kept. */
function PlatformProductsPicker({ selected, onToggle }: { selected: Map<number, OfferProductSummary>; onToggle: (p: OfferProductSummary) => void }) {
  const stores = useAdminStores();
  const [storeId, setStoreId] = useState<number | null>(null);
  const list = stores.data ?? [];
  const store = list.find((s) => s.id === storeId);
  const pickedIn = (id: number) => [...selected.values()].filter((p) => p.storeId === id).length;

  return (
    <div className="flex flex-col gap-2">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold text-ink-2">{t('منتجات من محل')}</span>
        <select className="field" value={storeId ?? ''} onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : null)} disabled={stores.isLoading}>
          <option value="">{stores.isLoading ? t('بيحمّل المحلات...') : t('اختار محل')}</option>
          {list.map((s) => {
            const n = pickedIn(s.id);
            return (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status !== 'Active' ? ` (${t('مش نشط')})` : ''}
                {n > 0 ? ` • ${t('{n} مختار', { n })}` : ''}
              </option>
            );
          })}
        </select>
      </label>
      {store && <ProductsPicker key={store.id} storeId={store.id} storeName={store.name} selected={selected} onToggle={onToggle} />}
    </div>
  );
}

/** Platform offer: the stores shown on the offer page, with search. */
function StoresPicker({ selected, onChange }: { selected: number[]; onChange: (ids: number[]) => void }) {
  const stores = useAdminStores();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = (stores.data ?? []).filter((s) => !q || [s.name, s.nameEn, s.nameRu].some((n) => n?.toLowerCase().includes(q)));
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <p className="mb-2 text-sm font-extrabold text-ink">
        {t('محلات العرض')} <span className="font-bold text-ink-3">({selected.length})</span>
      </p>
      <div className="rounded-2xl border border-line">
        <div className="p-2">
          <SearchBox value={query} onChange={setQuery} placeholder={t('دوّر على محل')} />
        </div>
        {stores.isLoading ? (
          <Loading className="py-6" />
        ) : stores.isError ? (
          <p className="px-3 pb-3 text-sm text-danger">{(stores.error as Error).message}</p>
        ) : list.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-ink-3">{t('مفيش محلات بالاسم ده')}</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border-t border-line py-1">
            {list.map((s) => (
              <PickRow
                key={s.id}
                checked={selected.includes(s.id)}
                onClick={() => toggle(s.id)}
                image={<AppImage url={s.logoUrl} fallback={<StoreIcon className="size-4 text-ink-3" />} />}
                title={s.name}
                subtitle={s.status !== 'Active' ? t('مش نشط (مش هيظهر للزبون)') : s.categoryName}
              />
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-3">{t('المحلات بتظهر في صفحة العرض، والزبون يدخل عليها.')}</p>
    </div>
  );
}
