import { MapPin, Store } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { storesApi } from '@/api';
import { errorMessage } from '@/api/client';
import { useStore, useStoreCategories } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, InlineError, Loading, TextArea, TextField } from '@/components/ui';
import { SHARM_AREAS, categoryLook } from '@/lib/meta';
import { showMessage } from '@/store/ui';
import type { Store as StoreModel, StoreInput } from '@/types';

import { ImagePickerField, noImageEdit, type ImageEdit } from './ImagePicker';
import { MapPicker } from '../addresses/MapPicker';
/** Create / edit a store. The admin can register a store for an owner (by email); it is approved right away. */
export function StoreFormPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const existing = useStore(id ?? 0);
  if (id !== null && existing.isLoading) return <Loading />;
  if (id !== null && !existing.data) return <Loading />;
  return <StoreForm key={id ?? 'new'} store={id === null ? null : existing.data!} isAdmin={isAdmin} />;
}

function StoreForm({ store, isAdmin }: { store: StoreModel | null; isAdmin: boolean }) {
  const isEdit = store !== null;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const categories = useStoreCategories();
  const [categoryId, setCategoryId] = useState<number | null>(store?.categoryId ?? null);
  const [name, setName] = useState(store?.name ?? '');
  const [description, setDescription] = useState(store?.description ?? '');
  const [phone, setPhone] = useState(store?.phone ?? '');
  const [address, setAddress] = useState(store?.address ?? '');
  const [minOrder, setMinOrder] = useState(store ? String(store.minOrderAmount) : '0');
  const [lat, setLat] = useState(String(store?.latitude ?? SHARM_AREAS[0].latitude));
  const [lng, setLng] = useState(String(store?.longitude ?? SHARM_AREAS[0].longitude));
  const [ownerEmail, setOwnerEmail] = useState('');
  const [logo, setLogo] = useState<ImageEdit>(noImageEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [name, phone, address]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minOrderValue = Number(minOrder);
    const latValue = Number(lat);
    const lngValue = Number(lng);
    if (categoryId === null) return setError('اختار القسم');
    if (!name.trim()) return setError('اسم المحل مطلوب');
    if (!phone.trim()) return setError('رقم التليفون مطلوب');
    if (!address.trim()) return setError('العنوان مطلوب');
    if (Number.isNaN(minOrderValue) || minOrderValue < 0) return setError('أقل قيمة للطلب لازم تكون 0 أو أكتر');
    if (Number.isNaN(latValue) || latValue < -90 || latValue > 90) return setError('Latitude غير صحيح');
    if (Number.isNaN(lngValue) || lngValue < -180 || lngValue > 180) return setError('Longitude غير صحيح');
    if (isAdmin && !isEdit && ownerEmail.trim() && !ownerEmail.includes('@')) return setError('إيميل صاحب المحل غير صحيح');

    const input: StoreInput = {
      name: name.trim(),
      description: description.trim() || null,
      categoryId,
      phone: phone.trim(),
      address: address.trim(),
      latitude: latValue,
      longitude: lngValue,
      minOrderAmount: minOrderValue,
      ...(isAdmin && !isEdit && ownerEmail.trim() ? { ownerEmail: ownerEmail.trim() } : {}),
    };

    setSaving(true);
    try {
      const saved = isEdit ? await storesApi.update(store.id, input) : await storesApi.create(input);
      if (logo.kind === 'picked') await storesApi.uploadLogo(saved.id, logo.file);
      else if (logo.kind === 'removed' && store?.logoUrl) await storesApi.removeLogo(saved.id);
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['admin'] });
      showMessage(isEdit ? 'اتحفظت التعديلات' : isAdmin ? 'المحل اتسجل واتفعّل' : 'المحل اتسجل وهو مستني موافقة الأدمن');
      navigate(-1);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader title={isEdit ? 'تعديل المحل' : 'محل جديد'} />
      <form onSubmit={submit} className="px-4 flex flex-col gap-3">
        <ImagePickerField label="لوجو المحل" currentUrl={store?.logoUrl} edit={logo} onChange={setLogo} placeholderIcon={Store} aspect="aspect-[2.2]" />

        <p className="mt-1 text-sm font-extrabold text-ink">القسم</p>
        {categories.isLoading ? (
          <Loading className="py-2" />
        ) : categories.isError ? (
          <Button variant="outline" size="md" onClick={() => categories.refetch()}>
            مقدرناش نجيب الأقسام، حاول تاني
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[
              ...(categories.data ?? []).map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
              // The store's current category stays selectable even if the admin hid it.
              ...(store && !(categories.data ?? []).some((c) => c.id === store.categoryId)
                ? [{ id: store.categoryId, name: store.categoryName, icon: store.categoryIcon }]
                : []),
            ].map((c) => {
              const look = categoryLook(c.icon);
              return (
                <Chip
                  key={c.id}
                  selected={categoryId === c.id}
                  onClick={() => setCategoryId(c.id)}
                  icon={<look.Icon className="size-4" style={{ color: categoryId === c.id ? '#fff' : look.color }} />}
                >
                  {c.name}
                </Chip>
              );
            })}
          </div>
        )}

        {isAdmin && !isEdit && (
          <TextField
            name="ownerEmail"
            type="email"
            ltr
            label="إيميل صاحب المحل (اختياري)"
            hint="لو سيبته فاضي المحل هيبقى باسمك. المحلات اللي بتضيفها بتتفعّل على طول."
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
        )}

        <TextField name="name" label="اسم المحل" value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea name="description" label="وصف (اختياري)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField name="phone" type="tel" ltr label="رقم التليفون" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField name="address" label="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />
        <TextField name="minOrder" type="number" inputMode="decimal" min={0} label="أقل قيمة للطلب (ج.م)" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />

        <p className="mt-2 text-sm font-extrabold text-ink">موقع المحل</p>
        <div className="flex flex-wrap gap-2">
          {SHARM_AREAS.map((a) => (
            <Chip
              key={a.name}
              icon={<MapPin className="size-4 text-ink-2" />}
              onClick={() => {
                setLat(String(a.latitude));
                setLng(String(a.longitude));
              }}
            >
              {a.name}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-ink-3">دوس على الخريطة أو اسحب الدبوس عشان تحدد موقع المحل بالظبط</p>
        <MapPicker
          lat={Number(lat) || SHARM_AREAS[0].latitude}
          lng={Number(lng) || SHARM_AREAS[0].longitude}
          onChange={(la, ln) => {
            setLat(String(la));
            setLng(String(ln));
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField name="lat" ltr inputMode="decimal" label="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <TextField name="lng" ltr inputMode="decimal" label="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>

        {error && <InlineError message={error} />}
        <Button type="submit" block loading={saving} className="mt-3">
          {isEdit ? 'حفظ' : 'تسجيل المحل'}
        </Button>
      </form>
    </div>
  );
}
