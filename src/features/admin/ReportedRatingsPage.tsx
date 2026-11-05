import { Flag } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ratingModerationApi } from '@/api';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, SoftCard } from '@/components/ui';
import { Stars } from '@/features/ratings/Ratings';
import { dateLocale } from '@/lib/format';
import { t } from '@/lib/i18n';
import { parseUtc } from '@/lib/notifications';
import { runAction } from '@/lib/run-action';
import { confirm } from '@/store/ui';
import type { ReportedRating } from '@/types';

const reportedKey = ['admin', 'ratings', 'reported'] as const;

/** Reviews customers reported (their comment is hidden): keep the comment, or delete the review. */
export function ReportedRatingsPage() {
  const list = useQuery({ queryKey: reportedKey, queryFn: () => ratingModerationApi.reported() });
  const qc = useQueryClient();

  async function act(r: ReportedRating, remove: boolean) {
    if (remove && !(await confirm(t('تمسح التقييم ده؟ متوسط تقييم المحل هيتحسب من غيره.'), t('امسح')))) return;
    const ok = await runAction(
      () => (remove ? ratingModerationApi.remove(r.id) : ratingModerationApi.restore(r.id)),
      remove ? t('التقييم اتمسح') : t('التعليق رجع يظهر'),
    );
    if (ok) {
      qc.invalidateQueries({ queryKey: reportedKey });
      qc.invalidateQueries({ queryKey: ['stores', 'ratings', r.storeId] });
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={t('تقييمات مبلّغ عنها')} />
      <div className="flex flex-col gap-2.5 px-4">
        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorView message={(list.error as Error).message} onRetry={() => list.refetch()} />
        ) : !list.data?.length ? (
          <EmptyView icon={Flag} message={t('مفيش بلاغات')} />
        ) : (
          list.data.map((r) => (
            <SoftCard key={r.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-extrabold text-ink">{r.storeName}</span>
                <Stars value={r.stars} />
              </div>
              <p className="leading-relaxed text-ink">{r.comment ?? '—'}</p>
              <p className="text-xs text-ink-3">
                {t('{n} بلاغ • التعليق مخفي دلوقتي', { n: r.reportsCount })} ·{' '}
                {parseUtc(r.createdUtc).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <Button size="md" variant="outline" onClick={() => act(r, false)}>
                  {t('سيبه يظهر')}
                </Button>
                <Button size="md" variant="danger" onClick={() => act(r, true)}>
                  {t('امسح التقييم')}
                </Button>
              </div>
            </SoftCard>
          ))
        )}
      </div>
    </div>
  );
}
