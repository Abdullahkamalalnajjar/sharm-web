import { Bike, ChevronLeft, LogOut, MapPin, ReceiptText, Store, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import { TabHeader } from '@/components/layout/AppShell';
import { IconWell, SoftCard, StatusChip } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { useAuth } from '@/store/auth';

const ROLE_LABEL = { customer: 'زبون', storeOwner: 'صاحب محل', admin: 'أدمن', driver: 'مندوب' } as const;

export function AccountPage() {
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  if (!session) {
    return <LoginRequired title="حسابي" icon={UserRound} message={'أهلاً بيك في شرم 👋\nسجّل دخول أو اعمل حساب جديد في ثانية.'} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <TabHeader title="حسابي" />
      <SoftCard className="flex flex-col items-center p-5">
        <span className="grid size-[84px] place-items-center rounded-full bg-brand text-white">
          <UserRound className="size-11" />
        </span>
        <p className="mt-3.5 font-bold text-ink" dir="ltr">
          {session.email}
        </p>
        <div className="mt-2.5">
          <StatusChip label={ROLE_LABEL[session.role]} color="var(--color-brand)" />
        </div>
      </SoftCard>

      <SoftCard className="mt-4 overflow-hidden">
        {session.role === 'customer' && (
          <>
            <Tile icon={MapPin} title="عناويني" subtitle="أضف أو عدّل أماكن التوصيل" onClick={() => navigate('/addresses')} />
            <Tile icon={ReceiptText} title="طلباتي" subtitle="تابع طلباتك الحالية والسابقة" onClick={() => navigate('/orders')} />
          </>
        )}
        {session.role === 'storeOwner' && <Tile icon={Store} title="محلاتي" subtitle="إدارة المحلات والمنيو" onClick={() => navigate('/owner')} />}
        {session.role === 'driver' && <Tile icon={Bike} title="أوردراتي" subtitle="الأوردرات اللي معاك دلوقتي" onClick={() => navigate('/driver')} />}
        <Tile
          icon={LogOut}
          title="تسجيل الخروج"
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
      <ChevronLeft className="size-5 text-ink-3 rtl:rotate-0" />
    </button>
  );
}
