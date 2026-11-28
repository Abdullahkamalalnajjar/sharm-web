import clsx from 'clsx';
import { BadgeCheck, Bike, CheckCheck, Clock, Eye, EyeOff, IdCard, Lock, Mail, Package, Phone, PowerOff, Search, SearchX, UserRound, UserRoundPlus, Wallet, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { driversApi } from '@/api';
import { errorMessage } from '@/api/client';
import { useAdminDrivers } from '@/api/queries';
import { Button, Chip, EmptyView, ErrorView, IconWell, InlineError, Loading, Sheet, SoftCard, Spinner, StatusChip, Switch, TextField } from '@/components/ui';
import { telHref } from '@/features/orders/OrderWidgets';
import { t, tIn } from '@/lib/i18n';
import { VEHICLE_TYPES, vehicleLabel } from '@/lib/meta';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { Driver, VehicleType } from '@/types';

type DriverFilter = 'all' | 'free' | 'busy' | 'away' | 'off';

/** Where a driver stands right now, as a label and a color (used by the card, the row and the filters). */
function driverState(d: Driver): { key: Exclude<DriverFilter, 'all'>; label: string; color: string } {
  if (!d.isActive) return { key: 'off', label: t('متوقف'), color: 'var(--color-ink-3)' };
  if (d.activeOrders > 0) return { key: 'busy', label: t('معاه {n} أوردر', { n: d.activeOrders }), color: 'var(--color-series-1)' };
  if (d.isAvailable) return { key: 'free', label: t('فاضي'), color: 'var(--color-success)' };
  return { key: 'away', label: t('مش متاح'), color: 'var(--color-warning)' };
}

const DRIVER_COLUMNS = 'grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_150px_90px_150px]';

/** The admin's drivers: review the ones who signed up, add them, edit them, turn them on or off. */
export function AdminDriversPage() {
  const drivers = useAdminDrivers();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Driver | null | undefined>(undefined); // undefined = closed, null = new
  const [idOf, setIdOf] = useState<Driver | null>(null);
  const [filter, setFilter] = useState<DriverFilter>('all');
  const [query, setQuery] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });

  async function toggle(d: Driver) {
    if (
      d.isActive &&
      !(await confirm(
        d.activeOrders > 0
          ? t('توقف {name}؟ معاه {n} أوردر لسه، هيفضلوا معاه لحد ما تغيّر المندوب.', { name: d.fullName, n: d.activeOrders })
          : t('توقف {name}؟ مش هتقدر تديله أوردرات جديدة.', { name: d.fullName }),
        t('إيقاف'),
      ))
    ) {
      return;
    }
    const success = d.isActive ? t('المندوب اتوقف') : d.isApproved ? t('المندوب اتفعّل') : t('المندوب اتقبل واتفعّل');
    if (await runAction(() => driversApi.setActive(d.id, !d.isActive), success)) refresh();
  }

  const all = drivers.data ?? [];
  const waiting = all.filter((d) => !d.isApproved);
  const approved = all.filter((d) => d.isApproved);
  const countOf = (f: DriverFilter) => (f === 'all' ? approved.length : approved.filter((d) => driverState(d).key === f).length);
  const q = query.trim().toLowerCase();
  const list = approved.filter(
    (d) =>
      (filter === 'all' || driverState(d).key === filter) &&
      (!q || d.fullName.toLowerCase().includes(q) || d.phoneNumber.includes(q) || (d.email ?? '').toLowerCase().includes(q)),
  );

  const stats: { key: DriverFilter; label: string; color: string; icon: LucideIcon }[] = [
    { key: 'all', label: t('كل المندوبين'), color: 'var(--color-brand)', icon: Bike },
    { key: 'free', label: t('فاضيين'), color: 'var(--color-success)', icon: CheckCheck },
    { key: 'busy', label: t('معاهم أوردرات'), color: 'var(--color-series-1)', icon: Package },
    { key: 'away', label: t('مش متاحين'), color: 'var(--color-warning)', icon: Clock },
    { key: 'off', label: t('متوقفين'), color: 'var(--color-ink-3)', icon: PowerOff },
  ];

  return (
    <div className="pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('المندوبين')}</h1>
          {drivers.data && <p className="text-[13px] font-medium text-ink-3">{t('{n} مندوب', { n: approved.length })}</p>}
        </div>
        <Button size="md" icon={<UserRoundPlus className="size-4" />} title={t('مندوب جديد')} onClick={() => setEditing(null)}>
          <span className="hidden sm:inline">{t('مندوب جديد')}</span>
        </Button>
      </div>

      <div className="px-4 pt-4">
        {drivers.isLoading ? (
          <Loading />
        ) : drivers.isError ? (
          <ErrorView message={(drivers.error as Error).message} onRetry={() => drivers.refetch()} />
        ) : all.length === 0 ? (
          <EmptyView icon={Bike} message={t('لسه مفيش مندوبين.\nضيف أول مندوب عشان توزّع عليه الأوردرات.')} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* The counts double as filters. */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((s) => {
                const selected = filter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilter(s.key)}
                    aria-pressed={selected}
                    className={clsx(
                      'flex items-center gap-3 rounded-card border bg-surface p-3.5 text-start shadow-card transition-colors',
                      selected ? 'border-brand ring-1 ring-brand' : 'border-transparent hover:bg-surface-alt',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[22px] font-extrabold leading-tight text-ink tabular-nums">{countOf(s.key)}</span>
                      <span className="block truncate text-xs font-semibold text-ink-2">{s.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {waiting.length > 0 && (
              <section>
                <p className="mb-2 flex items-center gap-2 px-1 font-extrabold text-ink">
                  <span className="size-2 rounded-full bg-warning" />
                  {t('مستنيين المراجعة ({n})', { n: waiting.length })}
                </p>
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {waiting.map((d) => (
                    <WaitingDriverCard key={d.id} driver={d} onViewId={() => setIdOf(d)} onApprove={() => toggle(d)} />
                  ))}
                </div>
              </section>
            )}

            <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-brand md:w-[380px]">
              <Search className="size-5 text-ink-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('دور بالاسم أو الموبايل أو الإيميل')}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
              />
              {query && (
                <button type="button" aria-label={tIn('admin', 'مسح')} onClick={() => setQuery('')} className="text-ink-2 hover:text-ink">
                  <X className="size-5" />
                </button>
              )}
            </label>

            {list.length === 0 ? (
              <EmptyView icon={q ? SearchX : Bike} message={q ? t('مفيش نتايج لـ "{q}"', { q: query.trim() }) : t('مفيش مندوبين هنا')} />
            ) : (
              <>
                {/* Wide screens: one row per driver. */}
                <SoftCard className="hidden overflow-hidden lg:block">
                  <div className={clsx('grid gap-3 border-b border-line bg-surface-alt/60 px-4 py-2.5 text-xs font-bold text-ink-3', DRIVER_COLUMNS)}>
                    <span>{t('المندوب')}</span>
                    <span>{t('رقم الموبايل')}</span>
                    <span>{t('المركبة')}</span>
                    <span>{t('الحالة')}</span>
                    <span>{t('اتوصّل')}</span>
                    <span />
                  </div>
                  {list.map((d) => (
                    <DriverRow key={d.id} driver={d} onEdit={() => setEditing(d)} onToggle={() => toggle(d)} onWallet={() => navigate(`/admin/drivers/${d.id}/wallet`)} />
                  ))}
                </SoftCard>
                {/* Phones and tablets: cards. */}
                <div className="grid gap-3 md:grid-cols-2 lg:hidden">
                  {list.map((d) => (
                    <DriverCard key={d.id} driver={d} onEdit={() => setEditing(d)} onToggle={() => toggle(d)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <DriverFormSheet open={editing !== undefined} driver={editing ?? null} onClose={() => setEditing(undefined)} onSaved={refresh} />
      <NationalIdSheet driver={idOf} onClose={() => setIdOf(null)} />
    </div>
  );
}

/** The driver's initial in a circle of their state's color. */
function DriverAvatar({ driver, size = 42 }: { driver: Driver; size?: number }) {
  const { color } = driverState(driver);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {driver.fullName.trim().charAt(0) || '?'}
    </span>
  );
}

function DriverRow({ driver: d, onEdit, onToggle, onWallet }: { driver: Driver; onEdit: () => void; onToggle: () => void; onWallet: () => void }) {
  const state = driverState(d);
  const vehicle = VEHICLE_TYPES.find((v) => v.value === d.vehicleType);
  return (
    <div className={clsx('grid items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0 hover:bg-surface-alt/50', DRIVER_COLUMNS, !d.isActive && 'opacity-60')}>
      <button type="button" onClick={onEdit} className="flex min-w-0 items-center gap-3 text-start">
        <DriverAvatar driver={d} />
        <span className="min-w-0">
          <span className="block truncate font-extrabold text-ink">{d.fullName}</span>
          {d.email && (
            <span className="block truncate text-xs text-ink-3" dir="ltr" style={{ textAlign: 'start' }}>
              {d.email}
            </span>
          )}
        </span>
      </button>
      <span className="truncate text-ink-2 tabular-nums" dir="ltr" style={{ textAlign: 'start' }}>
        {d.phoneNumber}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
        {vehicle ? (
          <>
            <vehicle.Icon className="size-4 shrink-0 text-ink-3" />
            <span className="truncate">{vehicle.label}</span>
          </>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </span>
      <span>
        <StatusChip label={state.label} color={state.color} />
      </span>
      <span className="font-bold text-ink tabular-nums">{d.deliveredOrders}</span>
      <span className="flex items-center justify-end gap-1">
        <button type="button" title={tIn('admin', 'الحساب')} aria-label={tIn('admin', 'الحساب')} onClick={onWallet} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
          <Wallet className="size-[18px]" />
        </button>
        <a href={telHref(d.phoneNumber)} title={t('اتصل')} aria-label={t('اتصل')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
          <Phone className="size-[18px]" />
        </a>
        <Switch checked={d.isActive} onChange={onToggle} label={t('مفعّل')} />
      </span>
    </div>
  );
}

/** A driver who signed up in the app: check the ID card, then approve (activates them). */
function WaitingDriverCard({ driver: d, onViewId, onApprove }: { driver: Driver; onViewId: () => void; onApprove: () => void }) {
  const vehicle = vehicleLabel(d.vehicleType);
  return (
    <SoftCard className="p-3.5 bg-warning/10">
      <div className="flex items-center gap-3">
        <IconWell icon={Bike} size={46} color="var(--color-warning)" />
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-ink">{d.fullName}</span>
          <span className="block text-[13px] text-ink-2" dir="ltr">
            {d.phoneNumber}
          </span>
          {vehicle && <span className="block text-xs text-ink-3">{vehicle}</span>}
        </span>
        <StatusChip label={t('جديد')} color="var(--color-warning)" />
      </div>
      <div className="mt-3 flex gap-2.5">
        {d.hasNationalIdImage && (
          <Button variant="outline" className="flex-1" icon={<IdCard className="size-4" />} onClick={onViewId}>
            {t('شوف البطاقة')}
          </Button>
        )}
        <Button className="flex-1" icon={<BadgeCheck className="size-4" />} onClick={onApprove}>
          {t('اقبل وفعّل')}
        </Button>
      </div>
    </SoftCard>
  );
}

/** The ID card photo a driver signed up with (downloaded with the admin's token, not cached). */
function NationalIdSheet({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driver) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    driversApi
      .nationalIdImage(driver.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [driver]);

  return (
    <Sheet open={driver !== null} onClose={onClose} title={driver ? t('بطاقة {name}', { name: driver.fullName }) : undefined}>
      {error ? (
        <InlineError message={t('مقدرناش نحمّل صورة البطاقة')} />
      ) : url ? (
        <img src={url} alt="" className="w-full rounded-card" />
      ) : (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      )}
    </Sheet>
  );
}

function DriverCard({ driver: d, onEdit, onToggle }: { driver: Driver; onEdit: () => void; onToggle: () => void }) {
  const navigate = useNavigate();
  const { label, color } = driverState(d);
  const vehicle = vehicleLabel(d.vehicleType);

  return (
    <SoftCard className={clsx('p-3.5', !d.isActive && 'opacity-60')}>
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-3 text-start">
        <DriverAvatar driver={d} size={46} />
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-ink">{d.fullName}</span>
          <span className="block text-[13px] text-ink-2" dir="ltr">
            {d.phoneNumber}
          </span>
          {d.email && (
            <span className="block text-xs text-ink-3" dir="ltr">
              {d.email}
            </span>
          )}
          {vehicle && <span className="block text-xs text-ink-3">{vehicle}</span>}
        </span>
        <StatusChip label={label} color={color} />
      </button>
      <div className="my-3 border-t border-line" />
      <div className="flex items-center gap-2">
        <CheckCheck className="size-4 text-ink-3" />
        <span className="text-ink-2">{t('{n} أوردر اتوصّل', { n: d.deliveredOrders })}</span>
        <span className="flex-1" />
        <button type="button" title={tIn('admin', 'الحساب')} onClick={() => navigate(`/admin/drivers/${d.id}/wallet`)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
          <Wallet className="size-[18px]" />
        </button>
        <a href={telHref(d.phoneNumber)} title={t('اتصل')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
          <Phone className="size-[18px]" />
        </a>
        <Switch checked={d.isActive} onChange={onToggle} label={t('مفعّل')} />
      </div>
    </SoftCard>
  );
}

/** Create a driver (with their login) or edit an existing one's name, phone and vehicle. */
function DriverFormSheet({ open, driver, onClose, onSaved }: { open: boolean; driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={driver ? t('تعديل المندوب') : t('مندوب جديد')}>
      {open && <DriverForm key={driver?.id ?? 'new'} driver={driver} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function DriverForm({ driver, onClose, onSaved }: { driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  const isNew = driver === null;
  const [name, setName] = useState(driver?.fullName ?? '');
  const [phone, setPhone] = useState(driver?.phoneNumber ?? '');
  const [vehicle, setVehicle] = useState<VehicleType | null>(driver?.vehicleType ?? null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t('الاسم مطلوب'));
    if (!phone.trim()) return setError(t('رقم الموبايل مطلوب'));
    if (isNew && !email.includes('@')) return setError(t('اكتب إيميل صحيح'));
    if (isNew && password.length < 6) return setError(t('الباسورد ٦ حروف على الأقل'));
    setError(null);
    setBusy(true);
    try {
      if (isNew) await driversApi.create({ fullName: name.trim(), phoneNumber: phone.trim(), email: email.trim(), password, vehicleType: vehicle });
      else await driversApi.update(driver.id, { fullName: name.trim(), phoneNumber: phone.trim(), vehicleType: vehicle });
      showMessage(isNew ? t('المندوب اتضاف') : t('البيانات اتحفظت'));
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="name" label={t('الاسم')} maxLength={100} start={<UserRound className="size-5" />} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField name="phone" type="tel" ltr label={t('رقم الموبايل')} maxLength={20} start={<Phone className="size-5" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {VEHICLE_TYPES.map((v) => (
          <Chip key={v.value} selected={vehicle === v.value} onClick={() => setVehicle(vehicle === v.value ? null : v.value)} icon={<v.Icon className="size-4" />}>
            {v.label}
          </Chip>
        ))}
      </div>
      {isNew && (
        <>
          <p className="mt-1 text-[13px] font-bold text-ink-2">{t('بيانات الدخول لتطبيق المندوب')}</p>
          <TextField name="email" type="email" ltr label={t('الإيميل')} autoComplete="off" start={<Mail className="size-5" />} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            name="password"
            type={show ? 'text' : 'password'}
            ltr
            label={t('الباسورد')}
            autoComplete="new-password"
            start={<Lock className="size-5" />}
            end={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={t('إظهار الباسورد')} className="hover:text-ink">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
      {error && <InlineError message={error} />}
      <Button type="submit" block loading={busy} className="mt-2">
        {isNew ? t('إضافة المندوب') : t('حفظ')}
      </Button>
    </form>
  );
}
