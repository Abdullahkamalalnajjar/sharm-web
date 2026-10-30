import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { refundsApi } from '@/api';
import { Button, InlineError, Segmented, Sheet, SoftCard, TextField } from '@/components/ui';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { runAction } from '@/lib/run-action';
import type { OrderRefunds, RefundParty } from '@/types';

// Staff pages (admin, store) are Arabic only, so the texts here are not translated.

const refundsKey = (side: 'admin' | 'store', orderId: number) => ['refunds', side, orderId] as const;

const PARTY_LABEL: Record<RefundParty, string> = { Store: 'المحل', App: 'التطبيق / الإدارة', Wallet: 'محفظة الزبون' };

/**
 * A delivered order's refunds, with "استرجاع فلوس للزبون". The store owner refunds at the store's cost (cash it
 * hands over, or into the customer's wallet); the admin also picks who bears it. [canRefund] false for cashiers.
 */
export function RefundsCard({ side, orderId, canRefund = true }: { side: 'admin' | 'store'; orderId: number; canRefund?: boolean }) {
  const data = useQuery({
    queryKey: refundsKey(side, orderId),
    queryFn: () => (side === 'admin' ? refundsApi.admin(orderId) : refundsApi.store(orderId)),
  }).data;
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const showButton = canRefund && data.refundable > 0;
  if (data.refunds.length === 0 && !showButton) return null;

  return (
    <SoftCard className="p-4">
      <div className="flex items-center gap-2">
        <HandCoins className="size-5 text-accent" />
        <span className="flex-1 font-extrabold text-ink">الاسترجاع</span>
        {data.refunded > 0 && <span className="font-extrabold text-ink">{formatPrice(data.refunded)}</span>}
      </div>
      {data.refunds.map((r) => (
        <div key={r.id} className="mt-3 flex items-start gap-3 border-t border-line pt-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{r.reason}</span>
            <span className="block text-xs text-ink-3">
              {[
                `على ${PARTY_LABEL[r.chargedTo]}`,
                r.paidBy === 'Wallet' ? 'في محفظة الزبون' : `كاش من ${r.paidBy === 'Store' ? 'المحل' : 'الإدارة'}`,
                formatOrderDate(r.createdUtc),
              ].join(' • ')}
            </span>
          </span>
          <span dir="ltr" className="font-extrabold text-danger">
            − {formatPrice(r.amount)}
          </span>
        </div>
      ))}
      {showButton && (
        <Button variant="ghost" block className="mt-3 text-danger" onClick={() => setOpen(true)}>
          {data.refunded > 0 ? `استرجاع تاني (متاح ${formatPrice(data.refundable)})` : 'استرجاع فلوس للزبون'}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="استرجاع فلوس للزبون">
        {open && <RefundForm side={side} orderId={orderId} data={data} onClose={() => setOpen(false)} />}
      </Sheet>
    </SoftCard>
  );
}

function RefundForm({ side, orderId, data, onClose }: { side: 'admin' | 'store'; orderId: number; data: OrderRefunds; onClose: () => void }) {
  const qc = useQueryClient();
  const byAdmin = side === 'admin';
  const [amount, setAmount] = useState(String(data.refundable));
  const [reason, setReason] = useState('');
  const [toWallet, setToWallet] = useState<'wallet' | 'cash'>('wallet');
  const [chargedTo, setChargedTo] = useState<RefundParty>('Store');
  const [cashBy, setCashBy] = useState<RefundParty>('App');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paidBy: RefundParty = toWallet === 'wallet' ? 'Wallet' : byAdmin ? cashBy : 'Store';
  const storeBears = !byAdmin || chargedTo === 'Store';
  const storePays = paidBy === 'Store';
  const walletNote =
    storePays === storeBears
      ? 'مفيش حاجة هتتغيّر في محفظة المحل.'
      : storeBears
        ? toWallet === 'wallet'
          ? 'هيتخصم من محفظة المحل ويتضاف لمحفظة الزبون.'
          : 'هيتخصم من محفظة المحل، والإدارة تدّي الزبون الكاش.'
        : 'المحل يدّي الزبون الكاش، والتطبيق يرجّعهوله في المحفظة.';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setError('اكتب مبلغ');
    if (n > data.refundable + 0.001) return setError('أكتر من المتاح');
    if (!reason.trim()) return setError('اكتب السبب');
    setBusy(true);
    const ok = await runAction(async () => {
      const updated = byAdmin
        ? await refundsApi.adminCreate(orderId, n, reason.trim(), chargedTo, paidBy)
        : await refundsApi.storeCreate(orderId, n, reason.trim(), toWallet === 'wallet');
      qc.setQueryData(refundsKey(side, orderId), updated);
    }, 'الاسترجاع اتسجّل، والزبون اتبلّغ');
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">متاح لحد {formatPrice(data.refundable)}.</p>
      <TextField name="amount" type="number" inputMode="decimal" ltr label="المبلغ (ج.م)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <TextField name="reason" label="السبب" maxLength={300} placeholder="منتج ناقص، الأكل وصل بايظ..." value={reason} onChange={(e) => setReason(e.target.value)} />
      <span className="text-[13px] font-bold text-ink-2">الزبون ياخدها إزاي؟</span>
      <Segmented
        value={toWallet}
        onChange={setToWallet}
        options={[
          { value: 'wallet', label: 'في محفظته' },
          { value: 'cash', label: 'كاش' },
        ]}
      />
      {byAdmin && (
        <>
          <span className="text-[13px] font-bold text-ink-2">مين يتحمّل الفلوس؟</span>
          <Segmented
            value={chargedTo}
            onChange={setChargedTo}
            options={[
              { value: 'Store', label: 'المحل' },
              { value: 'App', label: 'التطبيق / الإدارة' },
            ]}
          />
          {toWallet === 'cash' && (
            <>
              <span className="text-[13px] font-bold text-ink-2">مين يدّي الزبون الكاش؟</span>
              <Segmented
                value={cashBy}
                onChange={setCashBy}
                options={[
                  { value: 'Store', label: 'المحل' },
                  { value: 'App', label: 'التطبيق / الإدارة' },
                ]}
              />
            </>
          )}
        </>
      )}
      <p className="text-xs text-ink-3">
        {toWallet === 'wallet'
          ? 'الفلوس هتتضاف لمحفظة الزبون على طول، ويقدر يدفع بيها في طلبه الجاي.'
          : byAdmin
            ? 'الزبون بياخد الفلوس كاش.'
            : 'المحل هيدّي الزبون الفلوس كاش بنفسه.'}
      </p>
      <p className="text-xs text-ink-3">{walletNote}</p>
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          تأكيد
        </Button>
      </div>
    </form>
  );
}
