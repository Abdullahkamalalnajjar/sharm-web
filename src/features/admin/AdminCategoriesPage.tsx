import clsx from 'clsx';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageOff, LayoutGrid, Pencil, Plus, Search, SearchX, Trash2, X, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { storeCategoriesApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAdminStoreCategories } from '@/api/queries';
import { AppImage, Button, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { ImagePickerField, noImageEdit, type ImageEdit } from '@/features/owner/ImagePicker';
import { TranslationFields, translationInput, translationValues } from '@/features/owner/TranslationFields';
import { t, tIn } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { STORE_CATEGORY_ICONS, categoryLook } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { StoreCategory } from '@/types';

type CategoryFilter = 'all' | 'shown' | 'hidden' | 'noImage';

const nameOf = (c: StoreCategory) => localized(c.name, c.nameEn, c.nameRu, c.nameTr, c.nameIt);

function passesFilter(c: StoreCategory, f: CategoryFilter): boolean {
  if (f === 'shown') return c.isVisible;
  if (f === 'hidden') return !c.isVisible;
  if (f === 'noImage') return !c.imageUrl;
  return true;
}

/**
 * The admin's store categories: add, edit (name, icon, picture), reorder, show / hide, delete. A main category can
 * hold sub-categories (مطاعم ← بيتزا، شرقي، غربي), listed inside its card.
 */
export function AdminCategoriesPage() {
  const categories = useAdminStoreCategories();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StoreCategory | null | undefined>(undefined); // undefined = closed, null = new
  /** A new category goes inside this main category (set by "قسم فرعي"). */
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const openNew = (parentId: number | null = null) => {
    setNewParentId(parentId);
    setEditing(null);
  };
  /** Order shown while a move is being saved, so the list does not jump back. */
  const [pending, setPending] = useState<StoreCategory[] | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');

  // The customer tiles, filters and dashboard all read categories.
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.storeCategories });
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['stores'] });
  };

  const list = pending ?? categories.data ?? [];

  async function move(index: number, by: -1 | 1) {
    const items = [...list];
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setPending(items);
    await runAction(() => storeCategoriesApi.reorder(items.map((c) => c.id)));
    await qc.invalidateQueries({ queryKey: keys.adminStoreCategories });
    qc.invalidateQueries({ queryKey: keys.storeCategories });
    setPending(null);
  }

  async function toggle(c: StoreCategory) {
    const ok = await runAction(
      () => storeCategoriesApi.setVisible(c.id, !c.isVisible),
      c.isVisible ? t('{name} اتخفى من الرئيسية', { name: nameOf(c) }) : t('{name} ظاهر في الرئيسية', { name: nameOf(c) }),
    );
    if (ok) refresh();
  }

  const everyCategory = list.flatMap((c) => [c, ...(c.subCategories ?? [])]);
  const subCount = everyCategory.length - list.length;
  const countOf = (f: CategoryFilter) => everyCategory.filter((c) => passesFilter(c, f)).length;

  const q = query.trim().toLowerCase();
  const nameHas = (c: StoreCategory) =>
    !q || [c.name, c.nameEn, c.nameRu, c.nameTr, c.nameIt].some((n) => (n ?? '').toLowerCase().includes(q));
  /** Reordering only makes sense on the full list. */
  const narrowed = filter !== 'all' || q !== '';
  // A main category shows when it matches, or when one of its sub-categories does (then only those show).
  const shown = list
    .map((c, index) => {
      const subs = (c.subCategories ?? []).filter((s) => passesFilter(s, filter) && (nameHas(s) || nameHas(c)));
      const self = passesFilter(c, filter) && nameHas(c);
      return { c, index, subs: self && !narrowed ? (c.subCategories ?? []) : subs, visible: self || subs.length > 0 };
    })
    .filter((x) => x.visible);

  const stats: { key: CategoryFilter; label: string; color: string; icon: LucideIcon }[] = [
    { key: 'all', label: t('كل الأقسام'), color: 'var(--color-brand)', icon: LayoutGrid },
    { key: 'shown', label: t('ظاهرة للزبون'), color: 'var(--color-success)', icon: Eye },
    { key: 'hidden', label: t('مخفية'), color: 'var(--color-ink-3)', icon: EyeOff },
    { key: 'noImage', label: t('من غير صورة'), color: 'var(--color-warning)', icon: ImageOff },
  ];

  return (
    <div className="pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('الأقسام')}</h1>
          {categories.data && (
            <p className="text-[13px] font-medium text-ink-3">{t('{n} قسم رئيسي • {m} قسم فرعي', { n: list.length, m: subCount })}</p>
          )}
        </div>
        <Button size="md" icon={<Plus className="size-4" />} title={t('قسم جديد')} onClick={() => openNew()}>
          <span className="hidden sm:inline">{t('قسم جديد')}</span>
        </Button>
      </div>

      <div className="px-4 pt-4">
        {categories.isLoading ? (
          <Loading />
        ) : categories.isError ? (
          <ErrorView message={(categories.error as Error).message} onRetry={() => categories.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView icon={LayoutGrid} message={t('مفيش أقسام لسه.\nضيف أول قسم.')} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* The counts double as filters. */}
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {stats.map((s) => {
                const selected = filter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilter(s.key)}
                    aria-pressed={selected}
                    className={clsx(
                      'flex items-center gap-3 rounded-card border bg-surface p-3.5 text-start shadow-card transition-colors',
                      selected ? 'border-brand ring-1 ring-brand' : 'border-transparent hover:bg-surface-alt',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[22px] font-extrabold leading-tight text-ink tabular-nums">{countOf(s.key)}</span>
                      <span className="block truncate text-xs font-semibold text-ink-2">{s.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand md:w-[380px]">
                <Search className="size-5 text-ink-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('دور باسم القسم')}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
                />
                {query && (
                  <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
                    <X className="size-5" />
                  </button>
                )}
              </label>
              <p className="text-xs leading-relaxed text-ink-3 md:max-w-md md:text-end">
                {narrowed
                  ? t('الترتيب بالأسهم بيشتغل لما تعرض كل الأقسام من غير بحث.')
                  : t('رتّب الأقسام بالأسهم زي ما تظهر للزبون. القسم المخفي محلاته بتفضل ظاهرة تحت "كل المحلات".')}
              </p>
            </div>

            {shown.length === 0 ? (
              <EmptyView icon={q ? SearchX : LayoutGrid} message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : t('مفيش أقسام هنا')} />
            ) : (
              <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {shown.map(({ c, index, subs }) => (
                  <MainCategoryCard
                    key={c.id}
                    category={c}
                    position={index + 1}
                    subs={subs}
                    canMove={!narrowed}
                    first={index === 0}
                    last={index === list.length - 1}
                    busy={pending !== null}
                    onUp={() => move(index, -1)}
                    onDown={() => move(index, 1)}
                    onEdit={setEditing}
                    onToggle={toggle}
                    onAddSub={() => openNew(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryFormSheet
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        category={editing ?? null}
        parentId={newParentId}
        mains={categories.data ?? []}
        onClose={() => setEditing(undefined)}
        onSaved={refresh}
      />
    </div>
  );
}

/** The category's picture, or its icon on a tint of its color. */
export function CategoryThumb({ category, size = 48 }: { category: Pick<StoreCategory, 'icon' | 'imageUrl' | 'name'>; size?: number }) {
  const look = categoryLook(category.icon);
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: `color-mix(in srgb, ${look.color} 16%, transparent)` }}
    >
      <look.Icon style={{ width: size * 0.5, height: size * 0.5, color: look.color }} />
      <AppImage url={category.imageUrl} alt={category.name} fallback={null} className="absolute inset-0" />
    </span>
  );
}

/** "12 محل • من غير صورة" under a category's name. */
function CategoryMeta({ category: c }: { category: StoreCategory }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-3">
      <span>{t('{n} محل', { n: c.storesCount })}</span>
      {!c.imageUrl && (
        <>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-warning">
            <ImageOff className="size-3" />
            {t('من غير صورة')}
          </span>
        </>
      )}
    </span>
  );
}

/** A main category as a card: its order, picture, name, switch, and its sub-categories inside. */
function MainCategoryCard({
  category: c,
  position,
  subs,
  canMove,
  first,
  last,
  busy,
  onUp,
  onDown,
  onEdit,
  onToggle,
  onAddSub,
}: {
  category: StoreCategory;
  position: number;
  /** The sub-categories to list (all of them, or the ones matching the search). */
  subs: StoreCategory[];
  canMove: boolean;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: (c: StoreCategory) => void;
  onToggle: (c: StoreCategory) => void;
  onAddSub: () => void;
}) {
  const arrow = 'grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-alt hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';
  const total = (c.subCategories ?? []).length;
  return (
    <SoftCard className="flex flex-col overflow-hidden">
      <div className={clsx('flex items-center gap-3 p-3', !c.isVisible && 'opacity-60')}>
        <button type="button" onClick={() => onEdit(c)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
          <span className="relative">
            <CategoryThumb category={c} size={56} />
            <span className="absolute -top-1.5 -start-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-white ring-2 ring-surface tabular-nums">
              {position}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-extrabold text-ink">{nameOf(c)}</span>
              {!c.isVisible && <StatusChip label={t('مخفي')} color="var(--color-ink-3)" />}
            </span>
            <CategoryMeta category={c} />
            {total > 0 && <span className="block text-xs text-ink-3">{t('{n} قسم فرعي', { n: total })}</span>}
          </span>
        </button>
        <Switch checked={c.isVisible} onChange={() => onToggle(c)} label={c.isVisible ? tIn('admin', 'إخفاء') : t('إظهار')} />
      </div>

      {subs.length > 0 && (
        <div className="flex flex-col border-t border-line">
          {subs.map((s) => (
            <div key={s.id} className={clsx('flex items-center gap-2.5 px-3 py-2 hover:bg-surface-alt/60', !s.isVisible && 'opacity-60')}>
              <button type="button" onClick={() => onEdit(s)} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
                <CategoryThumb category={s} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-ink">{nameOf(s)}</span>
                    {!s.isVisible && <StatusChip label={t('مخفي')} color="var(--color-ink-3)" />}
                  </span>
                  <CategoryMeta category={s} />
                </span>
              </button>
              <Switch checked={s.isVisible} onChange={() => onToggle(s)} label={s.isVisible ? tIn('admin', 'إخفاء') : t('إظهار')} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-1 border-t border-line bg-surface-alt/40 px-2 py-1.5">
        {canMove && (
          <>
            <button type="button" aria-label={t('لفوق')} title={t('لفوق')} disabled={first || busy} onClick={onUp} className={arrow}>
              <ArrowUp className="size-4" />
            </button>
            <button type="button" aria-label={t('لتحت')} title={t('لتحت')} disabled={last || busy} onClick={onDown} className={arrow}>
              <ArrowDown className="size-4" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onAddSub}
          className="ms-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-brand-ink hover:bg-surface-alt"
        >
          <Plus className="size-4" />
          {t('قسم فرعي')}
        </button>
        <button type="button" onClick={() => onEdit(c)} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-ink-2 hover:bg-surface-alt hover:text-ink">
          <Pencil className="size-4" />
          {t('تعديل')}
        </button>
      </div>
    </SoftCard>
  );
}

/** Add or edit a category: name, icon (shown when there is no picture), picture; delete when empty. */
function CategoryFormSheet({
  open,
  category,
  parentId: newParentId,
  mains,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: StoreCategory | null;
  /** Where a new category goes: inside this main category, or null for a main category. */
  parentId: number | null;
  /** The main categories, to choose where the category goes. */
  mains: StoreCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = category === null;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'other');
  const [parentId, setParentId] = useState<number | null>(category ? (category.parentId ?? null) : newParentId);
  // A main category that has sub-categories stays a main category.
  const canMove = (category?.subCategories ?? []).length === 0;
  const [translations, setTranslations] = useState(() => translationValues(category ?? undefined));
  const [image, setImage] = useState<ImageEdit>(noImageEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t('اكتب اسم القسم'));
    setBusy(true);
    setError(null);
    try {
      const { nameEn, nameRu, nameTr, nameIt } = translationInput(translations);
      const names = { nameEn, nameRu, nameTr, nameIt };
      const saved = isNew
        ? await storeCategoriesApi.create(name.trim(), icon, names, parentId)
        : await storeCategoriesApi.update(category.id, name.trim(), icon, names);
      if (!isNew && parentId !== (category.parentId ?? null)) await storeCategoriesApi.move(saved.id, parentId);
      // Saved first, so a failed upload never loses the name and icon.
      if (image.kind === 'picked') await storeCategoriesApi.uploadImage(saved.id, image.file);
      else if (image.kind === 'removed' && category?.imageUrl) await storeCategoriesApi.removeImage(saved.id);
      showMessage(isNew ? t('القسم اتضاف') : t('القسم اتحفظ'));
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!category || !(await confirm(t('تمسح قسم "{name}"؟', { name: localized(category.name, category.nameEn, category.nameRu, category.nameTr, category.nameIt) }), t('امسح')))) return;
    setBusy(true);
    if (await runAction(() => storeCategoriesApi.delete(category.id), t('القسم اتمسح'))) {
      onSaved();
      onClose();
    }
    setBusy(false);
  }

  const look = categoryLook(icon);

  return (
    <Sheet open={open} onClose={onClose} title={isNew ? t('قسم جديد') : t('تعديل القسم')} wide>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField name="name" label={t('اسم القسم')} placeholder={t('مثلاً: مخبوزات')} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        <TranslationFields value={translations} onChange={setTranslations} withDescription={false} nameMaxLength={50} />

        {canMove && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink-2">{t('مكان القسم')}</span>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value === '' ? null : Number(e.target.value))}
              className="h-12 rounded-xl border border-line bg-surface px-3 text-ink"
            >
              <option value="">{t('قسم رئيسي')}</option>
              {mains
                .filter((m) => m.id !== category?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {t('جوه {name}', { name: localized(m.name, m.nameEn, m.nameRu, m.nameTr, m.nameIt) })}
                  </option>
                ))}
            </select>
          </label>
        )}

        <p className="text-sm font-bold text-ink-2">{t('الأيقونة (بتظهر لو مفيش صورة)')}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STORE_CATEGORY_ICONS).map(([key, l]) => (
            <button
              key={key}
              type="button"
              title={l.hint}
              aria-label={l.hint}
              aria-pressed={key === icon}
              onClick={() => setIcon(key)}
              className={clsx('grid size-12 place-items-center rounded-[14px] border-2 transition-colors', key === icon ? '' : 'border-transparent bg-surface-alt')}
              style={key === icon ? { borderColor: l.color, background: `color-mix(in srgb, ${l.color} 25%, transparent)` } : undefined}
            >
              <l.Icon className="size-[22px]" style={{ color: key === icon ? l.color : 'var(--color-ink-2)' }} />
            </button>
          ))}
        </div>

        <ImagePickerField
          label={t('صورة القسم (اختياري)')}
          currentUrl={category?.imageUrl}
          edit={image}
          onChange={setImage}
          placeholderIcon={look.Icon}
          aspect="aspect-[1.6]"
        />

        {error && <InlineError message={error} />}

        <Button type="submit" loading={busy} block className="mt-1">
          {isNew ? t('إضافة القسم') : t('حفظ')}
        </Button>

        {!isNew && (
          <>
            <Button type="button" variant="ghost" disabled={busy} icon={<Trash2 className="size-4" />} className="text-danger" onClick={remove}>
              {t('امسح القسم')}
            </Button>
            <p className="text-center text-xs text-ink-3">
              {t('المسح بس للقسم اللي مفيهوش محلات ولا أقسام فرعية. لو فيه، انقلهم لقسم تاني أو خبّي القسم.')}
            </p>
          </>
        )}
      </form>
    </Sheet>
  );
}
