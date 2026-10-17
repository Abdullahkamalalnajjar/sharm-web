import { Bike, IdCard, Store, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { authApi } from '@/api';
import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, InlineError, Segmented, SoftCard, TextField } from '@/components/ui';
import { VEHICLE_TYPES } from '@/lib/meta';
import { homeFor, sessionFromToken } from '@/lib/session';
import { useAuth } from '@/store/auth';
import type { VehicleType } from '@/types';

type Role = 'Member' | 'StoreOwner' | 'Driver';

export function SignupPage() {
  const signUp = useAuth((s) => s.signUp);
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('Member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('شرم الشيخ');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('Motorcycle');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCustomer = role === 'Member';
  const isDriver = role === 'Driver';

  useEffect(() => {
    if (!idImage) return setIdPreview(null);
    const url = URL.createObjectURL(idImage);
    setIdPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [idImage]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isDriver && fullName.trim().split(/\s+/).length < 3) return setError('اكتب اسمك ثلاثي');
    if (!email.includes('@')) return setError('اكتب إيميل صحيح');
    if (password.length < 6) return setError('الباسورد 6 حروف على الأقل');
    if ((isCustomer || isDriver) && !phone.trim()) return setError('رقم الموبايل مطلوب');
    if (isCustomer && !city.trim()) return setError('المدينة مطلوبة');
    if (isDriver && !idImage) return setError('صوّر البطاقة الشخصية');
    setError(null);
    setLoading(true);
    try {
      if (isDriver) {
        // Signed in right away; the account waits for the admin's approval before getting orders.
        const tokens = await authApi.signUpDriver({ email, password, fullName, phoneNumber: phone, vehicleType: vehicle, nationalIdImage: idImage! });
        const session = sessionFromToken(tokens.accessToken);
        useAuth.setState({ session });
        navigate(homeFor(session.role), { replace: true });
        return;
      }
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
            { value: 'Driver', label: 'مندوب', icon: <Bike className="size-4" /> },
          ]}
        />
        <SoftCard className="p-5 flex flex-col gap-3 mt-2">
          {isDriver && (
            <TextField name="fullName" label="الاسم الثلاثي" value={fullName} onChange={(e) => setFullName(e.target.value)} className="[&_input]:bg-bg" />
          )}
          <TextField name="email" type="email" label="الإيميل" ltr autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="[&_input]:bg-bg" />
          <TextField name="password" type="password" label="الباسورد" ltr autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="[&_input]:bg-bg" />
          <TextField
            name="phone"
            type="tel"
            label={isCustomer || isDriver ? 'رقم الموبايل' : 'رقم الموبايل (اختياري)'}
            ltr
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="[&_input]:bg-bg"
          />
          {isCustomer && <TextField name="city" label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} className="[&_input]:bg-bg" />}
          {isDriver && (
            <>
              <p className="mt-1 font-extrabold text-ink">بتوصّل بإيه؟</p>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map((v) => (
                  <Chip key={v.value} selected={vehicle === v.value} onClick={() => setVehicle(v.value)} icon={<v.Icon className="size-4" />}>
                    {v.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-1 font-extrabold text-ink">صورة البطاقة الشخصية</p>
              <label className="grid aspect-[1.6] cursor-pointer place-items-center overflow-hidden rounded-card border border-dashed border-line bg-bg text-ink-2 hover:bg-surface-alt">
                {idPreview ? (
                  <img src={idPreview} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-sm font-semibold">
                    <IdCard className="size-8 text-ink-3" />
                    دوس عشان تضيف صورة البطاقة
                    <span className="text-xs text-ink-3">JPG أو PNG • لحد 5 ميجا</span>
                  </span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setIdImage(e.target.files?.[0] ?? null)} />
              </label>
              <p className="text-xs text-ink-3">الإدارة هتراجع البطاقة وتفعّل حسابك، وبعدها تقدر تستقبل أوردرات.</p>
            </>
          )}
          {error && <InlineError message={error} />}
          <Button type="submit" block loading={loading} className="mt-2">
            إنشاء الحساب
          </Button>
        </SoftCard>
      </form>
    </div>
  );
}
