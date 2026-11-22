import { UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { profileApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys } from '@/api/queries';
import { Button, InlineError, SoftCard, TextField } from '@/components/ui';
import { isValidEgyptPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useAuth } from '@/store/auth';

/** Shown in place of the customer pages until the account has a phone number. */
export function CompleteProfilePage({ name }: { name: string | null }) {
  const qc = useQueryClient();
  const logout = useAuth((s) => s.logout);
  const [userName, setUserName] = useState(name ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userName.trim()) return setError(t('الاسم مطلوب'));
    if (!phone.trim()) return setError(t('رقم الموبايل مطلوب'));
    if (!isValidEgyptPhone(phone)) return setError(t('اكتب رقم موبايل صحيح'));
    setError(null);
    setLoading(true);
    try {
      await profileApi.update({ userName: userName.trim(), phoneNumber: phone.replace(/\s/g, '') });
      await qc.invalidateQueries({ queryKey: keys.myProfile });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <SoftCard className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-white">
            <UserRound className="size-9" />
          </span>
          <h1 className="text-center text-2xl font-black text-ink">{t('كمّل بياناتك')}</h1>
          <p className="text-center text-sm text-ink-2">{t('محتاجين رقم موبايلك عشان المندوب والمحل يتواصلوا معاك في الطلب.')}</p>
          <TextField name="name" label={t('الاسم')} value={userName} onChange={(e) => setUserName(e.target.value)} className="[&_input]:bg-bg" />
          <TextField name="phone" type="tel" label={t('رقم الموبايل')} ltr placeholder="01012345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="[&_input]:bg-bg" />
          {error && <InlineError message={error} />}
          <Button type="submit" size="lg" block loading={loading}>
            {t('حفظ ومتابعة')}
          </Button>
          <Button type="button" variant="ghost" block onClick={logout}>
            {t('تسجيل الخروج')}
          </Button>
        </form>
      </SoftCard>
    </div>
  );
}
