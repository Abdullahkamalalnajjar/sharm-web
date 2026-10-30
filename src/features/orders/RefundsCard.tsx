import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { refundsApi } from '@/api';
import { Button, InlineError, Segmented, Sheet, SoftCard, TextField } from '@/components/ui';
import { formatOrderDate, formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import type { OrderRefunds, RefundParty } from '@/types';

// The store owner always sees Arabic; the admin sees the chosen language. Labels are translated where rendered.

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
        <span className="flex-1 font-extrabold text-ink">{t('الاسترجاع')}</span>
        {data.refunded > 0 && <span className="font-extrabold text-ink">{formatPrice(data.refunded)}</span>}
      </div>
      {data.refunds.map((r) => (
        <div key={r.id} className="mt-3 flex items-start gap-3 border-t border-line pt-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{r.reason}</span>
            <span className="block text-xs text-ink-3">
              {[
                t('على {party}', { party: t(PARTY_LABEL[r.chargedTo]) }),
                r.paidBy === 'Wallet' ? t('في محفظة الزبون') : t('كاش من {party}', { party: r.paidBy === 'Store' ? t('المحل') : t('الإدارة') }),
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
          {data.refunded > 0 ? t('استرجاع تاني (متاح {amount})', { amount: formatPrice(data.refundable) }) : t('استرجاع فلوس للزبون')}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t('استرجاع فلوس للزبون')}>
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
      ? t('مفيش حاجة هتتغيّر في محفظة المحل.')
      : storeBears
        ? toWallet === 'wallet'
          ? t('هيتخصم من محفظة المحل ويتضاف لمحفظة الزبون.')
          : t('هيتخصم من محفظة المحل، والإدارة تدّي الزبون الكاش.')
        : t('المحل يدّي الزبون الكاش، والتطبيق يرجّعهوله في المحفظة.');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setError(t('اكتب مبلغ'));
    if (n > data.refundable + 0.001) return setError(t('أكتر من المتاح'));
    if (!reason.trim()) return setError(t('اكتب السبب'));
    setBusy(true);
    const ok = await runAction(async () => {
      const updated = byAdmin
        ? await refundsApi.adminCreate(orderId, n, reason.trim(), chargedTo, paidBy)
        : await refundsApi.storeCreate(orderId, n, reason.trim(), toWallet === 'wallet');
      qc.setQueryData(refundsKey(side, orderId), updated);
    }, t('الاسترجاع اتسجّل، والزبون اتبلّغ'));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">{t('متاح لحد {amount}.', { amount: formatPrice(data.refundable) })}</p>
      <TextField name="amount" type="number" inputMode="decimal" ltr label={t('المبلغ (ج.م)')} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <TextField name="reason" label={t('السبب')} maxLength={300} placeholder={t('منتج ناقص، الأكل وصل بايظ...')} value={reason} onChange={(e) => setReason(e.target.value)} />
      <span className="text-[13px] font-bold text-ink-2">{t('الزبون ياخدها إزاي؟')}</span>
      <Segmented
        value={toWallet}
        onChange={setToWallet}
        options={[
          { value: 'wallet', label: t('في محفظته') },
          { value: 'cash', label: t('كاش') },
        ]}
      />
      {byAdmin && (
        <>
          <span className="text-[13px] font-bold text-ink-2">{t('مين يتحمّل الفلوس؟')}</span>
          <Segmented
            value={chargedTo}
            onChange={setChargedTo}
            options={[
              { value: 'Store', label: t('المحل') },
              { value: 'App', label: t('التطبيق / الإدارة') },
            ]}
          />
          {toWallet === 'cash' && (
            <>
              <span className="text-[13px] font-bold text-ink-2">{t('مين يدّي الزبون الكاش؟')}</span>
              <Segmented
                value={cashBy}
                onChange={setCashBy}
                options={[
                  { value: 'Store', label: t('المحل') },
                  { value: 'App', label: t('التطبيق / الإدارة') },
                ]}
              />
            </>
          )}
        </>
      )}
      <p className="text-xs text-ink-3">
        {toWallet === 'wallet'
          ? t('الفلوس هتتضاف لمحفظة الزبون على طول، ويقدر يدفع بيها في طلبه الجاي.')
          : byAdmin
            ? t('الزبون بياخد الفلوس كاش.')
            : t('المحل هيدّي الزبون الفلوس كاش بنفسه.')}
      </p>
      <p className="text-xs text-ink-3">{walletNote}</p>
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          {t('إلغاء')}
        </Button>
        <Button type="submit" size="md" loading={busy}>
          {t('تأكيد')}
        </Button>
      </div>
    </form>
  );
}
