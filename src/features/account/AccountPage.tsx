import { Bike, ChevronLeft, Gift, LogOut, MapPin, ReceiptText, Sparkles, Store, UserRound, Wallet, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useMyWallet } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { IconWell, SoftCard, StatusChip } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useAuth } from '@/store/auth';

const ROLE_LABEL = { customer: 'زبون', storeOwner: 'صاحب محل', admin: 'أدمن', driver: 'مندوب', cashier: 'كاشير' } as const;

export function AccountPage() {
  const wallet = useMyWallet();
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  if (!session) {
    return <LoginRequired title={t('حسابي')} icon={UserRound} message={t('أهلاً بيك في MARID Egypt 👋\nسجّل دخول أو اعمل حساب جديد في ثانية.')} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <TabHeader title={t('حسابي')} />
      <SoftCard className="flex flex-col items-center p-5">
        <span className="grid size-[84px] place-items-center rounded-full bg-brand text-white">
          <UserRound className="size-11" />
        </span>
        <p className="mt-3.5 font-bold text-ink" dir="ltr">
          {session.email}
        </p>
        <div className="mt-2.5">
          <StatusChip label={t(ROLE_LABEL[session.role])} color="var(--color-brand)" />
        </div>
      </SoftCard>

      <SoftCard className="mt-4 overflow-hidden">
        {session.role === 'customer' && (
          <>
            <Tile icon={Sparkles} title={t('طلب خاص')} subtitle={t('اطلب أي حاجة من خارج المنيو')} onClick={() => navigate('/custom-order')} />
            <Tile icon={MapPin} title={t('عناويني')} subtitle={t('أضف أو عدّل أماكن التوصيل')} onClick={() => navigate('/addresses')} />
            <Tile icon={ReceiptText} title={t('طلباتي')} subtitle={t('تابع طلباتك الحالية والسابقة')} onClick={() => navigate('/orders')} />
            <Tile icon={Gift} title={t('نقاطي')} subtitle={t('اكسب نقط مع كل أوردر')} onClick={() => navigate('/points')} />
            <Tile
              icon={Wallet}
              title={t('محفظتي')}
              subtitle={wallet.data ? t('رصيدك {amount}', { amount: formatPrice(wallet.data.balance) }) : t('الفلوس اللي بترجعلك من الطلبات')}
              onClick={() => navigate('/wallet')}
            />
          </>
        )}
        {session.role === 'storeOwner' && <Tile icon={Store} title={t('محلاتي')} subtitle={t('إدارة المحلات والمنيو')} onClick={() => navigate('/owner')} />}
        {session.role === 'driver' && <Tile icon={Bike} title={t('أوردراتي')} subtitle={t('الأوردرات اللي معاك دلوقتي')} onClick={() => navigate('/driver')} />}
        <Tile
          icon={LogOut}
          title={t('تسجيل الخروج')}
          danger
          onClick={() => {
            logout();
            navigate('/');
          }}
        />
      </SoftCard>
    </div>
  );
}

function Tile({ icon, title, subtitle, onClick, danger }: { icon: LucideIcon; title: string; subtitle?: string; onClick: () => void; danger?: boolean }) {
  const color = danger ? 'var(--color-danger)' : 'var(--color-ink)';
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 border-b border-line last:border-0 px-4 py-4 text-start hover:bg-surface-alt">
      <IconWell icon={icon} color={color} />
      <span className="flex-1">
        <span className="block font-bold" style={{ color }}>
          {title}
        </span>
        {subtitle && <span className="block text-xs text-ink-2">{subtitle}</span>}
      </span>
      <ChevronLeft className="size-5 text-ink-3 rtl:rotate-0 ltr:-scale-x-100" />
    </button>
  );
}
