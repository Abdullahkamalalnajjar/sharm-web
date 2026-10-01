import clsx from 'clsx';
import {
  BarChart3,
  Bike,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShoppingBag,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useCart } from '@/api/queries';
import { useAuth } from '@/store/auth';
import type { AppRole } from '@/types';

import { ConfirmDialog, LoginPromptSheet, Toaster } from './Overlays';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badgeKey?: 'cart';
  /** Shown in the desktop header only (the phone bar stays at four tabs). */
  desktopOnly?: boolean;
}

const NAV: Record<AppRole, NavItem[]> = {
  customer: [
    { to: '/', label: 'الرئيسية', icon: Home, end: true },
    { to: '/cart', label: 'السلة', icon: ShoppingBag, badgeKey: 'cart' },
    { to: '/orders', label: 'طلباتي', icon: ReceiptText },
    { to: '/account', label: 'حسابي', icon: UserRound },
  ],
  storeOwner: [
    { to: '/owner', label: 'محلاتي', icon: Store, end: true },
    { to: '/account', label: 'حسابي', icon: UserRound },
  ],
  admin: [
    { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'الأوردرات', icon: ReceiptText },
    { to: '/admin/stores', label: 'المحلات', icon: Store },
    { to: '/admin/drivers', label: 'المندوبين', icon: Bike },
    { to: '/admin/reports', label: 'الإحصائيات', icon: BarChart3, desktopOnly: true },
  ],
  driver: [
    { to: '/driver', label: 'أوردراتي', icon: Bike, end: true },
    { to: '/account', label: 'حسابي', icon: UserRound },
  ],
};

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-brand">
        <Bike className="size-5" />
      </span>
      <span className="text-xl font-black text-ink leading-none">شرم</span>
    </div>
  );
}

export function AppShell() {
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const role: AppRole = session?.role ?? 'customer';
  const items = NAV[role];
  const cart = useCart();
  const cartCount = cart.data?.itemsCount ?? 0;

  // Nested pages (store, order, checkout) keep the bar but never own an active tab.
  const showBar = items.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))) ||
    location.pathname === '/';

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <NavLink to={role === 'customer' ? '/' : items[0].to}>
            <Brand />
          </NavLink>
          <nav className="flex items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'relative inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors',
                    isActive ? 'bg-surface-alt text-ink' : 'text-ink-2 hover:text-ink hover:bg-surface',
                  )
                }
              >
                <item.icon className="size-[18px]" />
                {item.label}
                {item.badgeKey === 'cart' && cartCount > 0 && (
                  <span className="grid min-w-5 h-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-black">
                    {cartCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <span className="flex-1" />
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-2" dir="ltr">
                {session.email}
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-surface"
              >
                <LogOut className="size-4" />
                خروج
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold text-ink hover:bg-surface">
                تسجيل الدخول
              </NavLink>
              <NavLink to="/signup" className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-brand hover:bg-brand-light">
                حساب جديد
              </NavLink>
            </div>
          )}
        </div>
      </header>

      <main className={clsx('flex-1 w-full mx-auto max-w-6xl', showBar && 'pb-28 md:pb-10')}>
        <Outlet />
      </main>

      {/* Phone bottom bar: charcoal pill, the active tab gets a red icon circle and its label. */}
      {showBar && (
        <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 bg-gradient-to-t from-bg via-bg/90 to-transparent">
          <div className="mx-auto flex h-[70px] max-w-md items-stretch rounded-[35px] border border-line bg-surface p-2 shadow-card">
            {items.filter((i) => !i.desktopOnly).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="flex-1 min-w-0 flex">
                {({ isActive }) => (
                  <span
                    className={clsx(
                      'flex flex-1 items-center justify-center gap-2 rounded-full transition-colors',
                      isActive && 'bg-surface-alt ps-1 pe-4 mx-auto',
                    )}
                  >
                    <span
                      className={clsx(
                        'relative grid place-items-center rounded-full transition-all',
                        isActive ? 'size-[46px] bg-brand text-white shadow-brand' : 'size-10 text-white/75',
                      )}
                    >
                      <item.icon className="size-6" />
                      {item.badgeKey === 'cart' && cartCount > 0 && (
                        <span className="absolute -top-1 -end-1 grid min-w-5 h-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-black">
                          {cartCount}
                        </span>
                      )}
                    </span>
                    {isActive && <span className="text-sm font-extrabold text-white whitespace-nowrap">{item.label}</span>}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <Toaster />
      <ConfirmDialog />
      <LoginPromptSheet />
    </div>
  );
}

/** Page header for nested screens: back arrow, centered title, optional actions. */
export function PageHeader({ title, actions, subtitle }: { title: string; actions?: React.ReactNode; subtitle?: string }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 md:static z-20 bg-bg/90 backdrop-blur px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2 md:pt-4">
      <div className="relative flex items-center justify-center min-h-11">
        <button
          type="button"
          aria-label="رجوع"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="absolute start-0 grid size-10 place-items-center rounded-full hover:bg-surface text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-6 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center px-12">
          <h1 className="text-lg font-extrabold text-ink truncate">{title}</h1>
          {subtitle && <p className="text-xs text-ink-3 font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="absolute end-0 flex items-center gap-1">{actions}</div>}
      </div>
    </div>
  );
}

/** Simple centered title for top-level tabs (no back arrow). */
export function TabHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2 md:pt-6 flex items-center min-h-12">
      <h1 className="text-xl font-extrabold text-ink flex-1 text-center md:text-start">{title}</h1>
      {actions}
    </div>
  );
}
