import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addressesApi, adminApi, cartApi, catalogApi, driversApi, notificationsApi, ordersApi, reportsApi, storeCategoriesApi, storesApi } from '@/api';
import { SHARM_AREAS } from '@/lib/meta';
import { useAuth } from '@/store/auth';
import { useBrowse } from '@/store/ui';
import type { Address, Cart, OrderStatus, Report } from '@/types';
import { EMPTY_CART } from '@/types';

export const keys = {
  addresses: ['addresses'] as const,
  stores: (lat: number | null, lng: number | null, categoryId: number | null) =>
    ['stores', 'browse', lat, lng, categoryId] as const,
  storeCategories: ['store-categories'] as const,
  adminStoreCategories: ['admin', 'store-categories'] as const,
  store: (id: number) => ['stores', id] as const,
  menu: (id: number) => ['menu', id] as const,
  managedMenu: (id: number) => ['menu', 'manage', id] as const,
  myStores: ['stores', 'mine'] as const,
  cart: ['cart'] as const,
  myOrders: ['orders', 'mine'] as const,
  myOrder: (id: number) => ['orders', 'mine', id] as const,
  adminDashboard: ['admin', 'dashboard'] as const,
  adminStores: ['admin', 'stores'] as const,
  adminOrders: (status: OrderStatus | null) => ['admin', 'orders', status] as const,
  adminOrder: (id: number) => ['admin', 'orders', 'one', id] as const,
  adminDrivers: ['admin', 'drivers'] as const,
  report: (period: ReportPeriod, stamp: string) => ['admin', 'reports', period, stamp] as const,
  unreadNotifications: ['notifications', 'unread'] as const,
  notifications: ['notifications', 'list'] as const,
  driverProfile: ['driver', 'me'] as const,
  driverOrders: (history: boolean) => ['driver', 'orders', history] as const,
  driverOrder: (id: number) => ['driver', 'orders', 'one', id] as const,
};

const useIsCustomer = () => {
  const session = useAuth((s) => s.session);
  return session !== null && session.role === 'customer';
};

// ---------- Addresses ----------

export function useAddresses() {
  const enabled = useIsCustomer();
  return useQuery({
    queryKey: keys.addresses,
    queryFn: addressesApi.mine,
    enabled,
    placeholderData: enabled ? undefined : ([] as Address[]),
  });
}

export interface DeliveryLocation {
  title: string;
  latitude: number;
  longitude: number;
  address: Address | null;
}

/** Where the customer wants delivery: the picked address / area, else the default address, else the first area. */
export function useDeliveryLocation(): { location: DeliveryLocation | null; isLoading: boolean } {
  const selection = useBrowse((s) => s.selection);
  const isCustomer = useIsCustomer();
  const addresses = useAddresses();

  if (selection?.kind === 'area') {
    const area = SHARM_AREAS.find((a) => a.name === selection.name) ?? SHARM_AREAS[0];
    return { location: { title: area.name, latitude: area.latitude, longitude: area.longitude, address: null }, isLoading: false };
  }

  if (isCustomer && addresses.isLoading) return { location: null, isLoading: true };

  const list = addresses.data ?? [];
  const selectedId = selection?.kind === 'address' ? selection.addressId : null;
  const address = list.find((a) => a.id === selectedId) ?? list.find((a) => a.isDefault) ?? list[0];

  if (!address) {
    const area = SHARM_AREAS[0];
    return { location: { title: area.name, latitude: area.latitude, longitude: area.longitude, address: null }, isLoading: false };
  }
  return {
    location: { title: address.label, latitude: address.latitude, longitude: address.longitude, address },
    isLoading: false,
  };
}

// ---------- Stores & catalog ----------

/** Every active store; the delivery location (optional) only adds the distance and the order. */
export function useStores(location: DeliveryLocation | null, categoryId: number | null) {
  const lat = location?.latitude ?? null;
  const lng = location?.longitude ?? null;
  return useQuery({
    queryKey: keys.stores(lat, lng, categoryId),
    queryFn: () => storesApi.browse(lat, lng, categoryId),
  });
}

/** Home tiles, filters and the store form. */
export const useStoreCategories = () =>
  useQuery({ queryKey: keys.storeCategories, queryFn: storeCategoriesApi.visible, staleTime: 5 * 60_000 });

/** Every category, hidden ones included (admin). */
export const useAdminStoreCategories = () =>
  useQuery({ queryKey: keys.adminStoreCategories, queryFn: storeCategoriesApi.all });

export const useStore = (id: number) => useQuery({ queryKey: keys.store(id), queryFn: () => storesApi.byId(id) });
export const useMenu = (id: number) => useQuery({ queryKey: keys.menu(id), queryFn: () => catalogApi.menu(id) });
export const useManagedMenu = (id: number) =>
  useQuery({ queryKey: keys.managedMenu(id), queryFn: () => catalogApi.managedMenu(id) });
export const useMyStores = () => useQuery({ queryKey: keys.myStores, queryFn: storesApi.mine });

// ---------- Cart ----------

export function useCart() {
  const enabled = useIsCustomer();
  return useQuery({
    queryKey: keys.cart,
    queryFn: cartApi.get,
    enabled,
    placeholderData: enabled ? undefined : EMPTY_CART,
  });
}

/** Every change replaces the cart with the server's re-priced copy. */
export function useCartMutations() {
  const qc = useQueryClient();
  const apply = (cart: Cart) => qc.setQueryData(keys.cart, cart);

  const add = useMutation({
    mutationFn: (v: { productId: number; optionIds: number[]; quantity: number }) =>
      cartApi.add(v.productId, v.optionIds, v.quantity),
    onSuccess: apply,
  });
  const setQuantity = useMutation({
    mutationFn: (v: { itemId: number; quantity: number; note: string | null }) =>
      cartApi.update(v.itemId, v.quantity, v.note),
    onSuccess: apply,
  });
  const remove = useMutation({ mutationFn: (itemId: number) => cartApi.remove(itemId), onSuccess: apply });
  const clear = useMutation({ mutationFn: cartApi.clear, onSuccess: apply });

  return { add, setQuantity, remove, clear };
}

// ---------- Orders ----------

export function useMyOrders() {
  const enabled = useIsCustomer();
  return useQuery({ queryKey: keys.myOrders, queryFn: ordersApi.mine, enabled });
}

export const useMyOrder = (id: number) =>
  useQuery({ queryKey: keys.myOrder(id), queryFn: () => ordersApi.mineById(id) });

// ---------- Admin ----------

export const useAdminDashboard = () =>
  useQuery({ queryKey: keys.adminDashboard, queryFn: adminApi.dashboard });
export const useAdminStores = () => useQuery({ queryKey: keys.adminStores, queryFn: () => storesApi.all() });
export const useAdminOrders = (status: OrderStatus | null) =>
  useQuery({ queryKey: keys.adminOrders(status), queryFn: () => ordersApi.all(status) });
export const useAdminOrder = (id: number) =>
  useQuery({ queryKey: keys.adminOrder(id), queryFn: () => ordersApi.byId(id) });

/** Reloads every admin view after a change (approve, suspend, edit, …). */
export function useRefreshAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin'] });
}

export const useAdminDrivers = () => useQuery({ queryKey: keys.adminDrivers, queryFn: driversApi.all });

// ---------- Reports ----------

export type ReportPeriod = 'day' | 'month' | 'year';

/** A report request: the period kind and any date inside it. */
export interface ReportKey {
  period: ReportPeriod;
  date: Date;
}

export const shiftReportKey = (k: ReportKey, by: number): ReportKey => {
  const d = k.date;
  return {
    period: k.period,
    date:
      k.period === 'day'
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + by)
        : k.period === 'month'
          ? new Date(d.getFullYear(), d.getMonth() + by, 1)
          : new Date(d.getFullYear() + by, 0, 1),
  };
};

/** True when this period contains today, so there is no "next". */
export const isCurrentPeriod = (k: ReportKey): boolean => {
  const now = new Date();
  const d = k.date;
  if (d.getFullYear() !== now.getFullYear()) return false;
  if (k.period === 'year') return true;
  if (d.getMonth() !== now.getMonth()) return false;
  return k.period === 'month' || d.getDate() === now.getDate();
};

const reportStamp = (k: ReportKey) =>
  k.period === 'day'
    ? k.date.toDateString()
    : k.period === 'month'
      ? `${k.date.getFullYear()}-${k.date.getMonth()}`
      : `${k.date.getFullYear()}`;

async function loadReport(k: ReportKey): Promise<Report> {
  if (k.period === 'day') {
    const r = await reportsApi.daily(k.date);
    return { totals: r.totals, previous: r.previousDay, points: [], hours: r.hours.map((h) => h.orders), best: null, stores: r.stores, drivers: r.drivers };
  }
  if (k.period === 'month') {
    const r = await reportsApi.monthly(k.date);
    return { totals: r.totals, previous: r.previousMonth, points: r.days, hours: [], best: r.bestDay, stores: r.stores, drivers: r.drivers };
  }
  const r = await reportsApi.yearly(k.date);
  return { totals: r.totals, previous: r.previousYear, points: r.months, hours: [], best: r.bestMonth, stores: r.stores, drivers: r.drivers };
}

export const useReport = (k: ReportKey) =>
  useQuery({ queryKey: keys.report(k.period, reportStamp(k)), queryFn: () => loadReport(k) });

/** Today's numbers for the admin dashboard. */
export const useTodayReport = () => useReport({ period: 'day', date: new Date() });

// ---------- Driver ----------

export const useDriverProfile = () => useQuery({ queryKey: keys.driverProfile, queryFn: driversApi.me });
export const useDriverOrders = (history: boolean) =>
  useQuery({ queryKey: keys.driverOrders(history), queryFn: () => driversApi.myOrders(history) });
export const useDriverOrder = (id: number) =>
  useQuery({ queryKey: keys.driverOrder(id), queryFn: () => driversApi.myOrder(id) });

export function useRefreshDriver() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['driver'] });
}

// ---------- Notifications ----------

/** The number on the bell. Refreshed by every live notification and when the tab comes back. */
export function useUnreadNotifications() {
  const signedIn = useAuth((s) => s.session !== null);
  return useQuery({
    queryKey: keys.unreadNotifications,
    queryFn: notificationsApi.unreadCount,
    enabled: signedIn,
    placeholderData: signedIn ? undefined : 0,
  });
}

/** The inbox, page by page (newest first). */
export const useNotifications = () =>
  useInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam }) => notificationsApi.page(pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore && last.items.length > 0 ? last.items[last.items.length - 1].id : undefined),
  });
