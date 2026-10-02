import clsx from 'clsx';
import { ArrowDown, ArrowUp, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { storeCategoriesApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAdminStoreCategories } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { AppImage, Button, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { ImagePickerField, noImageEdit, type ImageEdit } from '@/features/owner/ImagePicker';
import { STORE_CATEGORY_ICONS, categoryLook } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { StoreCategory } from '@/types';

/** The admin's store categories: add, edit (name, icon, picture), reorder, show / hide, delete. */
export function AdminCategoriesPage() {
  const categories = useAdminStoreCategories();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StoreCategory | null | undefined>(undefined); // undefined = closed, null = new
  /** Order shown while a move is being saved, so the list does not jump back. */
  const [pending, setPending] = useState<StoreCategory[] | null>(null);

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
      c.isVisible ? `${c.name} اتخفى من الرئيسية` : `${c.name} ظاهر في الرئيسية`,
    );
    if (ok) refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title="الأقسام"
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            قسم جديد
          </Button>
        }
      />
      <div className="px-4">
        {categories.isLoading ? (
          <Loading />
        ) : categories.isError ? (
          <ErrorView message={(categories.error as Error).message} onRetry={() => categories.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView icon={LayoutGrid} message={'مفيش أقسام لسه.\nضيف أول قسم.'} />
        ) : (
          <>
            <p className="mb-3 text-sm leading-relaxed text-ink-2">
              رتّب الأقسام بالأسهم زي ما تظهر للزبون. القسم المخفي محلاته بتفضل ظاهرة تحت "كل المحلات".
            </p>
            <div className="flex flex-col gap-2.5">
              {list.map((c, i) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  first={i === 0}
                  last={i === list.length - 1}
                  busy={pending !== null}
                  onUp={() => move(i, -1)}
                  onDown={() => move(i, 1)}
                  onEdit={() => setEditing(c)}
                  onToggle={() => toggle(c)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-24 z-30 px-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<Plus className="size-5" />} onClick={() => setEditing(null)}>
            قسم جديد
          </Button>
        </div>
      </div>

      <CategoryFormSheet
        key={editing === undefined ? 'closed' : (editing?.id ?? 'new')}
        open={editing !== undefined}
        category={editing ?? null}
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

function CategoryRow({
  category: c,
  first,
  last,
  busy,
  onUp,
  onDown,
  onEdit,
  onToggle,
}: {
  category: StoreCategory;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const arrow = 'grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-alt hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <SoftCard className={clsx('flex items-center gap-3 p-2.5', !c.isVisible && 'opacity-60')}>
      <div className="flex flex-col">
        <button type="button" aria-label="لفوق" disabled={first || busy} onClick={onUp} className={arrow}>
          <ArrowUp className="size-4" />
        </button>
        <button type="button" aria-label="لتحت" disabled={last || busy} onClick={onDown} className={arrow}>
          <ArrowDown className="size-4" />
        </button>
      </div>
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <CategoryThumb category={c} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">{c.name}</span>
          <span className="text-xs text-ink-3">
            {c.storesCount} محل{c.imageUrl ? '' : ' • من غير صورة'}
          </span>
        </span>
      </button>
      {!c.isVisible && <StatusChip label="مخفي" color="var(--color-ink-3)" />}
      <Switch checked={c.isVisible} onChange={onToggle} label={c.isVisible ? 'إخفاء' : 'إظهار'} />
    </SoftCard>
  );
}

/** Add or edit a category: name, icon (shown when there is no picture), picture; delete when empty. */
function CategoryFormSheet({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: StoreCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = category === null;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'other');
  const [image, setImage] = useState<ImageEdit>(noImageEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('اكتب اسم القسم');
    setBusy(true);
    setError(null);
    try {
      const saved = isNew
        ? await storeCategoriesApi.create(name.trim(), icon)
        : await storeCategoriesApi.update(category.id, name.trim(), icon);
      // Saved first, so a failed upload never loses the name and icon.
      if (image.kind === 'picked') await storeCategoriesApi.uploadImage(saved.id, image.file);
      else if (image.kind === 'removed' && category?.imageUrl) await storeCategoriesApi.removeImage(saved.id);
      showMessage(isNew ? 'القسم اتضاف' : 'القسم اتحفظ');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!category || !(await confirm(`تمسح قسم "${category.name}"؟`, 'امسح'))) return;
    setBusy(true);
    if (await runAction(() => storeCategoriesApi.delete(category.id), 'القسم اتمسح')) {
      onSaved();
      onClose();
    }
    setBusy(false);
  }

  const look = categoryLook(icon);

  return (
    <Sheet open={open} onClose={onClose} title={isNew ? 'قسم جديد' : 'تعديل القسم'} wide>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField name="name" label="اسم القسم" placeholder="مثلاً: مخبوزات" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />

        <p className="text-sm font-bold text-ink-2">الأيقونة (بتظهر لو مفيش صورة)</p>
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
          label="صورة القسم (اختياري)"
          currentUrl={category?.imageUrl}
          edit={image}
          onChange={setImage}
          placeholderIcon={look.Icon}
          aspect="aspect-[1.6]"
        />

        {error && <InlineError message={error} />}

        <Button type="submit" loading={busy} block className="mt-1">
          {isNew ? 'إضافة القسم' : 'حفظ'}
        </Button>

        {!isNew && (
          <>
            <Button type="button" variant="ghost" disabled={busy} icon={<Trash2 className="size-4" />} className="text-danger" onClick={remove}>
              امسح القسم
            </Button>
            <p className="text-center text-xs text-ink-3">
              المسح بس للقسم اللي مفيهوش محلات. لو فيه، انقل المحلات لقسم تاني أو خبّي القسم.
            </p>
          </>
        )}
      </form>
    </Sheet>
  );
}
