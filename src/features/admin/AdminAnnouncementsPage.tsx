import clsx from 'clsx';
import { Bell, Bike, ChevronRight, Gift, Globe, Megaphone, Search, Send, Store, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { useAdminOffers, useAdminStores } from '@/api/queries';
import { Button, InlineError, Loading, Sheet, SoftCard, TextArea, TextField } from '@/components/ui';
import { t, tIn } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';

type Audience = 'Customers' | 'StoreOwners' | 'Drivers' | 'Everyone' | 'OneUser';
type Link = 'None' | 'Store' | 'Offer';

const AUDIENCES: { value: Audience; label: string; icon: LucideIcon; color: string; roles: string[] | null }[] = [
  { value: 'Customers', label: 'كل العملاء', icon: Users, color: 'var(--color-series-1)', roles: ['Member'] },
  { value: 'StoreOwners', label: 'المحلات', icon: Store, color: 'var(--color-accent)', roles: ['StoreOwner'] },
  { value: 'Drivers', label: 'المناديب', icon: Bike, color: 'var(--color-success)', roles: ['Driver'] },
  { value: 'Everyone', label: 'الكل', icon: Globe, color: 'var(--color-brand)', roles: [] },
  { value: 'OneUser', label: 'شخص واحد', icon: UserRound, color: 'var(--color-warning)', roles: null },
];

const LINKS: { value: Link; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'None', label: 'صفحة الإشعارات', hint: 'من غير لينك', icon: Bell },
  { value: 'Store', label: 'محل', hint: 'يفتح المنيو بتاعه', icon: Store },
  { value: 'Offer', label: 'عرض', hint: 'يفتح العرض', icon: Gift },
];

const TITLE_MAX = 80;
const BODY_MAX = 500;

/** An account in the admin's list (GET /api/admin/users). */
interface AdminUser {
  userId: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: string;
}

/** A store's or an offer's id and name, picked as the link. */
interface Target {
  id: number;
  name: string;
}

const ROLE_LABEL: Record<string, string> = {
  Member: 'عميل',
  StoreOwner: 'صاحب محل',
  StoreEmployee: 'كاشير',
  Driver: 'مندوب',
  Staff: 'موظف',
  Manager: 'أدمن',
};

/** The name to show for an account: its name, else its phone, else its email. */
const titleOf = (u: AdminUser) => u.fullName?.trim() || u.phoneNumber || u.email;

const usersQuery = { queryKey: ['admin', 'users'], queryFn: () => api.get<AdminUser[]>('/api/admin/users') };

/**
 * The admin writes a notification and sends it: it rings on the phones (push) and stays in the in-app inbox.
 * A tap can open a store's menu or an offer.
 */
export function AdminAnnouncementsPage() {
  const [audience, setAudience] = useState<Audience>('Customers');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [link, setLink] = useState<Link>('None');
  const [target, setTarget] = useState<Target | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [picker, setPicker] = useState<'user' | 'target' | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Roughly how many accounts each audience reaches (the server counts the real recipients).
  const users = useQuery(usersQuery);
  const reach = (a: (typeof AUDIENCES)[number]): number | null => {
    if (!users.data || a.roles === null) return null;
    return a.roles.length === 0 ? users.data.length : users.data.filter((u) => a.roles!.includes(u.role)).length;
  };

  const chosen = AUDIENCES.find((a) => a.value === audience)!;
  const who = audience === 'OneUser' ? (user ? titleOf(user) : null) : t(chosen.label);
  const opens = link === 'None' ? t('صفحة الإشعارات') : (target?.name ?? null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return setError(t('اكتب العنوان والنص'));
    if (audience === 'OneUser' && !user) return setError(t('اختار الشخص الأول'));
    if (link !== 'None' && !target) return setError(link === 'Store' ? t('اختار المحل الأول') : t('اختار العرض الأول'));
    setError(null);

    if (!(await confirm(t('تبعت الإشعار لـ "{w}"؟', { w: who! }), t('ابعت')))) return;

    setSending(true);
    let count = 0;
    const ok = await runAction(async () => {
      const result = await api.post<{ recipients: number }>('/api/admin/announcements', {
        audience,
        title: title.trim(),
        body: body.trim(),
        userId: audience === 'OneUser' ? user!.userId : null,
        link,
        linkId: link === 'None' ? null : target!.id,
      });
      count = result.recipients;
    });
    setSending(false);
    if (ok) {
      setError(null);
      setTitle('');
      setBody('');
      showMessage(t('الإشعار اتبعت لـ {n} حساب', { n: count }));
    }
  }

  const sendButton = (
    <Button type="submit" size="lg" block loading={sending} icon={<Send className="size-5" />}>
      {t('ابعت الإشعار')}
    </Button>
  );

  return (
    <div className="pb-28 md:pb-8">
      <div className="px-4 pt-[max(env(safe-area-inset-top),10px)] md:pt-6">
        <h1 className="text-xl font-extrabold text-ink md:text-2xl">{t('إرسال إشعار')}</h1>
        <p className="text-[13px] font-medium text-ink-3">{t('بيرن على الموبايل وبيفضل في صفحة الإشعارات جوه الأبلكيشن')}</p>
      </div>

      <form onSubmit={submit} className="grid items-start gap-4 px-4 pt-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4">
          <Step n={1} title={t('لمين؟')}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {AUDIENCES.map((a) => {
                const selected = audience === a.value;
                const n = reach(a);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAudience(a.value)}
                    aria-pressed={selected}
                    className={clsx(
                      'flex items-center gap-3 rounded-2xl border p-3 text-start transition-colors',
                      selected ? 'border-brand bg-brand/8 ring-1 ring-brand' : 'border-line hover:bg-surface-alt',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${a.color} 15%, transparent)`, color: a.color }}>
                      <a.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-ink">{t(a.label)}</span>
                      <span className="block truncate text-xs text-ink-3 tabular-nums">
                        {n !== null ? t('{n} حساب', { n }) : a.value === 'OneUser' ? t('اختار بالاسم') : '…'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {audience === 'OneUser' && (
              <PickRow
                icon={UserRound}
                text={user ? titleOf(user) : t('اختار الشخص')}
                sub={user ? [t(ROLE_LABEL[user.role] ?? user.role), user.phoneNumber].filter(Boolean).join(' • ') : undefined}
                onClick={() => setPicker('user')}
              />
            )}
          </Step>

          <Step n={2} title={t('الرسالة')}>
            <div className="flex flex-col gap-3">
              <div>
                <TextField label={t('عنوان الإشعار')} value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
                <Counter n={title.length} max={TITLE_MAX} />
              </div>
              <div>
                <TextArea label={t('نص الإشعار')} value={body} maxLength={BODY_MAX} rows={5} onChange={(e) => setBody(e.target.value)} />
                <Counter n={body.length} max={BODY_MAX} />
              </div>
              <p className="text-xs text-ink-3">{t('بيتبعت زي ما هو مكتوب، من غير ترجمة.')}</p>
            </div>
          </Step>

          <Step n={3} title={t('لما يضغط عليه يفتح:')}>
            <div className="grid grid-cols-3 gap-2.5">
              {LINKS.map((l) => {
                const selected = link === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (link !== l.value) setTarget(null);
                      setLink(l.value);
                    }}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors',
                      selected ? 'border-brand bg-brand/8 ring-1 ring-brand' : 'border-line hover:bg-surface-alt',
                    )}
                  >
                    <l.icon className={clsx('size-5', selected ? 'text-brand-ink' : 'text-ink-2')} />
                    <span className="text-sm font-extrabold text-ink">{t(l.label)}</span>
                    <span className="hidden text-[11px] text-ink-3 sm:block">{t(l.hint)}</span>
                  </button>
                );
              })}
            </div>
            {link !== 'None' && (
              <PickRow
                icon={link === 'Store' ? Store : Gift}
                text={target?.name ?? (link === 'Store' ? t('اختار المحل') : t('اختار العرض'))}
                onClick={() => setPicker('target')}
              />
            )}
          </Step>

          {error && <InlineError message={error} />}
          <div className="lg:hidden">{sendButton}</div>
        </div>

        {/* What the phone will show, and a summary before sending. */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-[76px]">
          <SoftCard className="overflow-hidden">
            <p className="border-b border-line px-4 py-2.5 text-xs font-extrabold text-ink-3">{t('شكل الإشعار على الموبايل')}</p>
            <div className="bg-gradient-to-br from-brand-dark via-brand to-brand-light p-4">
              <div className="rounded-2xl bg-white/92 p-3 text-black shadow-lg backdrop-blur dark:bg-white/90">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="" className="size-5 rounded-[5px]" />
                  <span className="text-[11.5px] font-bold uppercase tracking-wide text-black/60">MARID Egypt</span>
                  <span className="ms-auto text-[11px] text-black/45">{t('دلوقتي')}</span>
                </div>
                <p className={clsx('mt-1.5 text-[14px] font-extrabold leading-snug', !title.trim() && 'text-black/35')}>{title.trim() || t('عنوان الإشعار')}</p>
                <p className={clsx('mt-0.5 line-clamp-4 whitespace-pre-line text-[13px] leading-snug', body.trim() ? 'text-black/75' : 'text-black/35')}>
                  {body.trim() || t('نص الإشعار')}
                </p>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-line">
              <Summary icon={chosen.icon} label={t('لمين')} value={who} />
              <Summary icon={link === 'None' ? Bell : link === 'Store' ? Store : Gift} label={tIn('announce', 'بيفتح')} value={opens} />
            </div>
          </SoftCard>
          <div className="hidden lg:block">{sendButton}</div>
        </div>
      </form>

      <UserPicker
        open={picker === 'user'}
        onClose={() => setPicker(null)}
        onPick={(u) => {
          setUser(u);
          setPicker(null);
        }}
      />
      <TargetPicker
        open={picker === 'target'}
        link={link}
        onClose={() => setPicker(null)}
        onPick={(x) => {
          setTarget(x);
          setPicker(null);
        }}
      />
    </div>
  );
}

/** A numbered section of the form. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <SoftCard className="p-4">
      <h2 className="mb-3 flex items-center gap-2 font-extrabold text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-brand text-[12px] font-extrabold text-white tabular-nums">{n}</span>
        {title}
      </h2>
      {children}
    </SoftCard>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return <p className={clsx('mt-1 text-end text-[11px] tabular-nums', n >= max ? 'text-danger' : 'text-ink-3')}>{`${n}/${max}`}</p>;
}

function Summary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="size-[18px] shrink-0 text-ink-3" />
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className={clsx('ms-auto min-w-0 truncate text-[13px] font-bold', value ? 'text-ink' : 'text-warning')}>{value ?? t('لسه مختارتش')}</span>
    </div>
  );
}

function PickRow({ icon: Icon, text, sub, onClick }: { icon: LucideIcon; text: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand/50 bg-brand/5 p-3.5 text-start transition-colors hover:bg-brand/10"
    >
      <Icon className="size-5 shrink-0 text-brand-ink" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{text}</span>
        {sub && <span className="block truncate text-xs text-ink-2">{sub}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3 rtl:-scale-x-100" />
    </button>
  );
}

/** Search every account and pick one. */
function UserPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (u: AdminUser) => void }) {
  const [q, setQ] = useState('');
  const users = useQuery({ ...usersQuery, enabled: open });
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users.data ?? [])
      .filter((u) => !s || [u.fullName, u.email, u.phoneNumber].some((f) => f?.toLowerCase().includes(s)))
      .slice(0, 100);
  }, [users.data, q]);

  return (
    <Sheet open={open} onClose={onClose} title={t('اختار الشخص')}>
      <TextField
        autoFocus
        start={<Search className="size-4" />}
        placeholder={t('دوّر بالاسم أو الموبايل أو الإيميل')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {users.isLoading ? (
        <Loading />
      ) : (
        <div className="mt-2 flex flex-col">
          {list.map((u) => (
            <button
              key={u.userId}
              type="button"
              onClick={() => onPick(u)}
              className="flex flex-col items-start border-b border-line px-1 py-2.5 text-start hover:bg-surface-alt"
            >
              <span className="font-bold text-ink">{titleOf(u)}</span>
              <span className="text-xs text-ink-2">{[t(ROLE_LABEL[u.role] ?? u.role), u.phoneNumber].filter(Boolean).join(' • ')}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/** Search the stores or the offers and pick one. */
function TargetPicker({
  open,
  link,
  onClose,
  onPick,
}: {
  open: boolean;
  link: Link;
  onClose: () => void;
  onPick: (t: Target) => void;
}) {
  const [q, setQ] = useState('');
  const stores = useAdminStores();
  const offers = useAdminOffers();
  const all: Target[] =
    link === 'Store'
      ? (stores.data ?? []).map((s) => ({ id: s.id, name: s.name }))
      : (offers.data ?? []).map((o) => ({ id: o.id, name: o.title }));
  const loading = link === 'Store' ? stores.isLoading : offers.isLoading;
  const s = q.trim().toLowerCase();
  const list = all.filter((x) => !s || x.name.toLowerCase().includes(s));

  return (
    <Sheet open={open} onClose={onClose} title={link === 'Store' ? t('اختار المحل') : t('اختار العرض')}>
      <TextField
        autoFocus
        start={<Search className="size-4" />}
        placeholder={t('دوّر بالاسم')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <Loading />
      ) : (
        <div className="mt-2 flex flex-col">
          {list.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => onPick(x)}
              className="flex items-center gap-2 border-b border-line px-1 py-3 text-start font-bold text-ink hover:bg-surface-alt"
            >
              {link === 'Store' ? <Store className="size-4 text-ink-3" /> : <Megaphone className="size-4 text-ink-3" />}
              {x.name}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
