import { MapPin } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { addressesApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys } from '@/api/queries';
import { Button, Chip, InlineError, Sheet, Switch, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';
import { ADDRESS_LABELS, SHARM_AREAS } from '@/lib/meta';
import { MapPicker } from './MapPicker';
import { showMessage } from '@/store/ui';
import type { Address, AddressInput } from '@/types';

export function AddressFormSheet({
  open,
  onClose,
  address,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Editing this address; omitted for a new one. */
  address?: Address | null;
  onSaved?: (saved: Address) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={address ? t('تعديل العنوان') : t('عنوان جديد')} wide>
      {open && <AddressForm key={address?.id ?? 'new'} address={address ?? null} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function matchArea(lat: number, lng: number): string | null {
  return SHARM_AREAS.find((a) => Math.abs(a.latitude - lat) < 0.01 && Math.abs(a.longitude - lng) < 0.01)?.name ?? null;
}

function AddressForm({ address, onClose, onSaved }: { address: Address | null; onClose: () => void; onSaved?: (a: Address) => void }) {
  const qc = useQueryClient();
  const isEdit = address !== null;
  const [label, setLabel] = useState(address?.label ?? ADDRESS_LABELS[0]);
  const [line, setLine] = useState(address?.addressLine ?? '');
  const [building, setBuilding] = useState(address?.building ?? '');
  const [floor, setFloor] = useState(address?.floor ?? '');
  const [apartment, setApartment] = useState(address?.apartment ?? '');
  const [landmark, setLandmark] = useState(address?.landmark ?? '');
  const [phone, setPhone] = useState(address?.contactPhone ?? '');
  const [lat, setLat] = useState(address?.latitude ?? SHARM_AREAS[0].latitude);
  const [lng, setLng] = useState(address?.longitude ?? SHARM_AREAS[0].longitude);
  const [areaName, setAreaName] = useState<string | null>(address ? matchArea(address.latitude, address.longitude) : SHARM_AREAS[0].name);
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optional = (v: string) => (v.trim() ? v.trim() : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return setError(t('اسم العنوان مطلوب'));
    if (!line.trim()) return setError(t('الشارع / العنوان مطلوب'));
    setError(null);
    setSaving(true);
    const input: AddressInput = {
      label: label.trim(),
      addressLine: line.trim(),
      latitude: lat,
      longitude: lng,
      building: optional(building),
      floor: optional(floor),
      apartment: optional(apartment),
      landmark: optional(landmark),
      contactPhone: optional(phone),
      makeDefault,
    };
    try {
      const saved = isEdit ? await addressesApi.update(address.id, input) : await addressesApi.create(input);
      await qc.invalidateQueries({ queryKey: keys.addresses });
      showMessage(isEdit ? t('العنوان اتحفظ') : t('العنوان اتضاف'));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm font-extrabold text-ink">{t('اسم العنوان')}</p>
      <div className="flex flex-wrap gap-2">
        {ADDRESS_LABELS.map((l) => (
          <Chip key={l} selected={label === l} onClick={() => setLabel(l)}>
            {t(l)}
          </Chip>
        ))}
      </div>
      <TextField name="label" placeholder={t('أو اكتب اسم')} value={label} onChange={(e) => setLabel(e.target.value)} />

      <p className="mt-2 text-sm font-extrabold text-ink">{t('المنطقة')}</p>
      <div className="flex flex-wrap gap-2">
        {SHARM_AREAS.map((a) => (
          <Chip
            key={a.name}
            selected={areaName === a.name}
            icon={<MapPin className="size-4" style={{ color: areaName === a.name ? '#fff' : 'var(--color-ink-2)' }} />}
            onClick={() => {
              setAreaName(a.name);
              setLat(a.latitude);
              setLng(a.longitude);
            }}
          >
            {t(a.name)}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-ink-3">{t('دوس على الخريطة أو اسحب الدبوس عشان تحدد مكان التوصيل بالظبط')}</p>
      <MapPicker
        lat={lat}
        lng={lng}
        onChange={(la, ln) => {
          setLat(la);
          setLng(ln);
          setAreaName(matchArea(la, ln));
        }}
      />
      <p className="text-xs text-ink-3" dir="ltr">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>

      <TextField name="line" label={t('الشارع / العنوان')} value={line} onChange={(e) => setLine(e.target.value)} className="mt-2" />
      <div className="grid grid-cols-3 gap-2">
        <TextField name="building" label={t('عمارة')} value={building} onChange={(e) => setBuilding(e.target.value)} />
        <TextField name="floor" label={t('الدور')} value={floor} onChange={(e) => setFloor(e.target.value)} />
        <TextField name="apartment" label={t('شقة')} value={apartment} onChange={(e) => setApartment(e.target.value)} />
      </div>
      <TextField name="landmark" label={t('علامة مميزة (اختياري)')} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
      <TextField name="phone" type="tel" ltr label={t('رقم للتواصل (اختياري)')} value={phone} onChange={(e) => setPhone(e.target.value)} />

      {!isEdit && (
        <div className="flex items-center justify-between py-1">
          <span className="font-bold text-ink">{t('خليه العنوان الأساسي')}</span>
          <Switch checked={makeDefault} onChange={setMakeDefault} label={t('خليه العنوان الأساسي')} />
        </div>
      )}

      {error && <InlineError message={error} />}
      <Button type="submit" block loading={saving} className="mt-2">
        {isEdit ? t('حفظ') : t('إضافة العنوان')}
      </Button>
    </form>
  );
}
