import { Gift, Info, Redo2, ShoppingBag } from 'lucide-react';

import { useMyPoints } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, SectionHeader, SoftCard } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { formatPrice } from '@/lib/format';
import { currentLanguage, t } from '@/lib/i18n';
import { parseUtc } from '@/lib/notifications';
import { useAuth } from '@/store/auth';
import type { PointsTransaction } from '@/types';

/** The customer's points: balance, how to earn, and the history. */
export function PointsPage() {
  const signedIn = useAuth((s) => s.session !== null);
  const points = useMyPoints();

  if (!signedIn) return <LoginRequired title={t('نقاطي')} icon={Gift} message={t('سجّل دخول عشان تشوف نقاطك.')} />;

  const first = points.data?.pages[0];
  const items = points.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={t('نقاطي')} />
      <div className="flex flex-col gap-3 px-4">
        {points.isLoading ? (
          <Loading />
        ) : points.isError || !first ? (
          <ErrorView message={(points.error as Error)?.message ?? t('حصل خطأ')} onRetry={() => points.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-card bg-gradient-to-br from-brand-light to-brand p-5 text-white">
              <Gift className="size-11 shrink-0" />
              <div>
                <p className="text-white/75">{t('رصيد نقاطك')}</p>
                <p className="text-3xl font-black">{t('{n} نقطة', { n: first.balance })}</p>
              </div>
            </div>
            <SoftCard className="p-4">
              <p className="flex items-center gap-2 font-extrabold text-ink">
                <Info className="size-5 text-brand-ink" />
                {t('إزاي تكسب نقط')}
              </p>
              <p className="mt-2 leading-relaxed text-ink-2">
                {first.rule.isEnabled
                  ? t('أي أوردر إجماليه {p} أو أكتر بيكسبك {n} نقطة أول ما يوصلك.', {
                      p: formatPrice(first.rule.minOrderTotal),
                      n: first.rule.pointsPerOrder,
                    })
                  : t('كسب النقط متوقف دلوقتي. نقاطك محفوظة.')}
              </p>
              <p className="mt-1.5 text-[13px] text-ink-3">{t('قريب هتقدر تستخدم نقاطك في خصومات وهدايا.')}</p>
            </SoftCard>
            <SectionHeader title={t('السجل')} />
            {items.length === 0 ? (
              <EmptyView icon={Gift} message={t('لسه مكسبتش نقط')} />
            ) : (
              <SoftCard className="overflow-hidden">
                {items.map((x) => (
                  <HistoryRow key={x.id} item={x} />
                ))}
              </SoftCard>
            )}
            {points.hasNextPage && (
              <Button variant="ghost" loading={points.isFetchingNextPage} onClick={() => points.fetchNextPage()}>
                {t('اعرض أقدم')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function HistoryRow({ item }: { item: PointsTransaction }) {
  const added = item.points > 0;
  const color = added ? 'var(--color-success)' : 'var(--color-danger)';
  const Icon = item.kind === 'OrderReward' ? ShoppingBag : Redo2;
  const title =
    item.kind === 'OrderReward'
      ? t('أوردر #{n}', { n: item.orderNumber ?? '' })
      : (item.reason ?? (added ? t('نقط من الإدارة') : t('خصم من الإدارة')));

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <Icon className="size-5" style={{ color }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{title}</span>
        <span className="block text-xs text-ink-3">
          {parseUtc(item.createdUtc).toLocaleDateString({ ar: 'ar-EG', en: 'en-GB', ru: 'ru-RU' }[currentLanguage()], { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </span>
      <span dir="ltr" className="text-lg font-black" style={{ color }}>
        {added ? '+' : ''}
        {item.points}
      </span>
    </div>
  );
}
