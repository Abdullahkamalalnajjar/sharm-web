import clsx from 'clsx';
import { Bike, Download, Instagram, Facebook, MessageCircle, Phone, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { APP_LINKS, CONTACT, SITE } from '@/lib/site';

const BANNER_KEY = 'sharm.appBanner.closed';

/** Brand mark: a rounded square with the bike. White on the red header, red elsewhere. */
export function BrandMark({ size = 36, red, className }: { size?: number; red?: boolean; className?: string }) {
  return (
    <span
      className={clsx('grid shrink-0 place-items-center rounded-[10px]', red ? 'bg-brand text-white shadow-brand' : 'bg-white text-brand', className)}
      style={{ width: size, height: size }}
    >
      <Bike style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={2.4} />
    </span>
  );
}

/** App-store badges: black pills in the style of the official ones. */
export function StoreBadges({ small, className }: { small?: boolean; className?: string }) {
  const badges = [
    { key: 'android', href: APP_LINKS.android, top: 'متاح على', name: 'Google Play' },
    { key: 'ios', href: APP_LINKS.ios, top: 'حمّله من', name: 'App Store' },
  ];
  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      {badges.map((b) => (
        <a
          key={b.key}
          href={b.href ?? '#get-app'}
          target={b.href ? '_blank' : undefined}
          rel={b.href ? 'noopener noreferrer' : undefined}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-[7px] border border-white/25 bg-black text-white transition-transform hover:-translate-y-px',
            small ? 'h-[30px] px-2' : 'h-10 px-2.5',
          )}
          dir="ltr"
        >
          <Smartphone className={small ? 'size-4' : 'size-5'} />
          <span className="flex flex-col leading-none text-left">
            <span className={clsx('font-medium', small ? 'text-[7px]' : 'text-[9px]')}>{b.top}</span>
            <span className={clsx('font-extrabold', small ? 'text-[11px]' : 'text-[14px]')}>{b.name}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

/** Black strip above the header asking to use the mobile app. Closable for the session. */
export function AppBanner() {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem(BANNER_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (closed) return null;
  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(BANNER_KEY, '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="bg-[#151515] text-white text-[0.76rem] sm:text-[0.85rem]" role="region" aria-label="حمّل التطبيق">
      <div className="container-site flex items-center gap-2.5 py-1.5 sm:py-2">
        <span className="grid size-[26px] sm:size-[30px] shrink-0 place-items-center rounded-[8px] sm:rounded-[9px] bg-brand">
          <Smartphone className="size-4" />
        </span>
        <strong className="min-w-0 flex-1 truncate font-bold">
          <span className="hidden sm:inline">اطلب من تطبيق {SITE.name}</span>
          <span className="sm:hidden">اطلب أسرع من تطبيق {SITE.name}</span>
        </strong>
        <a
          href="#get-app"
          className="lg:hidden inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-highlight px-2.5 py-1 text-[0.78rem] font-bold text-[#2b1d00] hover:brightness-105"
        >
          <Download className="size-3.5" />
          حمّل التطبيق
        </a>
        <StoreBadges small className="hidden lg:flex" />
        <button type="button" onClick={close} aria-label="إغلاق" className="shrink-0 p-1 opacity-80 hover:opacity-100">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-extrabold text-ink">{children}</h2>;
}

export function SiteFooter() {
  const contact = [
    CONTACT.phone && { icon: Phone, label: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}`, ltr: true },
    CONTACT.whatsapp && { icon: MessageCircle, label: 'واتساب', href: `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string; ltr?: boolean }[];
  const social = [
    CONTACT.facebook && { icon: Facebook, label: 'Facebook', href: CONTACT.facebook },
    CONTACT.instagram && { icon: Instagram, label: 'Instagram', href: CONTACT.instagram },
  ].filter(Boolean) as { icon: typeof Facebook; label: string; href: string }[];

  return (
    <footer id="get-app" className="mt-4 border-t border-line bg-surface pt-8 pb-4 scroll-mt-20">
      <div className="container-site">
        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
          <section className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <BrandMark size={40} red />
              <strong className="text-xl font-extrabold text-ink">{SITE.name}</strong>
            </div>
            <p className="mb-3 text-sm text-ink-2">{SITE.tagline}</p>
            <p className="mb-2 text-sm font-semibold text-ink">{SITE.footerNote}</p>
            <StoreBadges />
          </section>

          <section className="min-w-0">
            <FooterTitle>تواصل معانا</FooterTitle>
            {contact.length === 0 ? (
              <p className="text-sm text-ink-3">قريباً</p>
            ) : (
              <ul className="space-y-1.5">
                {contact.map((c) => (
                  <li key={c.href}>
                    <a href={c.href} className="inline-flex items-center gap-2 text-sm text-ink hover:text-brand-ink">
                      <c.icon className="size-4 text-ink-2" />
                      <span dir={c.ltr ? 'ltr' : undefined}>{c.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <FooterTitle>تابعنا</FooterTitle>
            {social.length === 0 ? (
              <p className="text-sm text-ink-3">قريباً</p>
            ) : (
              <div className="flex gap-2">
                {social.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-[42px] place-items-center rounded-xl text-brand-ink hover:bg-brand/30"
                    style={{ background: 'color-mix(in srgb, var(--color-brand) 20%, transparent)' }}
                  >
                    <s.icon className="size-5" />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 border-t border-line pt-4 text-center text-[13px] text-ink-2">
          <nav className="mb-2 flex flex-wrap justify-center gap-x-5 gap-y-2 font-semibold" aria-label="صفحات">
            <a href="#get-app" className="hover:text-brand-ink">
              حمّل تطبيق {SITE.name}
            </a>
            <Link to="/orders" className="hover:text-brand-ink">
              طلباتي
            </Link>
            <Link to="/addresses" className="hover:text-brand-ink">
              عناويني
            </Link>
            <Link to="/account" className="hover:text-brand-ink">
              حسابي
            </Link>
          </nav>
          <span>
            © {SITE.year} {SITE.name} — جميع الحقوق محفوظة
          </span>
        </div>
      </div>
    </footer>
  );
}
