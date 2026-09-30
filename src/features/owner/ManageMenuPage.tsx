import { BookOpen, FolderPlus, MoreVertical, Plus } from 'lucide-react';
import { useState } from 'react';
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
import type { MenuCategory } from '@/types';

import { CategoryDialog } from './Dialogs';

export function ManageMenuPage() {
  const storeId = Number(useParams().id);
  const store = useStore(storeId);
  const menu = useManagedMenu(storeId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const basePath = useLocation().pathname.startsWith('/admin') ? '/admin' : '/owner';
  const [categoryDialog, setCategoryDialog] = useState<{ category: MenuCategory | null } | null>(null);
  const [menuFor, setMenuFor] = useState<MenuCategory | null>(null);

  const reload = () => qc.invalidateQueries({ queryKey: keys.managedMenu(storeId) });
  const categories = menu.data?.categories ?? [];

  async function saveCategory(v: { name: string; displayOrder: number }) {
    const c = categoryDialog?.category;
    const ok = await runAction(() =>
      c ? catalogApi.updateCategory(storeId, c.id, v.name, v.displayOrder) : catalogApi.createCategory(storeId, v.name, v.displayOrder),
    );
    if (ok) reload();
  }

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
          <Button size="sm" className="hidden md:inline-flex" icon={<FolderPlus className="size-4" />} onClick={() => setCategoryDialog({ category: null })}>
            قسم جديد
          </Button>
        }
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
              <SoftCard key={c.id} className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-extrabold text-ink">{c.name}</span>
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
                    className="flex w-full items-center justify-center gap-1.5 py-3 text-sm font-bold text-brand-light hover:bg-surface-alt"
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
        initial={categoryDialog?.category ? { name: categoryDialog.category.name, displayOrder: categoryDialog.category.displayOrder } : { displayOrder: categories.length + 1 }}
      />
    </div>
  );
}
