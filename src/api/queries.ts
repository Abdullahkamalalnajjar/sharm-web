import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addressesApi, adminApi, cartApi, catalogApi, ordersApi, storesApi } from '@/api';
import { SHARM_AREAS } from '@/lib/meta';
import { useAuth } from '@/store/auth';
import { useBrowse } from '@/store/ui';
import type { Address, Cart, OrderStatus, StoreType } from '@/types';
import { EMPTY_CART } from '@/types';

export const keys = {
  addresses: ['addresses'] as const,
  nearby: (lat: number, lng: number, type: StoreType | null) => ['stores', 'nearby', lat, lng, type] as const,
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

export function useNearbyStores(location: DeliveryLocation | null, type: StoreType | null) {
  return useQuery({
    queryKey: keys.nearby(location?.latitude ?? 0, location?.longitude ?? 0, type),
    queryFn: () => storesApi.nearby(location!.latitude, location!.longitude, type),
    enabled: location !== null,
  });
}

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
