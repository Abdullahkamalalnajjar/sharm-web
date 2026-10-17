import { BookOpen, CircleCheck, CircleX, FileDown, FileUp, FolderPlus, MoreVertical, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router';

import { catalogApi } from '@/api';
import { keys, useManagedMenu, useStore } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, Sheet, SoftCard, StatusChip, Switch } from '@/components/ui';
import { MenuItem } from '@/features/addresses/AddressesPage';
import { formatPrice } from '@/lib/format';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { MenuCategory, MenuImportResult } from '@/types';

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
  const [excelBusy, setExcelBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = () => {
    qc.invalidateQueries({ queryKey: keys.managedMenu(storeId) });
    qc.invalidateQueries({ queryKey: keys.menu(storeId) });
  };
  const categories = menu.data?.categories ?? [];
  const hasSubs = (c: MenuCategory) => categories.some((x) => x.parentId === c.id);

  async function saveCategory(v: CategoryValues) {
    const c = categoryDialog?.category;
    const ok = await runAction(async () => {
      if (!c) {
        await catalogApi.createCategory(storeId, v);
        return;
      }
      await catalogApi.updateCategory(storeId, c.id, { name: v.name, displayOrder: v.displayOrder, nameEn: v.nameEn, nameRu: v.nameRu });
      if (!hasSubs(c) && v.parentId !== c.parentId) await catalogApi.moveCategory(storeId, c.id, v.parentId);
    });
    if (ok) reload();
  }

  /** Downloads the menu (or the empty template) as an Excel sheet. */
  async function exportExcel() {
    setExcelBusy(true);
    await runAction(async () => {
      const blob = await catalogApi.exportMenu(storeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-${storeId}.xlsx`;
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
    if (!(await confirm(`تمسح قسم "${c.name}"؟`, 'مسح'))) return;
    if (await runAction(() => catalogApi.deleteCategory(storeId, c.id), 'القسم اتمسح')) reload();
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHeader
        title={store.data ? `منيو ${store.data.name}` : 'المنيو'}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<FileDown className="size-4" />} loading={excelBusy} onClick={exportExcel} title="المنيو الحالي، أو template فاضي تملاه">
              نزّل المنيو Excel
            </Button>
            <Button size="sm" variant="outline" icon={<FileUp className="size-4" />} disabled={excelBusy} onClick={() => fileInput.current?.click()} title="يضيف ويحدّث المنتجات مرة واحدة">
              ارفع ملف Excel
            </Button>
            <Button size="sm" className="hidden md:inline-flex" icon={<FolderPlus className="size-4" />} onClick={() => setCategoryDialog({ category: null })}>
              قسم جديد
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
      <div className="px-4">
        {menu.isLoading ? (
          <Loading />
        ) : menu.isError ? (
          <ErrorView message={(menu.error as Error).message} onRetry={reload} />
        ) : categories.length === 0 ? (
          <EmptyView icon={BookOpen} message='ابدأ بإضافة قسم، زي "مشويات" أو "ألبان"' />
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((c) => (
              // Sub-categories are indented under their main category.
              <SoftCard key={c.id} className={`overflow-hidden ${c.parentId !== null ? 'ms-6' : ''}`}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-extrabold text-ink">{c.name}</span>
                      {c.parentId !== null && <StatusChip label="فرعي" color="var(--color-series-3)" />}
                      {!c.isActive && <StatusChip label="مخفي" color="var(--color-ink-3)" />}
                    </div>
                    <span className="text-sm text-ink-2">{c.products.length} منتج</span>
                  </div>
                  <button type="button" aria-label="خيارات" onClick={() => setMenuFor(c)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                    <MoreVertical className="size-5" />
                  </button>
                </div>
                {c.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border-t border-line px-4 py-3">
                    <button type="button" onClick={() => navigate(`${basePath}/stores/${storeId}/products/${p.id}`)} className="min-w-0 flex-1 text-start">
                      <p className="truncate font-bold text-ink">{p.name}</p>
                      <p className="text-xs text-ink-2">
                        {[formatPrice(p.price), p.optionGroups.length > 0 && `${p.optionGroups.length} مجموعة اختيارات`].filter(Boolean).join(' • ')}
                      </p>
                    </button>
                    <Switch
                      checked={p.isAvailable}
                      label="متاح"
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
                    إضافة منتج
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
            قسم جديد
          </Button>
        </div>
      </div>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        {menuFor && (
          <div className="flex flex-col">
            <MenuItem onClick={() => categoryAction('edit', menuFor)}>تعديل</MenuItem>
            <MenuItem onClick={() => categoryAction('toggle', menuFor)}>{menuFor.isActive ? 'إخفاء من المنيو' : 'إظهار في المنيو'}</MenuItem>
            <MenuItem danger onClick={() => categoryAction('delete', menuFor)}>
              مسح
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
                parentId: categoryDialog.category.parentId,
              }
            : { displayOrder: categories.length + 1 }
        }
      />

      <Sheet open={importResult !== null} onClose={() => setImportResult(null)} title={importResult?.imported ? 'المنيو اتحدّث' : 'في أخطاء في الملف'}>
        {importResult && (
          <div className="flex flex-col gap-3">
            {importResult.imported ? (
              <div className="flex items-start gap-3">
                <CircleCheck className="size-8 shrink-0 text-success" />
                <div className="text-ink">
                  <p>{importResult.productsCreated} منتج جديد</p>
                  <p>{importResult.productsUpdated} منتج اتحدّث</p>
                  {importResult.categoriesCreated > 0 && <p>{importResult.categoriesCreated} قسم جديد</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-ink-2">
                  <CircleX className="size-6 shrink-0 text-danger" />
                  محدش اتحفظ. صلّح الصفوف دي وارفع الملف تاني:
                </div>
                <ul className="max-h-80 overflow-y-auto text-sm">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="py-1">
                      <span className="font-extrabold">صف {e.rowNumber}: </span>
                      {e.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex justify-end">
              <Button size="md" onClick={() => setImportResult(null)}>
                تمام
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
