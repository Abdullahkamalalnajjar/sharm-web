import { Gift, Info, RotateCcw, ShoppingBag, Undo2, Wallet } from 'lucide-react';

import { useMyWallet } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { EmptyView, ErrorView, Loading, SectionHeader, SoftCard } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { dateLocale, formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { parseUtc } from '@/lib/notifications';
import { useAuth } from '@/store/auth';
import type { CustomerWalletEntry } from '@/types';

/** The customer's wallet: money refunded from orders (or added by MARID), spent at checkout. */
export function WalletPage() {
  const signedIn = useAuth((s) => s.session !== null);
  const wallet = useMyWallet();

  if (!signedIn) return <LoginRequired title={t('محفظتي')} icon={Wallet} message={t('سجّل دخول عشان تشوف محفظتك.')} />;

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={t('محفظتي')} />
      <div className="flex flex-col gap-3 px-4">
        {wallet.isLoading ? (
          <Loading />
        ) : wallet.isError || !wallet.data ? (
          <ErrorView message={(wallet.error as Error)?.message ?? t('حصل خطأ')} onRetry={() => wallet.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-card bg-gradient-to-br from-brand-light to-brand p-5 text-white">
              <Wallet className="size-11 shrink-0" />
              <div>
                <p className="text-white/75">{t('رصيدك')}</p>
                <p className="text-3xl font-black">{formatPrice(wallet.data.balance)}</p>
              </div>
            </div>
            <SoftCard className="flex items-start gap-2 p-4 text-ink-2">
              <Info className="mt-0.5 size-5 shrink-0 text-brand-ink" />
              {t('تقدر تدفع بيه في طلبك الجاي من صفحة تأكيد الطلب.')}
            </SoftCard>
            <SectionHeader title={t('الحركات')} />
            {wallet.data.entries.length === 0 ? (
              <EmptyView icon={Wallet} message={t('لسه مفيش حركات. لو رجعتلك فلوس من أوردر هتلاقيها هنا.')} />
            ) : (
              <SoftCard className="overflow-hidden">
                {wallet.data.entries.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </SoftCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const KINDS = {
  Refund: { Icon: RotateCcw, label: 'استرجاع من أوردر' },
  Adjustment: { Icon: Gift, label: 'من الإدارة' },
  OrderPayment: { Icon: ShoppingBag, label: 'دفعت بيها أوردر' },
  OrderPaymentReturned: { Icon: Undo2, label: 'رجعتلك من أوردر' },
} as const;

function EntryRow({ entry }: { entry: CustomerWalletEntry }) {
  const added = entry.amount >= 0;
  const color = added ? 'var(--color-success)' : 'var(--color-danger)';
  const { Icon, label } = KINDS[entry.kind] ?? KINDS.Adjustment;
  const details = [
    entry.orderNumber ? t('أوردر #{n}', { n: entry.orderNumber }) : null,
    entry.note,
    parseUtc(entry.createdUtc).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }),
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <Icon className="size-5" style={{ color }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{t(label)}</span>
        <span className="block text-xs text-ink-3">{details}</span>
      </span>
      <span dir="ltr" className="font-black" style={{ color }}>
        {added ? '+' : '−'} {formatPrice(Math.abs(entry.amount))}
      </span>
    </div>
  );
}
