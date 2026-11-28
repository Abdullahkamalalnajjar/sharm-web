import {
  Bike,
  ChevronLeft,
  FileText,
  Gift,
  LogOut,
  MapPin,
  Pencil,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { profileApi } from '@/api';
import { useMyOrders, useMyPoints, useMyProfile, useMyWallet } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { SoftCard } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { displayName } from '@/lib/display-name';
import { formatPrice } from '@/lib/format';
import { t, useLanguage } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import { confirm } from '@/store/ui';

const ROLE_LABEL = { customer: 'زبون', storeOwner: 'صاحب محل', admin: 'أدمن', driver: 'مندوب', cashier: 'كاشير' } as const;

/** The legal pages on the website, in the reader's language. */
const legal = (path: string, lang: string) => `https://maridegypt.com/${path}${path === 'refund' ? (lang === 'ar' ? '#ar' : '#en') : `?lang=${lang}`}`;

/** Like the apps' "My account": who, the numbers, then grouped menus, legal pages, sign out and delete. */
export function AccountPage() {
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const isCustomer = session?.role === 'customer';
  const profile = useMyProfile(!!session);
  const wallet = useMyWallet();
  const points = useMyPoints();
  const orders = useMyOrders();
  const lang = useLanguage((s) => s.language);

  if (!session) {
    return <LoginRequired title={t('حسابي')} icon={UserRound} message={t('أهلاً بيك في MARID Egypt 👋\nسجّل دخول أو اعمل حساب جديد في ثانية.')} />;
  }

  const name = displayName(profile.data?.fullName, session.email) ?? t('عميلنا');
  const phone = profile.data?.phoneNumber;

  async function deleteAccount() {
    const ok = await confirm(
      t(
        'هتمسح حسابك وبياناتك الشخصية (الإيميل، الاسم، الموبايل، العناوين) نهائياً، ومش هتقدر ترجّعه. طلباتك القديمة بتفضل محفوظة من غير بياناتك.',
      ),
      t('امسح حسابي'),
    );
    if (!ok) return;
    if (await runAction(() => profileApi.deleteAccount(), t('حسابك اتمسح'))) {
      logout();
      navigate('/');
    }
  }

  const open = (url: string) => window.open(url, '_blank', 'noopener');

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <TabHeader title={t('حسابي')} />

      {/* Burgundy card: initial, name, email, phone, edit, and the customer's numbers. */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-brand-light via-brand to-brand-dark p-4 text-white shadow-brand">
        <span className="pointer-events-none absolute -top-14 -end-12 size-44 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-3.5">
          <span className="grid size-[62px] shrink-0 place-items-center rounded-full border-2 border-accent bg-white/15 text-2xl font-black">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{name}</p>
            <p className="truncate text-[12.5px] text-white/80" dir="ltr">
              {session.email}
            </p>
            {phone && (
              <p className="text-[12.5px] text-white/80" dir="ltr">
                {phone}
              </p>
            )}
            {!isCustomer && <span className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{t(ROLE_LABEL[session.role])}</span>}
          </div>
          <button
            type="button"
            aria-label={t('تعديل الحساب')}
            onClick={() => navigate('/account/profile')}
            className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <Pencil className="size-5" />
          </button>
        </div>
        {isCustomer && (
          <div className="relative mt-3.5 grid grid-cols-3 gap-2">
            <Stat icon={ReceiptText} value={orders.data ? String(orders.data.length) : '—'} label={t('طلباتي')} onClick={() => navigate('/orders')} />
            <Stat icon={Gift} value={points.data?.pages[0] ? String(points.data.pages[0].balance) : '—'} label={t('نقاطي')} onClick={() => navigate('/points')} />
            <Stat icon={Wallet} value={wallet.data ? formatPrice(wallet.data.balance) : '—'} label={t('محفظتي')} onClick={() => navigate('/wallet')} />
          </div>
        )}
      </div>

      <GroupTitle text={t('حسابي')} />
      <Group>
        {isCustomer && (
          <>
            <Tile icon={MapPin} title={t('عناويني')} subtitle={t('أضف أو عدّل أماكن التوصيل')} onClick={() => navigate('/addresses')} />
            <Tile icon={Sparkles} title={t('طلب خاص')} subtitle={t('اطلب أي حاجة من خارج المنيو')} onClick={() => navigate('/custom-order')} />
          </>
        )}
        {session.role === 'storeOwner' && <Tile icon={Store} title={t('محلاتي')} subtitle={t('إدارة المحلات والمنيو')} onClick={() => navigate('/owner')} />}
        {session.role === 'driver' && <Tile icon={Bike} title={t('أوردراتي')} subtitle={t('الأوردرات اللي معاك دلوقتي')} onClick={() => navigate('/driver')} />}
        <Tile icon={UserRound} title={t('تعديل الحساب')} subtitle={t('تغيير الاسم ورقم الهاتف')} onClick={() => navigate('/account/profile')} />
      </Group>

      <GroupTitle text={t('عن مارد')} />
      <Group>
        <Tile icon={ShieldCheck} title={t('سياسة الخصوصية')} onClick={() => open(legal('privacy', lang))} />
        <Tile icon={FileText} title={t('شروط الاستخدام')} onClick={() => open(legal('terms', lang))} />
        <Tile icon={RefreshCcw} title={t('سياسة الاسترداد والإلغاء')} onClick={() => open(legal('refund', lang))} />
      </Group>

      <div className="mt-4" />
      <Group>
        <Tile
          icon={LogOut}
          title={t('تسجيل الخروج')}
          danger
          onClick={() => {
            logout();
            navigate('/');
          }}
        />
        <Tile icon={Trash2} title={t('حذف الحساب')} subtitle={t('امسح حسابك وبياناتك نهائياً')} danger onClick={deleteAccount} />
      </Group>
    </div>
  );
}

function Stat({ icon: Icon, value, label, onClick }: { icon: LucideIcon; value: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center rounded-2xl bg-white/15 px-1.5 py-2.5 hover:bg-white/25">
      <Icon className="size-[18px] text-accent" />
      <span className="mt-1 max-w-full truncate text-[15px] font-black">{value}</span>
      <span className="text-[11px] text-white/80">{label}</span>
    </button>
  );
}

function GroupTitle({ text }: { text: string }) {
  return <p className="mx-2 mb-2 mt-5 text-[13px] font-extrabold text-ink-3">{text}</p>;
}

function Group({ children }: { children: React.ReactNode }) {
  return <SoftCard className="overflow-hidden">{children}</SoftCard>;
}

function Tile({ icon: Icon, title, subtitle, onClick, danger }: { icon: LucideIcon; title: string; subtitle?: string; onClick: () => void; danger?: boolean }) {
  const color = danger ? 'var(--color-danger)' : 'var(--color-ink)';
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 border-b border-line px-4 py-3.5 text-start last:border-0 hover:bg-surface-alt">
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: danger ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)' : 'color-mix(in srgb, var(--color-brand) 12%, transparent)' }}>
        <Icon className="size-5" style={{ color: danger ? 'var(--color-danger)' : 'var(--color-brand)' }} />
      </span>
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
