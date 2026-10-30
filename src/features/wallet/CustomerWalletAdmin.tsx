import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { customerWalletApi } from '@/api';
import { Button, InlineError, Segmented, Sheet, SoftCard, TextField } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { runAction } from '@/lib/run-action';

// Admin pages are Arabic only.

const walletKey = (customerId: string) => ['admin', 'customer-wallet', customerId] as const;

/** Admin order page: the customer's wallet balance, with add / take (the reason is shown to the customer). */
export function CustomerWalletCard({ customerId }: { customerId: string }) {
  const wallet = useQuery({ queryKey: walletKey(customerId), queryFn: () => customerWalletApi.ofCustomer(customerId) });
  const [open, setOpen] = useState(false);
  const balance = wallet.data?.balance;

  return (
    <SoftCard className="flex items-center gap-3 p-4">
      <Wallet className="size-5 text-brand-ink" />
      <span className="flex-1 font-bold text-ink">
        {wallet.isError ? 'تعذّر تحميل المحفظة' : `محفظة الزبون: ${balance === undefined ? '…' : formatPrice(balance)}`}
      </span>
      <Button variant="ghost" size="sm" disabled={balance === undefined} onClick={() => setOpen(true)}>
        زوّد / اخصم
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`محفظة الزبون (${formatPrice(balance ?? 0)})`}>
        {open && balance !== undefined && <AdjustForm customerId={customerId} balance={balance} onClose={() => setOpen(false)} />}
      </Sheet>
    </SoftCard>
  );
}

function AdjustForm({ customerId, balance, onClose }: { customerId: string; balance: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'add' | 'take'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setError('اكتب مبلغ');
    if (mode === 'take' && n > balance) return setError(`الزبون معاه ${formatPrice(balance)} بس`);
    if (!note.trim()) return setError('اكتب السبب');
    setBusy(true);
    const ok = await runAction(async () => {
      qc.setQueryData(walletKey(customerId), await customerWalletApi.adjust(customerId, mode === 'add' ? n : -n, note.trim()));
    }, mode === 'add' ? 'الفلوس اتضافت للمحفظة' : 'الفلوس اتخصمت من المحفظة');
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'add', label: 'زوّد' },
          { value: 'take', label: 'اخصم' },
        ]}
      />
      <TextField name="amount" type="number" inputMode="decimal" ltr autoFocus label="المبلغ (ج.م)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <TextField name="note" label="السبب (بيظهر للزبون)" maxLength={300} placeholder="مثلاً: تعويض، هدية" value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}
