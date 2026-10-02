import { Bike, Eye, EyeOff, Flame, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { errorMessage } from '@/api/client';
import { Button, InlineError, SoftCard, TextField } from '@/components/ui';
import { homeFor } from '@/lib/session';
import { useAuth } from '@/store/auth';

const TEST_ACCOUNTS = [
  { label: 'زبون', email: 'customer@sharm.app', password: 'Test123!' },
  { label: 'صاحب محل', email: 'owner@sharm.app', password: 'Test123!' },
  { label: 'مندوب', email: 'driver@sharm.app', password: 'Test123!' },
  { label: 'أدمن', email: 'admin@example.com', password: 'Admin123!' },
];

export function Logo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="grid size-[92px] place-items-center rounded-[30px] bg-brand text-white shadow-brand">
          <Bike className="size-12" />
        </div>
        <span className="absolute -top-2 -end-2 grid size-[34px] place-items-center rounded-full bg-highlight text-black ring-[3px] ring-bg">
          <Flame className="size-4" />
        </span>
      </div>
      <h1 className="mt-4 text-[32px] font-black text-ink leading-tight">شرم</h1>
      <p className="text-ink-2 font-semibold">أكل، سوبر ماركت، وصيدليات لحد باب البيت</p>
    </div>
  );
}

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return setError('اكتب إيميل صحيح');
    if (password.length < 6) return setError('الباسورد 6 حروف على الأقل');
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password);
      // Owners and admins land on their own home; customers go back to where they were.
      navigate(session.role === 'customer' ? location.state?.from ?? '/' : homeFor(session.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10 md:py-16">
      <Logo />
      <form onSubmit={submit} className="mt-7">
        <SoftCard className="p-5 flex flex-col gap-3">
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            placeholder="الإيميل"
            ltr
            start={<Mail className="size-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="[&_input]:bg-bg"
          />
          <TextField
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="الباسورد"
            ltr
            start={<Lock className="size-5" />}
            end={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="إظهار الباسورد" className="hover:text-ink">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="[&_input]:bg-bg"
          />
          {error && <InlineError message={error} />}
          <Button type="submit" block loading={loading} className="mt-2">
            تسجيل الدخول
          </Button>
        </SoftCard>
      </form>

      <div className="mt-3 flex flex-col items-center gap-1">
        <Link to="/signup" className="text-sm font-bold text-brand-ink hover:underline py-2">
          معندكش حساب؟ سجّل دلوقتي
        </Link>
        <Link to="/" className="text-sm font-bold text-ink-2 hover:text-ink py-1">
          تصفح من غير حساب
        </Link>
      </div>

      <p className="mt-8 text-center text-sm font-semibold text-ink-3">حسابات التجربة</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {TEST_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => {
              setEmail(a.email);
              setPassword(a.password);
            }}
            className="h-9 rounded-full border border-line bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-alt"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
