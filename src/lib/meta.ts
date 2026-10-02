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
  Apple,
  Beef,
  CakeSlice,
  Coffee,
  Croissant,
  Droplet,
  Fish,
  Flower2,
  Gift,
  MonitorSmartphone,
  PawPrint,
  Store,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';

import type { CartLineIssue, CategoryRef, OrderStatus, StoreStatus } from '@/types';

export interface CategoryLook {
  Icon: LucideIcon;
  /** Fixed per icon, so a category keeps its color in every chart and filter. */
  color: string;
  /** Suggested name, shown as the icon's tooltip. */
  hint: string;
}

/** The icons the server allows for a category (StoreCategory.Icons in the backend). */
export const STORE_CATEGORY_ICONS: Record<string, CategoryLook> = {
  restaurant: { Icon: Utensils, color: 'var(--color-series-1)', hint: 'مطاعم' },
  supermarket: { Icon: ShoppingBasket, color: 'var(--color-series-2)', hint: 'سوبر ماركت' },
  pharmacy: { Icon: Pill, color: 'var(--color-series-3)', hint: 'صيدلية' },
  bakery: { Icon: Croissant, color: '#E0A15A', hint: 'مخبوزات' },
  cafe: { Icon: Coffee, color: '#B98563', hint: 'كافيه' },
  sweets: { Icon: CakeSlice, color: '#F06FA6', hint: 'حلويات' },
  fruits: { Icon: Apple, color: '#7BCB5A', hint: 'خضار وفاكهة' },
  meat: { Icon: Beef, color: '#E5574F', hint: 'لحوم' },
  fish: { Icon: Fish, color: '#3FB7D9', hint: 'أسماك' },
  flowers: { Icon: Flower2, color: '#C77DFF', hint: 'ورد' },
  pets: { Icon: PawPrint, color: '#D9A441', hint: 'حيوانات أليفة' },
  electronics: { Icon: MonitorSmartphone, color: '#8C9EFF', hint: 'إلكترونيات' },
  gifts: { Icon: Gift, color: '#FF8A65', hint: 'هدايا' },
  water: { Icon: Droplet, color: '#4FC3F7', hint: 'مياه' },
  laundry: { Icon: WashingMachine, color: '#90A4AE', hint: 'مغسلة' },
  other: { Icon: Store, color: 'var(--color-ink-2)', hint: 'أخرى' },
};

export const categoryLook = (icon: string | null | undefined): CategoryLook =>
  STORE_CATEGORY_ICONS[icon ?? ''] ?? STORE_CATEGORY_ICONS.other;

/** Label, icon and color of a store's category. */
export const categoryOf = (ref: CategoryRef) => ({ label: ref.categoryName, ...categoryLook(ref.categoryIcon) });

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
