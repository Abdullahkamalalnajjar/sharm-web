import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { notificationsApi } from '@/api';
import { keys, useNotifications } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, Loading, SoftCard, Spinner } from '@/components/ui';
import { LoginRequired } from '@/features/auth/LoginRequired';
import { notificationLook, notificationTarget, parseUtc, timeAgo } from '@/lib/notifications';
import { runAction } from '@/lib/run-action';
import { useAuth } from '@/store/auth';
import type { AppNotification } from '@/types';

/** "النهارده" / "امبارح" / older days by date. */
function groupByDay(items: AppNotification[]): [string, AppNotification[]][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups: [string, AppNotification[]][] = [];
  for (const n of items) {
    const d = parseUtc(n.createdUtc);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    const label = diff === 0 ? 'النهارده' : diff === 1 ? 'امبارح' : day.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
    if (groups.length === 0 || groups[groups.length - 1][0] !== label) groups.push([label, []]);
    groups[groups.length - 1][1].push(n);
  }
  return groups;
}

/** The inbox: every notification of the last 30 days, newest first. Tap one to open its order. */
export function NotificationsPage() {
  const session = useAuth((s) => s.session);
  if (!session) {
    return <LoginRequired title="الإشعارات" icon={Bell} message="سجّل دخول عشان تشوف إشعارات طلباتك." />;
  }
  return <Inbox />;
}

function Inbox() {
  const role = useAuth((s) => s.session!.role);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const query = useNotifications();
  const more = useRef<HTMLDivElement>(null);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = query.data?.pages[0]?.unreadCount ?? 0;

  // Load older pages when the end of the list scrolls into view.
  useEffect(() => {
    const el = more.current;
    if (!el || !query.hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !query.isFetchingNextPage) query.fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  async function open(n: AppNotification) {
    if (!n.isRead) notificationsApi.markRead(n.id).then(refresh, () => {});
    const to = notificationTarget(role, n);
    if (to) navigate(to);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28">
      <TabHeader
        title="الإشعارات"
        actions={
          unread > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<CheckCheck className="size-4" />}
              onClick={async () => {
                if (await runAction(notificationsApi.markAllRead)) refresh();
              }}
            >
              قريت الكل
            </Button>
          ) : undefined
        }
      />

      <BrowserNotificationsCard />

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView message={(query.error as Error).message} onRetry={() => qc.invalidateQueries({ queryKey: keys.notifications })} />
      ) : items.length === 0 ? (
        <EmptyView icon={Bell} message={'مفيش إشعارات لسه.\nأي تحديث على الأوردرات هيظهر هنا.'} />
      ) : (
        <>
          {groupByDay(items).map(([label, list]) => (
            <section key={label}>
              <h2 className="px-1 pb-2 pt-3 font-extrabold text-ink-2">{label}</h2>
              <div className="flex flex-col gap-2">
                {list.map((n) => (
                  <NotificationTile key={n.id} item={n} onOpen={() => open(n)} />
                ))}
              </div>
            </section>
          ))}
          <div ref={more} className="grid place-items-center py-4">
            {query.isFetchingNextPage && <Spinner />}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationTile({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const { Icon, color } = notificationLook(item.event);
  const unread = !item.isRead;
  return (
    <SoftCard as="button" onClick={onOpen} className={clsx('flex w-full items-start gap-3 p-3 text-start', unread && 'bg-surface-alt')}>
      <span className="grid size-[42px] shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
        <Icon className="size-[22px]" style={{ color }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx('block', unread ? 'font-extrabold text-ink' : 'font-semibold text-ink-2')}>{item.title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">{item.body}</span>
        <span className="mt-1 block text-[11px] text-ink-3">{timeAgo(parseUtc(item.createdUtc))}</span>
      </span>
      {unread && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" aria-label="جديد" />}
    </SoftCard>
  );
}

/** Offers the browser's own notifications, shown while the site is open in a background tab. */
function BrowserNotificationsCard() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  if (!supported || permission === 'granted') return null;

  return (
    <SoftCard className="mb-3 flex items-center gap-3 p-3">
      {permission === 'denied' ? <BellOff className="size-5 shrink-0 text-ink-3" /> : <Bell className="size-5 shrink-0 text-accent" />}
      <p className="flex-1 text-[13px] text-ink-2">
        {permission === 'denied'
          ? 'إشعارات المتصفح مقفولة. افتحها من إعدادات الموقع في المتصفح لو عايز تعرف بالتحديثات والتاب مش قدامك.'
          : 'فعّل إشعارات المتصفح عشان تعرف بالأوردرات حتى لو التاب مش قدامك.'}
      </p>
      {permission === 'default' && (
        <Button size="sm" onClick={async () => setPermission(await Notification.requestPermission())}>
          فعّل
        </Button>
      )}
    </SoftCard>
  );
}
