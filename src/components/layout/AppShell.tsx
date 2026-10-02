import clsx from 'clsx';
import {
  BarChart3,
  Bike,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  ReceiptText,
  ShoppingBag,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useCart, useDeliveryLocation } from '@/api/queries';
import { DeliveryPicker } from '@/features/customer/DeliveryPicker';
import { SITE } from '@/lib/site';
import { useAuth } from '@/store/auth';
import { useBrowse } from '@/store/ui';
import type { AppRole } from '@/types';

import { LiveBanner, NotificationBell, useLiveNotifications } from './LiveNotifications';
import { ConfirmDialog, LoginPromptSheet, Toaster } from './Overlays';
import { AppBanner, BrandMark, SiteFooter } from './SiteChrome';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badgeKey?: 'cart';
  /** Shown in the desktop header only (the phone bar stays at four tabs). */
  desktopOnly?: boolean;
  /** The raised red button in the middle of the phone bar. */
  raised?: boolean;
}

const NAV: Record<AppRole, NavItem[]> = {
  customer: [
    { to: '/', label: 'الرئيسية', icon: Home, end: true },
    { to: '/orders', label: 'طلباتي', icon: ReceiptText },
    { to: '/cart', label: 'السلة', icon: ShoppingBag, badgeKey: 'cart', raised: true },
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

/** Header button showing where we deliver; opens the delivery-location sheet. */
function AreaButton() {
  const { location } = useDeliveryLocation();
  const setPickerOpen = useBrowse((s) => s.setPickerOpen);
  return (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      aria-label="تغيير مكان التوصيل"
      className="inline-flex min-w-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[1.05rem] font-extrabold text-white hover:bg-white/12 lg:mx-0 mx-auto"
    >
      <MapPin className="size-5 shrink-0 text-accent" fill="currentColor" stroke="var(--color-brand)" strokeWidth={1.5} />
      <span className="truncate max-w-[42vw] sm:max-w-[260px]">{location?.title ?? '...'}</span>
      <ChevronDown className="size-4 shrink-0 opacity-90" />
    </button>
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
  const pickerOpen = useBrowse((s) => s.pickerOpen);
  const setPickerOpen = useBrowse((s) => s.setPickerOpen);
  const isCustomer = role === 'customer';
  const isHome = location.pathname === '/';
  useLiveNotifications();

  // Nested pages (store, order, checkout) keep the bar but never own an active tab.
  const showBar =
    items.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))) || isHome;

  return (
    <div className="min-h-dvh flex flex-col">
      {isCustomer && <AppBanner />}

      {/* Red top bar */}
      <header className="sticky top-0 z-30 bg-brand text-white shadow-[0_2px_10px_rgb(205_24_61/0.25)]">
        <div className="container-site flex min-h-[60px] items-center gap-2">
          <NavLink to={isCustomer ? '/' : items[0].to} className="flex shrink-0 items-center gap-2 font-extrabold text-white" aria-label={SITE.name}>
            <BrandMark />
            <span className="hidden text-[1.1rem] lg:inline">{SITE.name}</span>
          </NavLink>

          {isCustomer && <AreaButton />}

          <nav className="hidden items-center gap-0.5 lg:flex ms-1" aria-label="الرئيسية">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[0.9rem] font-bold transition-colors',
                    isActive ? 'bg-white/16 text-white' : 'text-white/85 hover:bg-white/16 hover:text-white',
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

          <div className={clsx('flex items-center gap-1.5', isCustomer ? 'lg:ms-auto' : 'ms-auto')}>
            {isCustomer && (
              <NavLink
                to="/cart"
                aria-label="السلة"
                className="relative grid size-[38px] place-items-center rounded-[10px] border border-white/28 text-white hover:bg-white/15 lg:hidden"
              >
                <ShoppingBag className="size-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 grid min-w-5 h-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-black">
                    {cartCount}
                  </span>
                )}
              </NavLink>
            )}
            {session ? (
              <>
                <NotificationBell />
                <span className="hidden text-sm text-white/85 lg:inline" dir="ltr">
                  {session.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  aria-label="خروج"
                  title="خروج"
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-white/28 px-2.5 text-sm font-bold text-white hover:bg-white/15"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="inline-flex h-[38px] items-center rounded-[10px] border border-white/28 px-2.5 text-sm font-bold text-white hover:bg-white/15"
                >
                  دخول
                </NavLink>
                <NavLink
                  to="/signup"
                  className="hidden h-[38px] items-center rounded-[10px] bg-accent px-3 text-sm font-extrabold text-[#2b1d00] hover:bg-[#ffc233] sm:inline-flex"
                >
                  حساب جديد
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={clsx('flex-1 w-full', !isHome && 'mx-auto max-w-6xl', showBar && 'pb-28 md:pb-10')}>
        <Outlet />
      </main>

      {isCustomer && <SiteFooter />}

      {/* Phone bottom bar: floating card, the active tab's icon sits in a tinted pill. */}
      {showBar && (
        <nav
          className="md:hidden fixed inset-x-2 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 flex h-[68px] items-center justify-around rounded-[18px] border border-line bg-surface px-1 shadow-[0_6px_24px_rgb(0_0_0/0.35)]"
          aria-label="الرئيسية"
        >
          {items
            .filter((i) => !i.desktopOnly)
            .map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="flex h-full min-w-0 flex-1">
                {({ isActive }) => (
                  <span
                    className={clsx(
                      'flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.72rem] font-bold transition-colors',
                      isActive ? 'text-brand-light' : 'text-ink-2',
                    )}
                  >
                    {item.raised ? (
                      <span className="relative -mt-3.5 grid size-[50px] h-[46px] place-items-center rounded-[14px] bg-gradient-to-br from-brand-light via-brand to-brand-dark text-white shadow-brand animate-bn-pulse">
                        <item.icon className="size-6" />
                        {item.badgeKey === 'cart' && cartCount > 0 && (
                          <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 rounded-[7px] border-2 border-surface bg-[#E0103A] px-1.5 text-[0.6rem] font-extrabold leading-[1.5] text-white">
                            {cartCount}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span
                        className={clsx(
                          'grid w-12 place-items-center rounded-xl transition-all',
                          isActive ? 'h-12 bg-brand/15' : 'h-8',
                        )}
                      >
                        <item.icon className="size-[22px]" />
                      </span>
                    )}
                    {(!isActive || item.raised) && <span className="max-w-full truncate">{item.label}</span>}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
      )}

      {isCustomer && <DeliveryPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />}
      <LiveBanner />
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
    <div className="sticky top-[60px] md:static z-20 bg-bg/90 backdrop-blur px-4 pt-2.5 pb-2 md:pt-4">
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
    <div className="px-4 pt-3.5 pb-2 md:pt-6 flex items-center min-h-12">
      <h1 className="text-xl font-extrabold text-ink flex-1 text-center md:text-start">{title}</h1>
      {actions}
    </div>
  );
}
