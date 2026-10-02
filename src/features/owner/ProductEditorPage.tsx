import { MoreVertical, Plus, Sandwich, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import { catalogApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useManagedMenu } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, InlineError, Loading, SectionHeader, Sheet, SoftCard, Switch, TextArea, TextField } from '@/components/ui';
import { MenuItem } from '@/features/addresses/AddressesPage';
import { groupRule } from '@/features/customer/ProductSheet';
import { formatPrice } from '@/lib/format';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { MenuCategory, Product, ProductInput, ProductOption, ProductOptionGroup } from '@/types';

import { OptionDialog, OptionGroupDialog, type OptionGroupValues, type OptionValues } from './Dialogs';
import { ImagePickerField, noImageEdit, type ImageEdit } from './ImagePicker';

/** Create a product, or edit it together with its option groups and options. */
export function ProductEditorPage() {
  const params = useParams();
  const storeId = Number(params.id);
  const productId = params.productId ? Number(params.productId) : null;
  const menu = useManagedMenu(storeId);
  if (menu.isLoading || !menu.data) return <Loading />;
  const categories = menu.data.categories;
  const product = productId === null ? null : (categories.flatMap((c) => c.products).find((p) => p.id === productId) ?? null);
  return <Editor key={productId ?? 'new'} storeId={storeId} categories={categories} initial={product} />;
}

function Editor({ storeId, categories, initial }: { storeId: number; categories: MenuCategory[]; initial: Product | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const basePath = useLocation().pathname.startsWith('/admin') ? '/admin' : '/owner';

  const [product, setProduct] = useState<Product | null>(initial);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (Number(search.get('category')) || categories[0]?.id));
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [order, setOrder] = useState(String(initial?.displayOrder ?? 0));
  const [image, setImage] = useState<ImageEdit>(noImageEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groupDialog, setGroupDialog] = useState<{ group: ProductOptionGroup | null } | null>(null);
  const [optionDialog, setOptionDialog] = useState<{ group: ProductOptionGroup; option: ProductOption | null } | null>(null);
  const [groupMenu, setGroupMenu] = useState<ProductOptionGroup | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.managedMenu(storeId) });

  async function save(e: FormEvent) {
    e.preventDefault();
    const priceValue = Number(price);
    if (!name.trim()) return setError('اسم المنتج مطلوب');
    if (Number.isNaN(priceValue) || priceValue <= 0) return setError('السعر لازم يكون أكبر من صفر');
    if (!Number.isInteger(Number(order))) return setError('الترتيب لازم يكون رقم');
    const input: ProductInput = {
      categoryId,
      name: name.trim(),
      price: priceValue,
      description: description.trim() || null,
      displayOrder: Number(order),
    };
    setSaving(true);
    setError(null);
    try {
      let saved = product ? await catalogApi.updateProduct(storeId, product.id, input) : await catalogApi.createProduct(storeId, input);
      if (image.kind === 'picked') saved = await catalogApi.uploadProductImage(storeId, saved.id, image.file);
      else if (image.kind === 'removed' && product?.imageUrl) saved = await catalogApi.removeProductImage(storeId, saved.id);
      setImage(noImageEdit);
      setProduct(saved);
      invalidate();
      showMessage(product ? 'اتحفظ' : 'المنتج اتضاف. تقدر تضيف له أحجام وإضافات تحت.');
      if (!product) navigate(`${basePath}/stores/${storeId}/products/${saved.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** Runs an option-group / option call that returns the updated product. */
  async function mutate(call: (productId: number) => Promise<Product>) {
    if (!product) return;
    await runAction(async () => {
      const updated = await call(product.id);
      setProduct(updated);
      invalidate();
    });
  }

  async function remove() {
    if (!product) return;
    if (!(await confirm(`تمسح "${product.name}"؟`, 'مسح'))) return;
    if (await runAction(() => catalogApi.deleteProduct(storeId, product.id), 'المنتج اتمسح')) {
      invalidate();
      navigate(-1);
    }
  }

  async function saveGroup(v: OptionGroupValues) {
    const g = groupDialog?.group;
    await mutate((id) =>
      g
        ? catalogApi.updateOptionGroup(storeId, id, g.id, v.name, v.min, v.max, g.displayOrder)
        : catalogApi.addOptionGroup(storeId, id, v.name, v.min, v.max, (product?.optionGroups.length ?? 0) + 1),
    );
  }

  async function saveOption(v: OptionValues) {
    if (!optionDialog) return;
    const { group, option } = optionDialog;
    await mutate((id) =>
      option
        ? catalogApi.updateOption(storeId, id, group.id, option.id, v.name, v.extraPrice)
        : catalogApi.addOption(storeId, id, group.id, v.name, v.extraPrice),
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader
        title={product ? product.name : 'منتج جديد'}
        actions={
          product && (
            <button type="button" title="مسح" onClick={remove} className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger/10">
              <Trash2 className="size-5" />
            </button>
          )
        }
      />
      <div className="px-4">
        <form onSubmit={save} className="flex flex-col gap-3">
          <ImagePickerField label="صورة المنتج" currentUrl={product?.imageUrl} edit={image} onChange={setImage} placeholderIcon={Sandwich} />
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-ink-2">القسم</span>
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="field appearance-none">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <TextField name="name" label="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} />
          <TextArea name="description" label="وصف (اختياري)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <TextField name="price" type="number" inputMode="decimal" ltr label="السعر (ج.م)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <TextField name="order" type="number" ltr label="الترتيب" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          {error && <InlineError message={error} />}
          <Button type="submit" block loading={saving} className="mt-1">
            {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </form>

        {product && (
          <>
            <SectionHeader title="الأحجام والإضافات" action="+ مجموعة" onAction={() => setGroupDialog({ group: null })} className="mt-4" />
            {product.optionGroups.length === 0 && (
              <p className="py-3 text-ink-2">مفيش اختيارات. ضيف مجموعة زي "الحجم" أو "الإضافات" لو المنتج ليه اختيارات.</p>
            )}
            <div className="flex flex-col gap-2.5">
              {product.optionGroups.map((g) => (
                <SoftCard key={g.id} className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{g.name}</p>
                      <p className="text-xs text-ink-2">
                        {g.isRequired ? 'مطلوب' : 'اختياري'} • {groupRule(g)}
                      </p>
                    </div>
                    <button type="button" aria-label="خيارات" onClick={() => setGroupMenu(g)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                      <MoreVertical className="size-5" />
                    </button>
                  </div>
                  {g.options.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                      <button type="button" onClick={() => setOptionDialog({ group: g, option: o })} className="min-w-0 flex-1 text-start">
                        <p className="text-ink">{o.name}</p>
                        <p className="text-xs text-ink-2">{o.extraPrice > 0 ? `+ ${formatPrice(o.extraPrice)}` : 'من غير زيادة'}</p>
                      </button>
                      <Switch checked={o.isAvailable} label="متاح" onChange={(v) => mutate((id) => catalogApi.setOptionAvailability(storeId, id, g.id, o.id, v))} />
                      <button type="button" aria-label="مسح" onClick={() => mutate((id) => catalogApi.removeOption(storeId, id, g.id, o.id))} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOptionDialog({ group: g, option: null })}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-line py-3 text-sm font-bold text-brand-ink hover:bg-surface-alt"
                  >
                    <Plus className="size-4" />
                    إضافة اختيار
                  </button>
                </SoftCard>
              ))}
            </div>
          </>
        )}
      </div>

      <Sheet open={groupMenu !== null} onClose={() => setGroupMenu(null)} title={groupMenu?.name}>
        {groupMenu && (
          <div className="flex flex-col">
            <MenuItem
              onClick={() => {
                setGroupDialog({ group: groupMenu });
                setGroupMenu(null);
              }}
            >
              تعديل
            </MenuItem>
            <MenuItem
              danger
              onClick={async () => {
                const g = groupMenu;
                setGroupMenu(null);
                if (!(await confirm(`تمسح مجموعة "${g.name}" وكل اختياراتها؟`, 'مسح'))) return;
                await mutate((id) => catalogApi.removeOptionGroup(storeId, id, g.id));
              }}
            >
              مسح
            </MenuItem>
          </div>
        )}
      </Sheet>

      <OptionGroupDialog
        open={groupDialog !== null}
        onClose={() => setGroupDialog(null)}
        onSubmit={saveGroup}
        initial={groupDialog?.group ? { name: groupDialog.group.name, min: groupDialog.group.minSelections, max: groupDialog.group.maxSelections } : undefined}
      />
      <OptionDialog
        open={optionDialog !== null}
        onClose={() => setOptionDialog(null)}
        onSubmit={saveOption}
        initial={optionDialog?.option ? { name: optionDialog.option.name, extraPrice: optionDialog.option.extraPrice } : undefined}
      />
    </div>
  );
}
