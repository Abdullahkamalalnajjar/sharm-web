import { Bike, Bell, CircleCheck, CheckCircle2, Gift, ReceiptText, XCircle, type LucideIcon } from 'lucide-react';

import type { AppRole } from '@/types';

/** Icon and color per event, shared by the banner and the inbox. */
export function notificationLook(event: string): { Icon: LucideIcon; color: string } {
  switch (event) {
    case 'Placed':
      return { Icon: Bell, color: 'var(--color-accent)' };
    case 'Confirmed':
      return { Icon: CircleCheck, color: 'var(--color-success)' };
    case 'DriverAssigned':
    case 'PickedUp':
      return { Icon: Bike, color: 'var(--color-series-1)' };
    case 'Delivered':
    case 'StoreAccepted':
    case 'Ready':
      return { Icon: CheckCircle2, color: 'var(--color-success)' };
    case 'StoreRejected':
      return { Icon: XCircle, color: 'var(--color-danger)' };
    case 'Cancelled':
    case 'DriverRemoved':
      return { Icon: XCircle, color: 'var(--color-danger)' };
    case 'earned':
      return { Icon: Gift, color: 'var(--color-accent)' };
    case 'Preparing':
    case 'DriverTook':
    case 'DriversDue':
      return { Icon: Bike, color: 'var(--color-series-1)' };
    case 'DriverDeclined':
    case 'WithdrawalRejected':
      return { Icon: XCircle, color: 'var(--color-danger)' };
    case 'WithdrawalPaid':
    case 'CashHandedIn':
    case 'Approved':
      return { Icon: CheckCircle2, color: 'var(--color-success)' };
    case 'WithdrawalRequested':
    case 'SignedUp':
      return { Icon: Bell, color: 'var(--color-accent)' };
    default:
      return { Icon: ReceiptText, color: 'var(--color-series-1)' };
  }
}

/** The page a notification opens for this role, or null (e.g. a driver whose order was taken away). */
export function notificationTarget(
  role: AppRole,
  n: { type: string; event: string; title?: string; data: Record<string, string> },
): string | null {
  if (n.type === 'loyalty') return role === 'customer' ? '/points' : null;
  if (n.type === 'wallet') {
    if (role === 'admin') return n.data.driverId ? `/admin/drivers/${n.data.driverId}/wallet` : '/admin/finance';
    if (role === 'storeOwner' && n.data.storeId) return `/owner/stores/${n.data.storeId}/wallet`;
    if (role === 'driver') return '/driver/wallet';
    return null;
  }
  if (n.type === 'driver') return role === 'admin' ? '/admin/drivers' : role === 'driver' ? '/driver' : null;
  const orderId = n.type === 'order' ? Number(n.data.orderId) : NaN;
  if (!Number.isFinite(orderId)) return null;
  switch (role) {
    case 'admin':
      return `/admin/orders/${orderId}`;
    case 'driver':
      // Offers ("أوردر متاح") open the home page; an order taken away or given back has nothing to open.
      if (n.event === 'DriverRemoved' || n.event === 'DriverDeclined') return null;
      return n.title?.includes('متاح') ? '/driver' : `/driver/orders/${orderId}`;
    case 'customer':
      return `/orders/${orderId}`;
    case 'storeOwner':
      return `/owner/orders/${orderId}`;
    default:
      return null;
  }
}

/** Server timestamps are UTC without a "Z". */
export const parseUtc = (text: string) => new Date(/Z|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);

/** "دلوقتي"، "من 5 دقيقة"، "من 3 ساعات"، "امبارح"، or the date. */
export function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'دلوقتي';
  if (minutes < 60) return `من ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'من ساعة' : `من ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'امبارح';
  if (days < 7) return `من ${days} أيام`;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}
