import { Bell, Bike, Gift, Globe, Megaphone, Search, Send, Store, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { useAdminOffers, useAdminStores } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, InlineError, Loading, Sheet, SoftCard, TextArea, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';
import { runAction } from '@/lib/run-action';
import { confirm, showMessage } from '@/store/ui';

type Audience = 'Customers' | 'StoreOwners' | 'Drivers' | 'Everyone' | 'OneUser';
type Link = 'None' | 'Store' | 'Offer';

const AUDIENCES: { value: Audience; label: string; icon: LucideIcon }[] = [
  { value: 'Customers', label: 'كل العملاء', icon: Users },
  { value: 'StoreOwners', label: 'المحلات', icon: Store },
  { value: 'Drivers', label: 'المناديب', icon: Bike },
  { value: 'Everyone', label: 'الكل', icon: Globe },
  { value: 'OneUser', label: 'شخص واحد', icon: UserRound },
];

const LINKS: { value: Link; label: string; icon: LucideIcon }[] = [
  { value: 'None', label: 'صفحة الإشعارات', icon: Bell },
  { value: 'Store', label: 'محل', icon: Store },
  { value: 'Offer', label: 'عرض', icon: Gift },
];

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return setError(t('اكتب العنوان والنص'));
    if (audience === 'OneUser' && !user) return setError(t('اختار الشخص الأول'));
    if (link !== 'None' && !target) return setError(link === 'Store' ? t('اختار المحل الأول') : t('اختار العرض الأول'));
    setError(null);

    const who = audience === 'OneUser' ? titleOf(user!) : t(AUDIENCES.find((a) => a.value === audience)!.label);
    if (!(await confirm(t('تبعت الإشعار لـ "{w}"؟', { w: who }), t('ابعت')))) return;

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

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <PageHeader title={t('إرسال إشعار')} />
      <form onSubmit={submit} className="px-4 flex flex-col gap-4">
        <section>
          <h2 className="mb-2 font-extrabold text-ink">{t('لمين؟')}</h2>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <Chip key={a.value} selected={audience === a.value} icon={<a.icon className="size-4" />} onClick={() => setAudience(a.value)}>
                {t(a.label)}
              </Chip>
            ))}
          </div>
          {audience === 'OneUser' && (
            <PickRow icon={UserRound} text={user ? titleOf(user) : t('اختار الشخص')} onClick={() => setPicker('user')} />
          )}
        </section>

        <section>
          <h2 className="mb-2 font-extrabold text-ink">{t('لما يضغط عليه يفتح:')}</h2>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <Chip
                key={l.value}
                selected={link === l.value}
                icon={<l.icon className="size-4" />}
                onClick={() => {
                  if (link !== l.value) setTarget(null);
                  setLink(l.value);
                }}
              >
                {t(l.label)}
              </Chip>
            ))}
          </div>
          {link !== 'None' && (
            <PickRow
              icon={link === 'Store' ? Store : Gift}
              text={target?.name ?? (link === 'Store' ? t('اختار المحل') : t('اختار العرض'))}
              onClick={() => setPicker('target')}
            />
          )}
        </section>

        <TextField label={t('عنوان الإشعار')} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <TextArea label={t('نص الإشعار')} value={body} maxLength={500} rows={4} onChange={(e) => setBody(e.target.value)} />
        <p className="text-xs text-ink-3 -mt-2">
          {t('الإشعار بيرن على الموبايل وبيفضل في صفحة الإشعارات جوه الأبلكيشن. بيتبعت زي ما هو مكتوب، من غير ترجمة.')}
        </p>

        {error && <InlineError message={error} />}
        <Button type="submit" size="lg" block loading={sending} icon={<Send className="size-5" />}>
          {t('ابعت الإشعار')}
        </Button>
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

function PickRow({ icon: Icon, text, onClick }: { icon: LucideIcon; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 w-full text-start">
      <SoftCard className="flex items-center gap-3 p-3.5">
        <Icon className="size-5 text-brand-ink" />
        <span className="flex-1 font-bold text-ink">{text}</span>
        <span className="text-ink-3">›</span>
      </SoftCard>
    </button>
  );
}

/** Search every account and pick one. */
function UserPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (u: AdminUser) => void }) {
  const [q, setQ] = useState('');
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminUser[]>('/api/admin/users'),
    enabled: open,
  });
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
