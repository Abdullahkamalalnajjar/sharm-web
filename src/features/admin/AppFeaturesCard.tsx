import { DollarSign, Phone, Trash2, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { SoftCard, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';

/** The mobile apps' switches. Set here only (not in the apps), so they can't be found from an app. */
export interface AppFeatures {
  hideGoogleLogin: boolean;
  hidePhoneLogin: boolean;
  hideDeleteAccount: boolean;
  hidePrices: boolean;
}

const KEY = ['app-settings'] as const;

/**
 * Admin: hides things in the mobile apps at once, without a release. The apps read the switches when
 * they start, so an open app shows a change after it is reopened.
 */
export function AppFeaturesCard() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: KEY, queryFn: () => api.get<AppFeatures>('/api/app-settings') });
  const [busy, setBusy] = useState(false);
  const s = settings.data;

  async function save(next: AppFeatures) {
    setBusy(true);
    await runAction(async () => {
      const saved = await api.put<AppFeatures>('/api/admin/app-settings', next);
      qc.setQueryData(KEY, saved);
    }, t('الإعدادات اتحفظت'));
    setBusy(false);
  }

  const row = (icon: ReactNode, label: string, shownText: string, key: keyof AppFeatures) => (
    <div className="flex items-center gap-3 py-2">
      <span style={{ color: s?.[key] ? 'var(--color-danger)' : 'var(--color-ink-2)' }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{label}</p>
        <p className="text-xs text-ink-3">{s?.[key] ? t('مخفي دلوقتي') : shownText}</p>
      </div>
      <Switch checked={!!s?.[key]} disabled={!s || busy} onChange={(v) => s && save({ ...s, [key]: v })} label={label} />
    </div>
  );

  return (
    <SoftCard className="p-4">
      <span className="font-extrabold text-ink">{t('إعدادات التطبيق')}</span>
      <p className="mt-1 text-xs text-ink-3">
        {t('اللي تخفيه بيختفي من تطبيقات الموبايل من غير تحديث (بعد ما التطبيق يتقفل ويتفتح).')}
      </p>
      {settings.isError ? (
        <button type="button" className="mt-2 text-sm text-brand-ink" onClick={() => settings.refetch()}>
          {t('تعذّر التحميل، حاول تاني')}
        </button>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {row(<UserRound className="size-5" />, t('إخفاء الدخول بجوجل'), t('ظاهر في صفحة الدخول'), 'hideGoogleLogin')}
          {row(<Phone className="size-5" />, t('إخفاء الدخول برقم الموبايل'), t('ظاهر في صفحة الدخول'), 'hidePhoneLogin')}
          {row(<Trash2 className="size-5" />, t('إخفاء حذف الحساب'), t('ظاهر في حساب الزبون'), 'hideDeleteAccount')}
          {row(<DollarSign className="size-5" />, t('إخفاء الأسعار'), t('الأسعار والمحافظ ظاهرة لكل الحسابات'), 'hidePrices')}
        </div>
      )}
    </SoftCard>
  );
}
