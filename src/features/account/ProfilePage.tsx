import { KeyRound, Lock, Phone, Building2, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { profileApi } from '@/api';
import { keys, useMyProfile } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ErrorView, InlineError, Loading, Sheet, TextField } from '@/components/ui';
import { isValidEgyptPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';

/** Edit the name, phone number and city, and change the password (like the apps' "Edit account"). */
export function ProfilePage() {
  const profile = useMyProfile();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!profile.data || loaded) return;
    setName(profile.data.fullName ?? '');
    setPhone(profile.data.phoneNumber ?? '');
    setCity(profile.data.city ?? '');
    setLoaded(true);
  }, [profile.data, loaded]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t('الاسم مطلوب'));
    if (!phone.trim()) return setError(t('رقم الموبايل مطلوب'));
    if (!isValidEgyptPhone(phone)) return setError(t('اكتب رقم موبايل صحيح'));
    setError(null);
    setSaving(true);
    const ok = await runAction(
      () => profileApi.update({ userName: name.trim(), phoneNumber: phone.replace(/\s/g, ''), city: city.trim() || null }),
      t('تم تحديث البيانات بنجاح'),
    );
    setSaving(false);
    if (ok) qc.invalidateQueries({ queryKey: keys.myProfile });
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-md pb-10">
      <PageHeader title={t('تعديل الحساب')} />
      <div className="px-4">
        {profile.isLoading ? (
          <Loading />
        ) : profile.isError ? (
          <ErrorView message={(profile.error as Error).message} onRetry={() => profile.refetch()} />
        ) : (
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="grid size-[84px] place-items-center rounded-full bg-gradient-to-br from-brand-light to-brand-dark text-3xl font-black text-white shadow-brand">
                {initial || <UserRound className="size-10" />}
              </span>
              <span className="text-sm text-ink-3" dir="ltr">
                {profile.data?.email}
              </span>
            </div>
            <TextField label={t('الاسم')} start={<UserRound className="size-4" />} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label={t('رقم الهاتف')}
              type="tel"
              ltr
              placeholder="01012345678"
              start={<Phone className="size-4" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextField
              label={t('المدينة')}
              placeholder={t('شرم الشيخ')}
              start={<Building2 className="size-4" />}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            {error && <InlineError message={error} />}
            <Button type="submit" size="lg" block loading={saving} className="mt-2">
              {t('حفظ التعديلات')}
            </Button>
            <Button type="button" variant="outline" size="lg" block icon={<Lock className="size-5" />} onClick={() => setPasswordOpen(true)}>
              {t('تغيير كلمة المرور')}
            </Button>
          </form>
        )}
      </div>
      <PasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!current) return setError(t('مطلوب'));
    if (next.length < 6) return setError(t('الباسورد 6 حروف على الأقل'));
    setError(null);
    setBusy(true);
    const ok = await runAction(() => profileApi.changePassword(current, next), t('الباسورد اتغيّر'));
    setBusy(false);
    if (ok) {
      setCurrent('');
      setNext('');
      onClose();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('تغيير كلمة المرور')}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField label={t('الباسورد الحالي')} type="password" ltr start={<KeyRound className="size-4" />} value={current} onChange={(e) => setCurrent(e.target.value)} />
        <TextField label={t('الباسورد الجديد')} type="password" ltr start={<Lock className="size-4" />} value={next} onChange={(e) => setNext(e.target.value)} />
        {error && <InlineError message={error} />}
        <Button type="submit" block loading={busy}>
          {t('حفظ')}
        </Button>
      </form>
    </Sheet>
  );
}
