import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bell, BellRing, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { create } from 'zustand';

import { apiBaseUrl, freshAccessToken } from '@/api/client';
import { useUnreadNotifications } from '@/api/queries';
import { notificationLook, notificationTarget } from '@/lib/notifications';
import { useAuth } from '@/store/auth';
import type { LiveNotification } from '@/types';

// ---------- Banner state ----------

interface BannerState {
  current: LiveNotification | null;
  show: (n: LiveNotification) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

const useBanner = create<BannerState>((set) => ({
  current: null,
  show(current) {
    clearTimeout(hideTimer);
    set({ current });
    hideTimer = setTimeout(() => set({ current: null }), 6000);
  },
  hide() {
    clearTimeout(hideTimer);
    set({ current: null });
  },
}));

// ---------- Connection ----------

/**
 * Keeps one SignalR connection open while someone is signed in. Every message refreshes the
 * views it can touch; messages about other people's actions also show a banner, and a browser
 * notification when the tab is in the background (if the user allowed it).
 */
export function useLiveNotifications() {
  const session = useAuth((s) => s.session);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = session?.userId ?? null;
  const role = session?.role ?? null;
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    if (!userId) return;

    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const hub: HubConnection = new HubConnectionBuilder()
      .withUrl(`${apiBaseUrl}/hubs/notifications`, { accessTokenFactory: async () => (await freshAccessToken()) ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.Warning)
      .build();

    const refresh = (n: LiveNotification) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (n.type !== 'order') return;
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['driver'] });
    };

    hub.on('notification', (n: LiveNotification) => {
      refresh(n);
      if (n.actorUserId === userId) return;

      useBanner.getState().show(n);
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const system = new Notification(n.title, { body: n.body, tag: `${n.type}-${n.data.orderId ?? ''}-${n.event}`, icon: '/favicon.svg' });
        system.onclick = () => {
          window.focus();
          const to = roleRef.current ? notificationTarget(roleRef.current, n) : null;
          if (to) navigate(to);
          system.close();
        };
      }
    });

    // Automatic reconnect gave up (e.g. long offline): keep trying slowly.
    const connect = async () => {
      if (stopped) return;
      try {
        await hub.start();
        attempt = 0;
      } catch {
        const seconds = [5, 10, 30, 60][Math.min(attempt++, 3)];
        retry = setTimeout(connect, seconds * 1000);
      }
    };
    hub.onclose(() => {
      if (!stopped) retry = setTimeout(connect, 5000);
    });

    // Back to the tab: reconnect if needed and catch up on the bell.
    const onVisible = () => {
      if (document.hidden) return;
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      if (hub.state === HubConnectionState.Disconnected) {
        clearTimeout(retry);
        attempt = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener('visibilitychange', onVisible);
      hub.stop();
    };
  }, [userId, qc, navigate]);
}

// ---------- UI ----------

/** The live message at the top of the screen; tap to open its order. */
export function LiveBanner() {
  const current = useBanner((s) => s.current);
  const hide = useBanner((s) => s.hide);
  const role = useAuth((s) => s.session?.role);
  const navigate = useNavigate();
  if (!current) return null;

  const { Icon, color } = notificationLook(current.event);
  const target = role ? notificationTarget(role, current) : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+68px)] z-[70] flex justify-center px-3">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[22px] border bg-surface-alt p-3 shadow-[0_10px_30px_rgb(0_0_0/0.45)] animate-sheet"
        style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
      >
        <button
          type="button"
          onClick={() => {
            hide();
            if (target) navigate(target);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <span className="grid size-[42px] shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
            <Icon className="size-[22px]" style={{ color }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold text-ink">{current.title}</span>
            <span className="line-clamp-2 text-[13px] text-ink-2">{current.body}</span>
          </span>
        </button>
        <button type="button" aria-label="إخفاء" onClick={hide} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-high">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Header bell with the unread count; opens the inbox. */
export function NotificationBell({ className }: { className?: string }) {
  const unread = useUnreadNotifications().data ?? 0;
  const Icon = unread > 0 ? BellRing : Bell;
  return (
    <NavLink
      to="/notifications"
      aria-label={unread > 0 ? `الإشعارات، ${unread} جديد` : 'الإشعارات'}
      title="الإشعارات"
      className={clsx(
        'relative grid size-[38px] place-items-center rounded-[10px] border border-white/28 text-white hover:bg-white/15',
        className,
      )}
    >
      <Icon className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-brand bg-accent px-1 text-[10px] font-black text-black">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  );
}
