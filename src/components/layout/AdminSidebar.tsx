import clsx from 'clsx';
import {
  BarChart3,
  Bike,
  Flag,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  ReceiptText,
  Store,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { useAdminDashboard, useWalletsOverview } from '@/api/queries';
import { t, tIn } from '@/lib/i18n';

export interface AdminLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: 'orders' | 'stores' | 'withdrawals';
}

/** Every admin page, grouped. The sidebar (desktop) and the dashboard's shortcuts (phone) both use it. */
export const ADMIN_GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: 'نظرة عامة',
    links: [
      { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'الإحصائيات', icon: BarChart3 },
    ],
  },
  {
    title: 'التشغيل',
    links: [
      { to: '/admin/orders', label: 'الأوردرات', icon: ReceiptText, badge: 'orders' },
      { to: '/admin/drivers', label: 'المندوبين', icon: Bike },
    ],
  },
  {
    title: 'المحلات',
    links: [
      { to: '/admin/stores', label: 'المحلات', icon: Store, badge: 'stores' },
      { to: '/admin/categories', label: 'الأقسام', icon: LayoutGrid },
      { to: '/admin/ratings/reported', label: 'تقييمات مبلّغ عنها', icon: Flag },
    ],
  },
  {
    title: 'التسويق',
    links: [
      { to: '/admin/offers', label: 'العروض', icon: Gift },
      { to: '/admin/coupons', label: 'الكوبونات', icon: Ticket },
      { to: '/admin/announcements', label: 'إرسال إشعار', icon: Megaphone },
    ],
  },
  {
    title: 'الفلوس والناس',
    links: [
      { to: '/admin/finance', label: 'المالية', icon: Wallet, badge: 'withdrawals' },
      { to: '/admin/users', label: 'المستخدمين', icon: Users },
    ],
  },
];

/** What waits for the admin: new orders, stores to approve, withdrawals to pay. */
export function useAdminBadges(): Record<NonNullable<AdminLink['badge']>, number> {
  const d = useAdminDashboard().data;
  const w = useWalletsOverview().data;
  return {
    orders: d?.pendingOrders ?? 0,
    stores: d?.pendingStores ?? 0,
    withdrawals: w?.pendingWithdrawalsCount ?? 0,
  };
}

/** The admin's navigation on wide screens, beside the page. */
export function AdminSidebar() {
  const badges = useAdminBadges();
  return (
    <aside className="sticky top-[60px] hidden h-[calc(100dvh-60px)] w-60 shrink-0 overflow-y-auto border-e border-line bg-surface px-3 py-5 lg:block">
      <nav aria-label={t('لوحة التحكم')} className="flex flex-col gap-5">
        {ADMIN_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-extrabold tracking-wide text-ink-3">{t(group.title)}</p>
            <div className="flex flex-col gap-0.5">
              {group.links.map((link) => {
                const count = link.badge ? badges[link.badge] : 0;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      clsx(
                        'flex h-10 items-center gap-2.5 rounded-xl px-3 text-[14px] font-bold transition-colors',
                        isActive ? 'bg-brand/12 text-brand-ink' : 'text-ink-2 hover:bg-surface-alt hover:text-ink',
                      )
                    }
                  >
                    <link.icon className="size-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{tIn('nav', link.label)}</span>
                    {count > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-white">{count}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
