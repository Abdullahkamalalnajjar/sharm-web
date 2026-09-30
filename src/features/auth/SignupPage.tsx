import { Store, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, InlineError, Segmented, SoftCard, TextField } from '@/components/ui';
import { homeFor } from '@/lib/session';
import { useAuth } from '@/store/auth';

type Role = 'Member' | 'StoreOwner';

export function SignupPage() {
  const signUp = useAuth((s) => s.signUp);
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('Member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('شرم الشيخ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCustomer = role === 'Member';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return setError('اكتب إيميل صحيح');
    if (password.length < 6) return setError('الباسورد 6 حروف على الأقل');
    if (isCustomer && !phone.trim()) return setError('رقم الموبايل مطلوب');
    if (isCustomer && !city.trim()) return setError('المدينة مطلوبة');
    setError(null);
    setLoading(true);
    try {
      const session = await signUp({
        email,
        password,
        role,
        city: isCustomer ? city.trim() : null,
        phoneNumber: phone.trim() || null,
      });
      navigate(homeFor(session.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="حساب جديد" />
      <form onSubmit={submit} className="px-6 pb-10 flex flex-col gap-3">
        <Segmented<Role>
          value={role}
          onChange={setRole}
          options={[
            { value: 'Member', label: 'زبون', icon: <UserRound className="size-4" /> },
            { value: 'StoreOwner', label: 'صاحب محل', icon: <Store className="size-4" /> },
          ]}
        />
        <SoftCard className="p-5 flex flex-col gap-3 mt-2">
          <TextField name="email" type="email" label="الإيميل" ltr autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="[&_input]:bg-bg" />
          <TextField name="password" type="password" label="الباسورد" ltr autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="[&_input]:bg-bg" />
          <TextField name="phone" type="tel" label={isCustomer ? 'رقم الموبايل' : 'رقم الموبايل (اختياري)'} ltr value={phone} onChange={(e) => setPhone(e.target.value)} className="[&_input]:bg-bg" />
          {isCustomer && <TextField name="city" label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} className="[&_input]:bg-bg" />}
          {error && <InlineError message={error} />}
          <Button type="submit" block loading={loading} className="mt-2">
            إنشاء الحساب
          </Button>
        </SoftCard>
      </form>
    </div>
  );
}
