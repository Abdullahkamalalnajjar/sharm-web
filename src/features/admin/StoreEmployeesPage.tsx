import { Eye, EyeOff, IdCard, Lock, Mail, Pencil, Phone, Trash2, UserPlus, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { storeEmployeesApi } from '@/api';
import { useStore } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, IconWell, InlineError, Loading, Sheet, SoftCard, TextField } from '@/components/ui';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { StoreEmployee } from '@/types';

const employeesKey = (storeId: number) => ['admin', 'store-employees', storeId] as const;

/** The admin's list of a store's cashiers: add, edit (name, phone, password) or remove them. */
export function StoreEmployeesPage() {
  const storeId = Number(useParams().id);
  const store = useStore(storeId);
  const employees = useQuery({ queryKey: employeesKey(storeId), queryFn: () => storeEmployeesApi.list(storeId) });
  const qc = useQueryClient();
  // null = closed; { employee: null } = a new account.
  const [form, setForm] = useState<{ employee: StoreEmployee | null } | null>(null);

  const reload = () => qc.invalidateQueries({ queryKey: employeesKey(storeId) });

  async function remove(e: StoreEmployee) {
    if (!(await confirm(`تشيل ${e.fullName}؟ حسابه هيتقفل ومش هيقدر يدخل تاني.`, 'شيل'))) return;
    if (await runAction(() => storeEmployeesApi.remove(storeId, e.id), 'الحساب اتشال')) reload();
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <PageHeader
        title={store.data ? `كاشير ${store.data.name}` : 'حسابات الكاشير'}
        actions={
          <Button size="sm" className="hidden md:inline-flex" icon={<UserPlus className="size-4" />} onClick={() => setForm({ employee: null })}>
            حساب كاشير
          </Button>
        }
      />
      <div className="flex flex-col gap-2.5 px-4">
        <SoftCard className="bg-surface-alt p-3.5 text-[13px] text-ink-2">
          الكاشير بيدخل بالإيميل والباسورد دول، ويشوف أوردرات المحل ويقبلها ويجهّزها. ما بيشوفش صافي المحل ولا المحفظة، ومش بيقدر يطلب سحب.
        </SoftCard>
        {employees.isLoading ? (
          <Loading />
        ) : employees.isError ? (
          <ErrorView message={(employees.error as Error).message} onRetry={() => employees.refetch()} />
        ) : employees.data!.length === 0 ? (
          <EmptyView icon={IdCard} message="لسه مفيش حسابات كاشير للمحل ده" />
        ) : (
          employees.data!.map((e) => (
            <SoftCard key={e.id} className="flex items-center gap-3 py-2.5 ps-3 pe-1.5">
              <IconWell icon={UserRound} size={42} color="var(--color-accent)" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-ink">{e.fullName}</span>
                {e.email && (
                  <span className="block truncate text-xs text-ink-3" dir="ltr" style={{ textAlign: 'end' }}>
                    {e.email}
                  </span>
                )}
                {e.phoneNumber && (
                  <span className="block text-xs text-ink-3" dir="ltr" style={{ textAlign: 'end' }}>
                    {e.phoneNumber}
                  </span>
                )}
              </span>
              <button type="button" title="تعديل" onClick={() => setForm({ employee: e })} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-alt">
                <Pencil className="size-[18px]" />
              </button>
              <button type="button" title="شيل" onClick={() => remove(e)} className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger/10">
                <Trash2 className="size-[18px]" />
              </button>
            </SoftCard>
          ))
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 px-4 md:hidden">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Button className="pointer-events-auto" icon={<UserPlus className="size-5" />} onClick={() => setForm({ employee: null })}>
            حساب كاشير
          </Button>
        </div>
      </div>

      <Sheet open={form !== null} onClose={() => setForm(null)} title={form?.employee ? `تعديل ${form.employee.fullName}` : 'حساب كاشير جديد'}>
        {form && (
          <EmployeeForm
            key={form.employee?.id ?? 'new'}
            storeId={storeId}
            employee={form.employee}
            onDone={() => {
              setForm(null);
              reload();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function EmployeeForm({ storeId, employee, onDone }: { storeId: number; employee: StoreEmployee | null; onDone: () => void }) {
  const isNew = employee === null;
  const [name, setName] = useState(employee?.fullName ?? '');
  const [phone, setPhone] = useState(employee?.phoneNumber ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('الاسم مطلوب');
    if (isNew && !email.includes('@')) return setError('اكتب إيميل صحيح');
    // Editing: an empty password keeps the current one.
    if ((isNew || password) && password.length < 6) return setError('الباسورد ٦ حروف على الأقل');
    setError(null);
    setBusy(true);
    const input = { fullName: name.trim(), phoneNumber: phone.trim() || null, password, email: email.trim() };
    const ok = await runAction(
      () => (isNew ? storeEmployeesApi.create(storeId, input) : storeEmployeesApi.update(storeId, employee.id, input)),
      isNew ? 'حساب الكاشير اتعمل' : 'البيانات اتحفظت',
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="fullName" label="الاسم" maxLength={100} start={<UserRound className="size-4" />} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField name="phone" type="tel" ltr maxLength={20} label="رقم الموبايل (اختياري)" start={<Phone className="size-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
      {isNew && (
        <TextField name="email" type="email" ltr autoComplete="off" label="الإيميل (للدخول)" start={<Mail className="size-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
      )}
      <TextField
        name="password"
        type={showPassword ? 'text' : 'password'}
        ltr
        autoComplete="new-password"
        label={isNew ? 'الباسورد' : 'باسورد جديد (سيبه فاضي لو مش هتغيّره)'}
        start={<Lock className="size-4" />}
        end={
          <button type="button" aria-label={showPassword ? 'إخفاء' : 'إظهار'} onClick={() => setShowPassword(!showPassword)} className="text-ink-3 hover:text-ink">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <InlineError message={error} />}
      <Button type="submit" block size="md" loading={busy} className="mt-1">
        {isNew ? 'اعمل الحساب' : 'حفظ'}
      </Button>
    </form>
  );
}
