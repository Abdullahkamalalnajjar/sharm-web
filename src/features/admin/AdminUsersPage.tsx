import { BadgeCheck, Bike, Calendar, Copy, IdCard, KeyRound, Mail, MapPin, Phone, ReceiptText, Search, ShieldCheck, Store, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { showMessage } from '@/store/ui';

/** An account as the admin lists it (GET /api/admin/users). */
interface AdminUser {
  userId: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  city: string | null;
  role: string;
  createdUtc: string | null;
  stores: { id: number; name: string }[];
  driverId: number | null;
  driverActive: boolean | null;
  ordersCount: number;
}

const ROLES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'Member', label: 'زبون', icon: UserRound, color: 'var(--color-series-1)' },
  { value: 'StoreOwner', label: 'صاحب محل', icon: Store, color: 'var(--color-accent)' },
  { value: 'StoreEmployee', label: 'كاشير', icon: IdCard, color: 'var(--color-series-3)' },
  { value: 'Driver', label: 'مندوب', icon: Bike, color: 'var(--color-success)' },
  { value: 'Staff', label: 'موظف إدارة', icon: BadgeCheck, color: 'var(--color-warning)' },
  { value: 'Manager', label: 'أدمن', icon: ShieldCheck, color: 'var(--color-warning)' },
];
const roleOf = (r: string) => ROLES.find((x) => x.value === r) ?? ROLES[0];

/** Accounts made with a phone number carry a made-up email. */
const hasRealEmail = (u: AdminUser) => !!u.email && !u.email.endsWith('@phone.sharm.app');
const titleOf = (u: AdminUser) => u.fullName?.trim() || (hasRealEmail(u) ? u.email : u.phoneNumber ?? u.email);

const usersKey = ['admin', 'users'] as const;

/** Every account in the app (customers, stores, cashiers, drivers, staff), like the admin app's "Users". */
export function AdminUsersPage() {
  const users = useQuery({ queryKey: usersKey, queryFn: () => api.get<AdminUser[]>('/api/admin/users') });
  const [role, setRole] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<AdminUser | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) =>
        (!role || u.role === role) &&
        (!s || [u.fullName, u.email, u.phoneNumber, u.city, ...u.stores.map((x) => x.name)].some((f) => f?.toLowerCase().includes(s))),
    );
  }, [users.data, role, q]);

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <PageHeader title={t('المستخدمين')} />
      <div className="flex flex-col gap-3 px-4">
        <TextField start={<Search className="size-4" />} placeholder={t('دوّر بالاسم أو الموبايل أو الإيميل أو المحل')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip selected={role === null} onClick={() => setRole(null)}>
            {t('الكل')} {users.data ? `(${users.data.length})` : ''}
          </Chip>
          {ROLES.map((r) => (
            <Chip key={r.value} selected={role === r.value} icon={<r.icon className="size-4" />} onClick={() => setRole(role === r.value ? null : r.value)}>
              {t(r.label)}
            </Chip>
          ))}
        </div>
        {users.isLoading ? (
          <Loading />
        ) : users.isError ? (
          <ErrorView message={(users.error as Error).message} onRetry={() => users.refetch()} />
        ) : list.length === 0 ? (
          <EmptyView icon={Users} message={t('مفيش نتايج')} />
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((u) => {
              const r = roleOf(u.role);
              return (
                <button key={u.userId} type="button" onClick={() => setOpen(u)} className="text-start">
                  <SoftCard className="flex items-center gap-3 p-3 hover:bg-surface-alt">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color }}>
                      <r.icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{titleOf(u)}</span>
                      <span className="block truncate text-xs text-ink-2">
                        {[t(r.label), u.phoneNumber, u.stores.map((s) => s.name).join('، ')].filter(Boolean).join(' • ')}
                      </span>
                    </span>
                  </SoftCard>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {open && <UserSheet user={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function UserSheet({ user: u, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const r = roleOf(u.role);
  const [mode, setMode] = useState<'view' | 'name' | 'password'>('view');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'name' && !value.trim()) return setError(t('الاسم مطلوب'));
    if (mode === 'password' && value.length < 6) return setError(t('٦ حروف على الأقل'));
    setError(null);
    setBusy(true);
    const ok =
      mode === 'name'
        ? await runAction(() => api.put(`/api/admin/users/${u.userId}/name`, { fullName: value.trim() }), t('الاسم اتغيّر'))
        : await runAction(() => api.put(`/api/admin/users/${u.userId}/password`, { newPassword: value }), t('الباسورد اتغيّر'));
    setBusy(false);
    if (ok) {
      qc.invalidateQueries({ queryKey: usersKey });
      onClose();
    }
  }

  const Row = ({ icon: Icon, label, value: v, action }: { icon: LucideIcon; label: string; value: string; action?: React.ReactNode }) => (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <Icon className="size-5 shrink-0 text-ink-3" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-ink-3">{label}</span>
        <span className="block truncate font-bold text-ink">{v}</span>
      </span>
      {action}
    </div>
  );
  const created = u.createdUtc ? new Date(/Z$/.test(u.createdUtc) ? u.createdUtc : `${u.createdUtc}Z`) : null;

  return (
    <Sheet open onClose={onClose} title={titleOf(u)}>
      {mode === 'view' ? (
        <div className="flex flex-col">
          <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color }}>
            <r.icon className="size-3.5" />
            {t(r.label)}
          </span>
          {hasRealEmail(u) && (
            <Row
              icon={Mail}
              label={t('الإيميل (للدخول)')}
              value={u.email}
              action={
                <button type="button" aria-label={t('نسخ')} onClick={() => navigator.clipboard.writeText(u.email).then(() => showMessage(t('اتنسخ')))} className="p-2 text-ink-3 hover:text-ink">
                  <Copy className="size-4" />
                </button>
              }
            />
          )}
          {u.phoneNumber && <Row icon={Phone} label={t('رقم الموبايل')} value={u.phoneNumber} action={<a href={`tel:${u.phoneNumber}`} className="p-2 text-brand-ink"><Phone className="size-4" /></a>} />}
          {u.city && <Row icon={MapPin} label={t('المدينة')} value={u.city} />}
          {u.stores.length > 0 && <Row icon={Store} label={u.role === 'StoreEmployee' ? t('كاشير في') : t('المحلات')} value={u.stores.map((s) => s.name).join('، ')} />}
          {u.driverActive !== null && <Row icon={Bike} label={t('حالة المندوب')} value={u.driverActive ? t('مفعّل') : t('متوقف')} />}
          {u.role === 'Member' && <Row icon={ReceiptText} label={t('عدد الأوردرات')} value={String(u.ordersCount)} />}
          {created && <Row icon={Calendar} label={t('تاريخ التسجيل')} value={created.toLocaleDateString()} />}
          {u.role !== 'Manager' && (
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" block icon={<IdCard className="size-5" />} onClick={() => { setValue(u.fullName ?? ''); setMode('name'); }}>
                {t('غيّر الاسم')}
              </Button>
              {hasRealEmail(u) && (
                <Button variant="outline" block icon={<KeyRound className="size-5" />} onClick={() => { setValue(''); setMode('password'); }}>
                  {t('غيّر الباسورد')}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'name' ? (
            <TextField autoFocus label={t('اسم الحساب')} value={value} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <TextField autoFocus label={t('باسورد جديد')} type="password" ltr value={value} onChange={(e) => setValue(e.target.value)} />
          )}
          {error && <InlineError message={error} />}
          <Button type="submit" block loading={busy}>
            {t('حفظ')}
          </Button>
          <Button type="button" variant="ghost" block onClick={() => setMode('view')}>
            {t('إلغاء')}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
