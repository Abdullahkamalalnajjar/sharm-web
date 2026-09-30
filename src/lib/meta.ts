import {
  Ban,
  CheckCircle2,
  CircleCheck,
  Hourglass,
  Pill,
  ShoppingBasket,
  Utensils,
  XCircle,
  Bike,
  type LucideIcon,
} from 'lucide-react';

import type { CartLineIssue, OrderStatus, StoreStatus, StoreType } from '@/types';

export interface StoreTypeMeta {
  value: StoreType;
  label: string;
  Icon: LucideIcon;
  /** Fixed categorical color, never changes between charts and filters. */
  color: string;
}

export const STORE_TYPES: StoreTypeMeta[] = [
  { value: 'Restaurant', label: 'مطاعم', Icon: Utensils, color: 'var(--color-series-1)' },
  { value: 'Supermarket', label: 'سوبر ماركت', Icon: ShoppingBasket, color: 'var(--color-series-2)' },
  { value: 'Pharmacy', label: 'صيدليات', Icon: Pill, color: 'var(--color-series-3)' },
];

export const storeType = (value: StoreType): StoreTypeMeta =>
  STORE_TYPES.find((t) => t.value === value) ?? STORE_TYPES[0];

export interface StoreStatusMeta {
  value: StoreStatus;
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const STORE_STATUSES: StoreStatusMeta[] = [
  { value: 'PendingApproval', label: 'مستني موافقة', Icon: Hourglass, color: 'var(--color-warning)' },
  { value: 'Active', label: 'مفعّل', Icon: CheckCircle2, color: 'var(--color-success)' },
  { value: 'Suspended', label: 'موقوف', Icon: Ban, color: 'var(--color-danger)' },
];

export const storeStatus = (value: StoreStatus): StoreStatusMeta =>
  STORE_STATUSES.find((s) => s.value === value) ?? STORE_STATUSES[0];

export interface OrderStatusMeta {
  value: OrderStatus;
  label: string;
  customerMessage: string;
  Icon: LucideIcon;
  color: string;
  isActive: boolean;
}

export const ORDER_STATUSES: OrderStatusMeta[] = [
  {
    value: 'Pending',
    label: 'مستني المراجعة',
    customerMessage: 'طلبك وصل وبنراجعه',
    Icon: Hourglass,
    color: 'var(--color-warning)',
    isActive: true,
  },
  {
    value: 'Confirmed',
    label: 'اتأكد',
    customerMessage: 'طلبك اتأكد وبيتجهز',
    Icon: CircleCheck,
    color: 'var(--color-series-3)',
    isActive: true,
  },
  {
    value: 'OutForDelivery',
    label: 'في الطريق',
    customerMessage: 'الطلب خرج للتوصيل',
    Icon: Bike,
    color: 'var(--color-series-1)',
    isActive: true,
  },
  {
    value: 'Delivered',
    label: 'اتوصّل',
    customerMessage: 'الطلب وصل. بالهنا والشفا!',
    Icon: CheckCircle2,
    color: 'var(--color-success)',
    isActive: false,
  },
  {
    value: 'Cancelled',
    label: 'اتلغى',
    customerMessage: 'الطلب اتلغى',
    Icon: XCircle,
    color: 'var(--color-danger)',
    isActive: false,
  },
];

export const orderStatus = (value: OrderStatus): OrderStatusMeta =>
  ORDER_STATUSES.find((s) => s.value === value) ?? ORDER_STATUSES[0];

export const CART_ISSUE_MESSAGE: Record<CartLineIssue, string | null> = {
  None: null,
  ProductUnavailable: 'المنتج خلص',
  OptionsChanged: 'الاختيارات اتغيرت، شيله وضيفه تاني',
  StoreClosed: 'المحل مقفول دلوقتي',
  StoreUnavailable: 'المحل مش متاح',
};

/** Preset areas in Sharm El Sheikh, used instead of GPS. */
export interface Area {
  name: string;
  latitude: number;
  longitude: number;
}

export const SHARM_AREAS: Area[] = [
  { name: 'خليج نعمة', latitude: 27.9158, longitude: 34.33 },
  { name: 'الهضبة', latitude: 27.8606, longitude: 34.2906 },
  { name: 'السوق القديم', latitude: 27.8656, longitude: 34.2952 },
  { name: 'نبق', latitude: 28.04, longitude: 34.43 },
  { name: 'شارك باي', latitude: 27.96, longitude: 34.395 },
];

export const ADDRESS_LABELS = ['البيت', 'الشغل', 'الفندق'];
