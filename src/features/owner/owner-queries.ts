import { useQuery } from '@tanstack/react-query';

import { storeEmployeesApi } from '@/api';
import { api } from '@/api/client';
import { useAuth } from '@/store/auth';

/** Delivered orders' totals of the owner's stores, all time and today (`GET /api/store-orders/summary`). */
export interface StoreSalesSummary {
  deliveredOrders: number;
  /** What the products sold for, before the commission. */
  sales: number;
  commission: number;
  tax: number;
  /** What the store gets: sales − commission + tax. */
  net: number;
  todayOrders: number;
  todaySales: number;
  todayNet: number;
}

/** Owner only: the endpoint is closed to cashiers, so it is not called for them. */
export function useStoreSalesSummary() {
  const isOwner = useAuth((s) => s.session?.role === 'storeOwner');
  return useQuery({
    queryKey: ['store-orders', 'summary'],
    queryFn: () => api.get<StoreSalesSummary>('/api/store-orders/summary'),
    enabled: isOwner,
  });
}

/** The store the signed-in cashier works at. */
export function useCashierStore() {
  const isCashier = useAuth((s) => s.session?.role === 'cashier');
  return useQuery({
    queryKey: ['store-employee', 'me'],
    queryFn: storeEmployeesApi.myStore,
    enabled: isCashier,
    staleTime: 10 * 60_000,
  });
}
