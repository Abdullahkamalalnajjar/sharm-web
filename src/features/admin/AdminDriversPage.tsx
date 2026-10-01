import clsx from 'clsx';
import { Bike, CheckCheck, Eye, EyeOff, Lock, Mail, Phone, UserRound, UserRoundPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { driversApi } from '@/api';
import { errorMessage } from '@/api/client';
import { useAdminDrivers } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, IconWell, InlineError, Loading, Sheet, SoftCard, StatusChip, Switch, TextField } from '@/components/ui';
import { telHref } from '@/features/orders/OrderWidgets';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';
import type { Driver } from '@/types';

/** The admin's drivers: add them, edit them, turn them on or off. */
export function AdminDriversPage() {
  const drivers = useAdminDrivers();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Driver | null | undefined>(undefined); // undefined = closed, null = new

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });

  async function toggle(d: Driver) {
    if (
      d.isActive &&
      !(await confirm(
        d.activeOrders > 0
          ? `توقف ${d.fullName}؟ معاه ${d.activeOrders} أوردر لسه، هيفضلوا معاه لحد ما تغيّر المندوب.`
          : `توقف ${d.fullName}؟ مش هتقدر تديله أوردرات جديدة.`,
        'إيقاف',
      ))
    ) {
      return;
    }
    if (await runAction(() => driversApi.setActive(d.id, !d.isActive), d.isActive ? 'المندوب اتوقف' : 'المندوب اتفعّل')) refresh();
  }

  const list = drivers.data ?? [];
  const active = list.filter((d) => d.isActive).length;
  const busy = list.filter((d) => d.isActive && d.activeOrders > 0).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28">
      <TabHeader
        title="المندوبين"
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<UserRoundPlus className="size-4" />} onClick={() => setEditing(null)}>
            مندوب جديد
          </Button>
        }
      />
      {drivers.isLoading ? (
        <Loading />
      ) : drivers.isError ? (
        <ErrorView message={(drivers.error as Error).message} onRetry={() => drivers.refetch()} />
      ) : list.length === 0 ? (
        <EmptyView icon={Bike} message={'لسه مفيش مندوبين.\nضيف أول مندوب عشان توزّع عليه الأوردرات.'} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="مفعّلين" value={active} color="var(--color-success)" />
            <Stat label="معاهم أوردرات" value={busy} color="var(--color-series-1)" />
            <Stat label="فاضيين" value={active - busy} color="var(--color-series-3)" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {list.map((d) => (
              <DriverCard key={d.id} driver={d} onEdit={() => setEditing(d)} onToggle={() => toggle(d)} />
            ))}
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-24 z-30 px-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-3xl flex justify-end">
          <Button className="pointer-events-auto" icon={<UserRoundPlus className="size-5" />} onClick={() => setEditing(null)}>
            مندوب جديد
          </Button>
        </div>
      </div>

      <DriverFormSheet open={editing !== undefined} driver={editing ?? null} onClose={() => setEditing(undefined)} onSaved={refresh} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <SoftCard className="flex flex-col items-center px-2 py-3">
      <span className="text-[22px] font-extrabold text-ink">{value}</span>
      <span className="flex items-center gap-1.5 text-xs text-ink-2">
        <span className="size-[7px] rounded-full" style={{ background: color }} />
        {label}
      </span>
    </SoftCard>
  );
}

function DriverCard({ driver: d, onEdit, onToggle }: { driver: Driver; onEdit: () => void; onToggle: () => void }) {
  const free = d.activeOrders === 0;
  const [label, color] = !d.isActive
    ? ['متوقف', 'var(--color-ink-3)']
    : free
      ? ['فاضي', 'var(--color-success)']
      : [`معاه ${d.activeOrders} أوردر`, 'var(--color-series-1)'];

  return (
    <SoftCard className={clsx('p-3.5', !d.isActive && 'opacity-60')}>
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-3 text-start">
        <IconWell icon={Bike} size={46} color={color} />
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
        </span>
        <StatusChip label={label} color={color} />
      </button>
      <div className="my-3 border-t border-line" />
      <div className="flex items-center gap-2">
        <CheckCheck className="size-4 text-ink-3" />
        <span className="text-ink-2">{d.deliveredOrders} أوردر اتوصّل</span>
        <span className="flex-1" />
        <a href={telHref(d.phoneNumber)} title="اتصل" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
          <Phone className="size-[18px]" />
        </a>
        <Switch checked={d.isActive} onChange={onToggle} label="مفعّل" />
      </div>
    </SoftCard>
  );
}

/** Create a driver (with their login) or edit an existing one's name and phone. */
function DriverFormSheet({ open, driver, onClose, onSaved }: { open: boolean; driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={driver ? 'تعديل المندوب' : 'مندوب جديد'}>
      {open && <DriverForm key={driver?.id ?? 'new'} driver={driver} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function DriverForm({ driver, onClose, onSaved }: { driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  const isNew = driver === null;
  const [name, setName] = useState(driver?.fullName ?? '');
  const [phone, setPhone] = useState(driver?.phoneNumber ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('الاسم مطلوب');
    if (!phone.trim()) return setError('رقم الموبايل مطلوب');
    if (isNew && !email.includes('@')) return setError('اكتب إيميل صحيح');
    if (isNew && password.length < 6) return setError('الباسورد ٦ حروف على الأقل');
    setError(null);
    setBusy(true);
    try {
      if (isNew) await driversApi.create({ fullName: name.trim(), phoneNumber: phone.trim(), email: email.trim(), password });
      else await driversApi.update(driver.id, { fullName: name.trim(), phoneNumber: phone.trim() });
      showMessage(isNew ? 'المندوب اتضاف' : 'البيانات اتحفظت');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="name" label="الاسم" maxLength={100} start={<UserRound className="size-5" />} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField name="phone" type="tel" ltr label="رقم الموبايل" maxLength={20} start={<Phone className="size-5" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
      {isNew && (
        <>
          <p className="mt-1 text-[13px] font-bold text-ink-2">بيانات الدخول لتطبيق المندوب</p>
          <TextField name="email" type="email" ltr label="الإيميل" autoComplete="off" start={<Mail className="size-5" />} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            name="password"
            type={show ? 'text' : 'password'}
            ltr
            label="الباسورد"
            autoComplete="new-password"
            start={<Lock className="size-5" />}
            end={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="إظهار الباسورد" className="hover:text-ink">
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
        {isNew ? 'إضافة المندوب' : 'حفظ'}
      </Button>
    </form>
  );
}
