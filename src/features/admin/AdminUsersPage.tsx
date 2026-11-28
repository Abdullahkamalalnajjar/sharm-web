import clsx from 'clsx';
import {
  BadgeCheck,
  Bike,
  Calendar,
  ChevronRight,
  Copy,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Search,
  SearchX,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { Button, EmptyView, ErrorView, InlineError, Loading, Sheet, SoftCard, StatusChip, TextField } from '@/components/ui';
import { telHref } from '@/features/orders/OrderWidgets';
import { dateLocale, parseUtc } from '@/lib/format';
import { t, tIn } from '@/lib/i18n';
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
const createdOf = (u: AdminUser) => (u.createdUtc ? parseUtc(u.createdUtc) : null);
const shortDate = (d: Date) => new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

/** What the account does, beside its role: its stores, the driver's state, a customer's orders. */
function detailOf(u: AdminUser): string | null {
  if (u.stores.length > 0) return u.stores.map((s) => s.name).join('، ');
  if (u.driverActive !== null) return u.driverActive ? t('مفعّل') : t('متوقف');
  if (u.role === 'Member') return t('{n} أوردر', { n: u.ordersCount });
  return null;
}

const usersKey = ['admin', 'users'] as const;
/** Rows shown at first, then more on demand, so thousands of customers stay quick. */
const PAGE = 60;
const USER_COLUMNS = 'grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_150px_minmax(0,1.3fr)_130px_28px]';

/** Every account in the app (customers, stores, cashiers, drivers, staff), like the admin app's "Users". */
export function AdminUsersPage() {
  const users = useQuery({ queryKey: usersKey, queryFn: () => api.get<AdminUser[]>('/api/admin/users') });
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<AdminUser | null>(null);

  const all = users.data ?? [];
  const countOf = (r: string | null) => (r ? all.filter((u) => u.role === r).length : all.length);
  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      all.filter(
        (u) =>
          (!role || u.role === role) &&
          (!q || [u.fullName, u.email, u.phoneNumber, u.city, ...u.stores.map((x) => x.name)].some((f) => f?.toLowerCase().includes(q))),
      ),
    [all, role, q],
  );
  const shown = list.slice(0, limit);

  const pickRole = (r: string | null) => {
    setRole(r);
    setLimit(PAGE);
  };

  return (
    <div className="pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('المستخدمين')}</h1>
          {users.data && <p className="text-[13px] font-medium text-ink-3">{t('{n} حساب', { n: all.length })}</p>}
        </div>
      </div>

      <div className="px-4 pt-4">
        {users.isLoading ? (
          <Loading />
        ) : users.isError ? (
          <ErrorView message={(users.error as Error).message} onRetry={() => users.refetch()} />
        ) : all.length === 0 ? (
          <EmptyView icon={Users} message={t('مفيش نتايج')} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* The counts double as filters. */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 2xl:grid-cols-7">
              <RoleTile icon={Users} color="var(--color-brand)" label={t('كل الحسابات')} count={countOf(null)} selected={role === null} onClick={() => pickRole(null)} />
              {ROLES.map((r) => (
                <RoleTile
                  key={r.value}
                  icon={r.icon}
                  color={r.color}
                  label={t(r.label)}
                  count={countOf(r.value)}
                  selected={role === r.value}
                  onClick={() => pickRole(role === r.value ? null : r.value)}
                />
              ))}
            </div>

            <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand md:w-[420px]">
              <Search className="size-5 text-ink-2" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder={t('دوّر بالاسم أو الموبايل أو الإيميل أو المحل')}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
              />
              {query && (
                <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
                  <X className="size-5" />
                </button>
              )}
            </label>

            {list.length === 0 ? (
              <EmptyView icon={q ? SearchX : Users} message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : t('مفيش نتايج')} />
            ) : (
              <>
                {/* Wide screens: one row per account. */}
                <SoftCard className="hidden overflow-hidden lg:block">
                  <div className={clsx('grid gap-3 border-b border-line bg-surface-alt/60 px-4 py-2.5 text-xs font-bold text-ink-3', USER_COLUMNS)}>
                    <span>{t('المستخدم')}</span>
                    <span>{t('رقم الموبايل')}</span>
                    <span>{t('النوع')}</span>
                    <span>{t('التفاصيل')}</span>
                    <span>{t('تاريخ التسجيل')}</span>
                    <span />
                  </div>
                  {shown.map((u) => (
                    <UserRow key={u.userId} user={u} onOpen={() => setOpen(u)} />
                  ))}
                </SoftCard>
                {/* Phones and tablets: cards. */}
                <div className="grid gap-2.5 md:grid-cols-2 lg:hidden">
                  {shown.map((u) => (
                    <UserCard key={u.userId} user={u} onOpen={() => setOpen(u)} />
                  ))}
                </div>
                {list.length > shown.length && (
                  <div className="flex flex-col items-center gap-1.5">
                    <Button variant="outline" size="md" onClick={() => setLimit((n) => n + PAGE)}>
                      {t('اعرض أكتر')}
                    </Button>
                    <span className="text-xs text-ink-3">{t('{n} من {m}', { n: shown.length, m: list.length })}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {open && <UserSheet user={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RoleTile({ icon: Icon, color, label, count, selected, onClick }: { icon: LucideIcon; color: string; label: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'flex items-center gap-3 rounded-card border bg-surface p-3.5 text-start shadow-card transition-colors',
        selected ? 'border-brand ring-1 ring-brand' : 'border-transparent hover:bg-surface-alt',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] font-extrabold leading-tight text-ink tabular-nums">{count}</span>
        <span className="block truncate text-xs font-semibold text-ink-2">{label}</span>
      </span>
    </button>
  );
}

/** The account's initial in a circle of its role's color. */
function UserAvatar({ user, size = 40 }: { user: AdminUser; size?: number }) {
  const r = roleOf(user.role);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color }}
    >
      {titleOf(user).trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  const r = roleOf(role);
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color }}>
      <r.icon className="size-3.5" />
      {t(r.label)}
    </span>
  );
}

function UserRow({ user: u, onOpen }: { user: AdminUser; onOpen: () => void }) {
  const created = createdOf(u);
  const detail = detailOf(u);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx('grid w-full items-center gap-3 border-b border-line px-4 py-2.5 text-start text-sm last:border-b-0 hover:bg-surface-alt/50', USER_COLUMNS)}
    >
      <span className="flex min-w-0 items-center gap-3">
        <UserAvatar user={u} />
        <span className="min-w-0">
          <span className="block truncate font-extrabold text-ink">{titleOf(u)}</span>
          {hasRealEmail(u) && u.fullName?.trim() && (
            <span className="block truncate text-xs text-ink-3" dir="ltr" style={{ textAlign: 'start' }}>
              {u.email}
            </span>
          )}
        </span>
      </span>
      <span className="truncate text-ink-2 tabular-nums" dir="ltr" style={{ textAlign: 'start' }}>
        {u.phoneNumber ?? '—'}
      </span>
      <span>
        <RoleChip role={u.role} />
      </span>
      <span className="truncate text-ink-2">{detail ?? <span className="text-ink-3">—</span>}</span>
      <span className="truncate text-ink-2">{created ? shortDate(created) : '—'}</span>
      <ChevronRight className="size-4 text-ink-3 rtl:-scale-x-100" />
    </button>
  );
}

function UserCard({ user: u, onOpen }: { user: AdminUser; onOpen: () => void }) {
  const detail = detailOf(u);
  return (
    <button type="button" onClick={onOpen} className="text-start">
      <SoftCard className="flex items-center gap-3 p-3 hover:bg-surface-alt">
        <UserAvatar user={u} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">{titleOf(u)}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <RoleChip role={u.role} />
            {u.phoneNumber && (
              <span className="text-xs text-ink-2 tabular-nums" dir="ltr">
                {u.phoneNumber}
              </span>
            )}
          </span>
          {detail && <span className="mt-0.5 block truncate text-xs text-ink-3">{detail}</span>}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3 rtl:-scale-x-100" />
      </SoftCard>
    </button>
  );
}

function UserSheet({ user: u, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
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

  const created = createdOf(u);

  if (mode !== 'view') {
    return (
      <Sheet open onClose={onClose} title={mode === 'name' ? t('غيّر الاسم') : t('غيّر الباسورد')}>
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
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} wide>
      <div className="flex items-center gap-3.5">
        <UserAvatar user={u} size={60} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[20px] font-extrabold leading-tight text-ink">{titleOf(u)}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RoleChip role={u.role} />
            {u.driverActive !== null && <StatusChip label={u.driverActive ? t('مفعّل') : t('متوقف')} color={u.driverActive ? 'var(--color-success)' : 'var(--color-ink-3)'} />}
          </div>
        </div>
      </div>

      <SectionTitle>{t('بيانات الحساب')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hasRealEmail(u) && (
          <InfoTile
            icon={Mail}
            label={t('الإيميل (للدخول)')}
            value={u.email}
            ltr
            className="col-span-2"
            action={
              <button
                type="button"
                aria-label={t('نسخ')}
                title={t('نسخ')}
                onClick={() => navigator.clipboard.writeText(u.email).then(() => showMessage(t('اتنسخ')))}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink"
              >
                <Copy className="size-4" />
              </button>
            }
          />
        )}
        {u.phoneNumber && <InfoTile icon={Phone} label={t('رقم الموبايل')} value={u.phoneNumber} ltr href={telHref(u.phoneNumber)} />}
        {u.city && <InfoTile icon={MapPin} label={t('المدينة')} value={u.city} />}
        {u.role === 'Member' && <InfoTile icon={ReceiptText} label={t('عدد الأوردرات')} value={String(u.ordersCount)} />}
        {created && <InfoTile icon={Calendar} label={t('تاريخ التسجيل')} value={shortDate(created)} />}
        {u.stores.length > 0 && (
          <InfoTile
            icon={Store}
            label={u.role === 'StoreEmployee' ? t('كاشير في') : t('المحلات')}
            value={u.stores.map((s) => s.name).join('، ')}
            className="col-span-2 sm:col-span-3"
          />
        )}
      </div>

      {u.role !== 'Manager' && (
        <>
          <SectionTitle>{t('الإعدادات')}</SectionTitle>
          <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <ActionRow
              icon={IdCard}
              title={t('غيّر الاسم')}
              subtitle={u.fullName?.trim() || undefined}
              onClick={() => {
                setValue(u.fullName ?? '');
                setMode('name');
              }}
            />
            {hasRealEmail(u) && (
              <ActionRow
                icon={KeyRound}
                title={t('غيّر الباسورد')}
                onClick={() => {
                  setValue('');
                  setMode('password');
                }}
              />
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-5 px-1 text-[12px] font-extrabold tracking-wide text-ink-3">{children}</p>;
}

/** One fact about the account: a small label over its value, optionally a link or a button beside it. */
function InfoTile({
  icon: Icon,
  label,
  value,
  ltr,
  href,
  action,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  ltr?: boolean;
  href?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2 rounded-2xl bg-surface-alt/60 px-3 py-2.5', className)}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-3">
          <Icon className="size-3.5" />
          {label}
        </span>
        {href ? (
          <a href={href} dir={ltr ? 'ltr' : undefined} className="mt-0.5 block truncate text-[14px] font-bold text-brand-ink hover:underline" style={{ textAlign: 'start' }}>
            {value}
          </a>
        ) : (
          <span dir={ltr ? 'ltr' : undefined} className="mt-0.5 block truncate text-[14px] font-bold text-ink" style={{ textAlign: ltr ? 'start' : undefined }}>
            {value}
          </span>
        )}
      </span>
      {action}
    </div>
  );
}

/** A settings row inside the grouped card, with a chevron. */
function ActionRow({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 bg-surface px-3.5 py-3 text-start transition-colors hover:bg-surface-alt">
      <Icon className="size-5 shrink-0 text-ink-2" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-ink-2">{subtitle}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3 rtl:-scale-x-100" />
    </button>
  );
}
