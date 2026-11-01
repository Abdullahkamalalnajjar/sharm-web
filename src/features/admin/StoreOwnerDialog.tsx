import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { storesApi } from '@/api';
import { useRefreshAdmin } from '@/api/queries';
import { Button, InlineError, Segmented, Sheet, TextField } from '@/components/ui';
import { t, tIn } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { Store } from '@/types';

/**
 * The admin gives a store to its owner: a new store-owner login (email + password) or an existing account.
 * `currentEmail` prefills the email (null while the store is still under the admin's name).
 */
export function StoreOwnerDialog({ store, currentEmail, open, onClose }: { store: Store; currentEmail: string | null; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('صاحب المحل')}>
      {open && <OwnerForm key={store.id} store={store} currentEmail={currentEmail} onClose={onClose} />}
    </Sheet>
  );
}

function OwnerForm({ store, currentEmail, onClose }: { store: Store; currentEmail: string | null; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState(currentEmail ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = mode === 'new';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return setError(t('اكتب إيميل صحيح'));
    if (isNew && password.length < 6) return setError(t('الباسورد ٦ حروف على الأقل'));
    setBusy(true);
    const ok = await runAction(
      () => storesApi.assignOwner(store.id, email.trim(), isNew ? password : null),
      isNew ? t('اتعمل حساب لصاحب المحل والمحل اتنقل له') : t('المحل اتنقل لصاحبه'),
    );
    setBusy(false);
    if (ok) {
      refresh();
      onClose();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'new', label: tIn('storeOwner', 'حساب جديد') },
          { value: 'existing', label: t('عنده حساب') },
        ]}
      />
      <TextField
        name="ownerEmail"
        type="email"
        ltr
        autoComplete="off"
        label={t('إيميل صاحب المحل')}
        start={<Mail className="size-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {isNew && (
        <TextField
          name="ownerPassword"
          type={show ? 'text' : 'password'}
          ltr
          autoComplete="new-password"
          label={t('الباسورد')}
          start={<Lock className="size-4" />}
          end={
            <button type="button" aria-label={t('إظهار')} onClick={() => setShow(!show)} className="text-ink-3 hover:text-ink">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      <p className="text-xs text-ink-2">
        {isNew ? t('هيتعمل حساب صاحب محل بالإيميل والباسورد دول، ويدخل بيهم أبلكيشن المحلات.') : t('المحل هيتنقل لحساب صاحب المحل اللي بالإيميل ده.')}
      </p>
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          {t('إلغاء')}
        </Button>
        <Button type="submit" size="md" loading={busy}>
          {t('حفظ')}
        </Button>
      </div>
    </form>
  );
}
