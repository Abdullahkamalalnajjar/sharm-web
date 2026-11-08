import { BookOpen, CircleCheck, CircleX, FileDown, FileSpreadsheet, FileText, FileUp, FolderPlus, Loader2, MoreVertical, Plus, Sandwich, Sparkles, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router';

import { catalogApi } from '@/api';
import { ApiError, errorMessage } from '@/api/client';
import { keys, useManagedMenu, useStore } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { AppImage, Button, EmptyView, ErrorView, Loading, Sheet, SoftCard, StatusChip, Switch } from '@/components/ui';
import { MenuItem } from '@/features/addresses/AddressesPage';
import { applyDiscount, formatPercent, formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { localized } from '@/lib/localized';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { MenuCategory, MenuImportResult, Product } from '@/types';

import { CategoryDialog, type CategoryValues } from './Dialogs';

export function ManageMenuPage() {
  const storeId = Number(useParams().id);
  const store = useStore(storeId);
  const menu = useManagedMenu(storeId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const basePath = useLocation().pathname.startsWith('/admin') ? '/admin' : '/owner';
  const [categoryDialog, setCategoryDialog] = useState<{ category: MenuCategory | null } | null>(null);
  const [menuFor, setMenuFor] = useState<MenuCategory | null>(null);
  const [importResult, setImportResult] = useState<MenuImportResult | null>(null);
  // Products whose photo is being drawn; several can run at once.
  const [generating, setGenerating] = useState<ReadonlySet<number>>(new Set());
  // Drawing the whole menu: how many of how many are done.
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelMenu, setExcelMenu] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = () => {
    qc.invalidateQueries({ queryKey: keys.managedMenu(storeId) });
    qc.invalidateQueries({ queryKey: keys.menu(storeId) });
  };

  /**
   * Draws photos for the whole menu: the products without one, or all of them when every product has
   * one. Two at a time, since each takes up to two minutes on the server.
   */
  async function generateMenuImages() {
    const products = (menu.data?.categories ?? []).flatMap((c) => c.products);
    if (products.length === 0) return;
    const missing = products.filter((p) => !p.imageUrl);
    const targets = missing.length > 0 ? missing : products;
    const question =
      missing.length > 0
        ? t('ترسم صور بالذكاء الاصطناعي لـ {n} منتج من غير صورة؟', { n: missing.length })
        : t('كل المنتجات عندها صور. ترسم صور جديدة لكل المنتجات ({n})؟', { n: products.length });
    if (!(await confirm(question, t('ارسم')))) return;

    let done = 0;
    let failed = 0;
    let stopped: string | null = null;
    const queue = [...targets];
    setBulk({ done: 0, total: targets.length });
    const worker = async () => {
      for (let p = queue.shift(); p && !stopped; p = queue.shift()) {
        const id = p.id;
        setGenerating((s) => new Set(s).add(id));
        try {
          await catalogApi.generateProductImage(storeId, id);
        } catch (e) {
          failed++;
          // The service is off: no point trying the rest.
          if (e instanceof ApiError && e.errors.some((x) => x.code === 'Image.GenerationUnavailable')) stopped = errorMessage(e);
        }
        done++;
        setBulk({ done, total: targets.length });
        setGenerating((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        reload();
      }
    };
    await Promise.all([worker(), worker()]);
    setBulk(null);
    if (stopped) showMessage(stopped, true);
    else if (failed > 0) showMessage(t('اترسمت {ok} صورة، و{failed} فشلوا', { ok: done - failed, failed }), true);
    else showMessage(t('اترسمت {n} صورة', { n: done }));
  }

  /** Has the server draw the product's picture with AI (from its saved name and description). */
  async function generateImage(p: Product) {
    if (p.imageUrl && !(await confirm(t('تبدّل صورة المنتج الحالية بصورة جديدة؟'), t('ارسم')))) return;
    setGenerating((s) => new Set(s).add(p.id));
    if (await runAction(() => catalogApi.generateProductImage(storeId, p.id), t('الصورة اتعملت'))) reload();
    setGenerating((s) => {
      const next = new Set(s);
      next.delete(p.id);
      return next;
    });
  }
  const categories = menu.data?.categories ?? [];
  const hasSubs = (c: MenuCategory) => categories.some((x) => x.parentId === c.id);

  async function saveCategory(v: CategoryValues) {
    const c = categoryDialog?.category;
    const ok = await runAction(async () => {
      if (!c) {
        await catalogApi.createCategory(storeId, v);
        return;
      }
      await catalogApi.updateCategory(storeId, c.id, { name: v.name, displayOrder: v.displayOrder, nameEn: v.nameEn, nameRu: v.nameRu, nameTr: v.nameTr, nameIt: v.nameIt });
      if (!hasSubs(c) && v.parentId !== c.parentId) await catalogApi.moveCategory(storeId, c.id, v.parentId);
    });
    if (ok) reload();
  }

  /** Downloads an Excel sheet: the menu (or the empty template), or the filled-in example. */
  async function download(load: () => Promise<Blob>, fileName: string) {
    setExcelMenu(false);
    setExcelBusy(true);
    await runAction(async () => {
      const blob = await load();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
    setExcelBusy(false);
  }

  async function importExcel(file: File) {
    setExcelBusy(true);
    let result: MenuImportResult | null = null;
    await runAction(async () => {
      result = await catalogApi.importMenu(storeId, file);
    });
    setExcelBusy(false);
    if (result) {
      setImportResult(result);
      if ((result as MenuImportResult).imported) reload();
    }
  }

  // A category with sub-categories stays a main one; it cannot go inside itself.
  const mainChoices = (c: MenuCategory | null) =>
    c && hasSubs(c) ? [] : categories.filter((x) => x.parentId === null && x.id !== c?.id).map((x) => ({ id: x.id, name: x.name }));

  async function categoryAction(action: 'edit' | 'toggle' | 'delete', c: MenuCategory) {
    setMenuFor(null);
    if (action === 'edit') return setCategoryDialog({ category: c });
    if (action === 'toggle') {
      if (await runAction(() => catalogApi.setCategoryActive(storeId, c.id, !c.isActive))) reload();
      return;
    }
    if (!(await confirm(t('تمسح قسم "{name}"؟', { name: localized(c.name, c.nameEn, c.nameRu, c.nameTr, c.nameIt) }), t('مسح')))) return;
    if (await runAction(() => catalogApi.deleteCategory(storeId, c.id), t('القسم اتمسح'))) reload();
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={store.data ? t('منيو {name}', { name: localized(store.data.name, store.data.nameEn, store.data.nameRu, store.data.nameTr, store.data.nameIt) }) : t('المنيو')}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<FileSpreadsheet className="size-4" />} loading={excelBusy} onClick={() => setExcelMenu(true)}>
              Excel
            </Button>
            <Button size="sm" className="hidden md:inline-flex" icon={<FolderPlus className="size-4" />} onClick={() => setCategoryDialog({ category: null })}>
              {t('قسم جديد')}
            </Button>
          </div>
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) importExcel(file);
        }}
      />
      {menu.data?.categories.some((c) => c.products.length > 0) && (
        <div className="mb-3 flex justify-end px-4">
          <Button
            size="sm"
            variant="outline"
            icon={bulk ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            disabled={bulk !== null}
            title={t('ارسم صور المنيو كله بالذكاء الاصطناعي')}
            onClick={generateMenuImages}
          >
            {bulk ? t('بيرسم {done}/{total}', bulk) : t('ارسم صور المنيو كله بالذكاء الاصطناعي')}
          </Button>
        </div>
      )}
      <div className="px-4">
        {menu.isLoading ? (
          <Loading />
        ) : menu.isError ? (
          <ErrorView message={(menu.error as Error).message} onRetry={reload} />
        ) : categories.length === 0 ? (
          <EmptyView icon={BookOpen} message={t('ابدأ بإضافة قسم، زي "مشويات" أو "ألبان"')} />
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((c) => (
              // Sub-categories are indented under their main category.
              <SoftCard key={c.id} className={`overflow-hidden ${c.parentId !== null ? 'ms-6' : ''}`}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-extrabold text-ink">{localized(c.name, c.nameEn, c.nameRu, c.nameTr, c.nameIt)}</span>
                      {c.parentId !== null && <StatusChip label={t('فرعي')} color="var(--color-series-3)" />}
                      {!c.isActive && <StatusChip label={t('مخفي')} color="var(--color-ink-3)" />}
                    </div>
                    <span className="text-sm text-ink-2">{t('{n} منتج', { n: c.products.length })}</span>
                  </div>
                  <button type="button" aria-label={t('خيارات')} onClick={() => setMenuFor(c)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                    <MoreVertical className="size-5" />
                  </button>
                </div>
                {c.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border-t border-line px-4 py-3">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-alt">
                      <AppImage url={p.imageUrl} alt="" fallback={<Sandwich className="size-5 text-ink-3" />} />
                    </span>
                    <button type="button" onClick={() => navigate(`${basePath}/stores/${storeId}/products/${p.id}`)} className="min-w-0 flex-1 text-start">
                      <p className="truncate font-bold text-ink">{localized(p.name, p.nameEn, p.nameRu, p.nameTr, p.nameIt)}</p>
                      <p className="text-xs text-ink-2">
                        {[
                          formatPrice(p.price),
                          p.discountPercent > 0 &&
                            t('خصم {percent} ← {price}', { percent: formatPercent(p.discountPercent), price: formatPrice(p.finalPrice ?? applyDiscount(p.price, p.discountPercent)) }),
                          p.optionGroups.length > 0 && t('{n} مجموعة اختيارات', { n: p.optionGroups.length }),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </button>
                    <button
                      type="button"
                      title={generating.has(p.id) ? t('بيجهّز الصورة... ممكن ياخد لحد دقيقتين') : t('ارسم صورة بالذكاء الاصطناعي')}
                      aria-label={t('ارسم صورة بالذكاء الاصطناعي')}
                      disabled={generating.has(p.id)}
                      onClick={() => generateImage(p)}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-brand hover:bg-brand/10 disabled:opacity-60"
                    >
                      {generating.has(p.id) ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                    </button>
                    <Switch
                      checked={p.isAvailable}
                      label={t('متاح')}
                      onChange={async (v) => {
                        if (await runAction(() => catalogApi.setProductAvailability(storeId, p.id, v))) reload();
                      }}
                    />
                  </div>
                ))}
                <div className="border-t border-line">
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/stores/${storeId}/products/new?category=${c.id}`)}
                    className="flex w-full items-center justify-center gap-1.5 py-3 text-sm font-bold text-brand-ink hover:bg-surface-alt"
                  >
                    <Plus className="size-4" />
                    {t('إضافة منتج')}
                  </button>
                </div>
              </SoftCard>
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<FolderPlus className="size-5" />} onClick={() => setCategoryDialog({ category: null })}>
            {t('قسم جديد')}
          </Button>
        </div>
      </div>

      <Sheet open={excelMenu} onClose={() => setExcelMenu(false)} title={t('المنيو Excel')}>
        <div className="flex flex-col">
          <ExcelAction icon={FileDown} title={t('نزّل المنيو Excel')} subtitle={t('عدّل فيه أو املاه وارفعه')} onClick={() => download(() => catalogApi.exportMenu(storeId), `menu-${storeId}.xlsx`)} />
          <ExcelAction icon={FileText} title={t('نزّل ملف مثال')} subtitle={t('منيو كامل بكل الأعمدة وشرحها')} onClick={() => download(() => catalogApi.menuSample(storeId), 'menu-example.xlsx')} />
          <ExcelAction
            icon={FileUp}
            title={t('ارفع ملف Excel')}
            subtitle={t('يضيف ويحدّث المنتجات مرة واحدة')}
            onClick={() => {
              setExcelMenu(false);
              fileInput.current?.click();
            }}
          />
        </div>
      </Sheet>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor ? localized(menuFor.name, menuFor.nameEn, menuFor.nameRu, menuFor.nameTr, menuFor.nameIt) : undefined}>
        {menuFor && (
          <div className="flex flex-col">
            <MenuItem onClick={() => categoryAction('edit', menuFor)}>{t('تعديل')}</MenuItem>
            <MenuItem onClick={() => categoryAction('toggle', menuFor)}>{menuFor.isActive ? t('إخفاء من المنيو') : t('إظهار في المنيو')}</MenuItem>
            <MenuItem danger onClick={() => categoryAction('delete', menuFor)}>
              {t('مسح')}
            </MenuItem>
          </div>
        )}
      </Sheet>

      <CategoryDialog
        open={categoryDialog !== null}
        onClose={() => setCategoryDialog(null)}
        onSubmit={saveCategory}
        mainCategories={mainChoices(categoryDialog?.category ?? null)}
        initial={
          categoryDialog?.category
            ? {
                name: categoryDialog.category.name,
                displayOrder: categoryDialog.category.displayOrder,
                nameEn: categoryDialog.category.nameEn ?? '',
                nameRu: categoryDialog.category.nameRu ?? '',
                nameTr: categoryDialog.category.nameTr ?? '',
                nameIt: categoryDialog.category.nameIt ?? '',
                parentId: categoryDialog.category.parentId,
              }
            : { displayOrder: categories.length + 1 }
        }
      />

      <Sheet open={importResult !== null} onClose={() => setImportResult(null)} title={importResult?.imported ? t('المنيو اتحدّث') : t('في أخطاء في الملف')}>
        {importResult && (
          <div className="flex flex-col gap-3">
            {importResult.imported ? (
              <div className="flex items-start gap-3">
                <CircleCheck className="size-8 shrink-0 text-success" />
                <div className="text-ink">
                  <p>{t('{n} منتج جديد', { n: importResult.productsCreated })}</p>
                  <p>{t('{n} منتج اتحدّث', { n: importResult.productsUpdated })}</p>
                  {importResult.categoriesCreated > 0 && <p>{t('{n} قسم جديد', { n: importResult.categoriesCreated })}</p>}
                  {importResult.optionsCreated + importResult.optionsUpdated > 0 && (
                    <p>
                      {t('{n} إضافة جديدة', { n: importResult.optionsCreated })} • {t('{n} إضافة اتحدّثت', { n: importResult.optionsUpdated })}
                    </p>
                  )}
                  {(importResult.imagesSet ?? 0) > 0 && <p>{t('{n} صورة منتج اترفعت', { n: importResult.imagesSet ?? 0 })}</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-ink-2">
                  <CircleX className="size-6 shrink-0 text-danger" />
                  {t('محدش اتحفظ. صلّح الصفوف دي وارفع الملف تاني:')}
                </div>
                <ul className="max-h-80 overflow-y-auto text-sm">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="py-1">
                      <span className="font-extrabold">
                        {e.sheet && e.sheet !== 'المنتجات' ? `${e.sheet} • ` : ''}
                        {t('صف {n}:', { n: e.rowNumber })}{' '}
                      </span>
                      {e.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex justify-end">
              <Button size="md" onClick={() => setImportResult(null)}>
                {t('تمام')}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ExcelAction({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-3 text-start hover:bg-surface-alt">
      <Icon className="size-5 shrink-0 text-brand-ink" />
      <span>
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-xs text-ink-2">{subtitle}</span>
      </span>
    </button>
  );
}
