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
  ChefHat,
  Package,
  Car,
  type LucideIcon,
} from 'lucide-react';

import type {
  CartLineIssue,
  CategoryRef,
  OrderStatus,
  PayoutMethod,
  StoreStatus,
  VehicleType,
  WalletEntryKind,
  WithdrawalStatus,
} from '@/types';
import { t, tIn } from '@/lib/i18n';
import { localized } from '@/lib/localized';

export interface CategoryLook {
  Icon: LucideIcon;
  /** Fixed per icon, so a category keeps its color in every chart and filter. */
  color: string;
  /** Suggested name, shown as the icon's tooltip. */
  hint: string;
}

/** The icons the server allows for a category (StoreCategory.Icons in the backend). */
export const STORE_CATEGORY_ICONS: Record<string, CategoryLook> = {
  restaurant: { Icon: Utensils, color: 'var(--color-series-1)', get hint() { return t('مطاعم'); } },
  supermarket: { Icon: ShoppingBasket, color: 'var(--color-series-2)', get hint() { return t('سوبر ماركت'); } },
  pharmacy: { Icon: Pill, color: 'var(--color-series-3)', get hint() { return t('صيدلية'); } },
  bakery: { Icon: Croissant, color: '#E0A15A', get hint() { return t('مخبوزات'); } },
  cafe: { Icon: Coffee, color: '#B98563', get hint() { return t('كافيه'); } },
  sweets: { Icon: CakeSlice, color: '#F06FA6', get hint() { return t('حلويات'); } },
  fruits: { Icon: Apple, color: '#7BCB5A', get hint() { return t('خضار وفاكهة'); } },
  meat: { Icon: Beef, color: '#E5574F', get hint() { return t('لحوم'); } },
  fish: { Icon: Fish, color: '#3FB7D9', get hint() { return t('أسماك'); } },
  flowers: { Icon: Flower2, color: '#C77DFF', get hint() { return t('ورد'); } },
  pets: { Icon: PawPrint, color: '#D9A441', get hint() { return t('حيوانات أليفة'); } },
  electronics: { Icon: MonitorSmartphone, color: '#8C9EFF', get hint() { return t('إلكترونيات'); } },
  gifts: { Icon: Gift, color: '#FF8A65', get hint() { return t('هدايا'); } },
  water: { Icon: Droplet, color: '#4FC3F7', get hint() { return t('مياه'); } },
  laundry: { Icon: WashingMachine, color: '#90A4AE', get hint() { return t('مغسلة'); } },
  other: { Icon: Store, color: 'var(--color-ink-2)', get hint() { return t('أخرى'); } },
};

export const categoryLook = (icon: string | null | undefined): CategoryLook =>
  STORE_CATEGORY_ICONS[icon ?? ''] ?? STORE_CATEGORY_ICONS.other;

/** Label, icon and color of a store's category. */
/** The store's category in the visitor's language, with its icon and color. */
export const categoryOf = (ref: CategoryRef) => ({
  label: localized(ref.categoryName, ref.categoryNameEn, ref.categoryNameRu),
  ...categoryLook(ref.categoryIcon),
});

export interface StoreStatusMeta {
  value: StoreStatus;
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const STORE_STATUSES: StoreStatusMeta[] = [
  { value: 'PendingApproval', get label() { return t('مستني موافقة'); }, Icon: Hourglass, color: 'var(--color-warning)' },
  { value: 'Active', get label() { return t('مفعّل'); }, Icon: CheckCircle2, color: 'var(--color-success)' },
  { value: 'Suspended', get label() { return t('موقوف'); }, Icon: Ban, color: 'var(--color-danger)' },
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
    get label() { return t('مستني المراجعة'); },
    get customerMessage() { return t('طلبك وصل، مستنيين المحل يأكده'); },
    Icon: Hourglass,
    color: 'var(--color-warning)',
    isActive: true,
  },
  {
    value: 'Confirmed',
    get label() { return t('اتأكد'); },
    get customerMessage() { return t('طلبك اتأكد'); },
    Icon: CircleCheck,
    color: 'var(--color-series-3)',
    isActive: true,
  },
  {
    value: 'Processing',
    get label() { return t('بيتجهز'); },
    get customerMessage() { return t('المحل بيجهّز طلبك'); },
    Icon: ChefHat,
    color: 'var(--color-series-2)',
    isActive: true,
  },
  {
    value: 'ReadyForPickup',
    get label() { return t('جاهز للتسليم'); },
    get customerMessage() { return t('طلبك جاهز ومستني المندوب'); },
    Icon: Package,
    color: 'var(--color-accent)',
    isActive: true,
  },
  {
    value: 'OutForDelivery',
    get label() { return t('في الطريق'); },
    get customerMessage() { return t('الطلب خرج للتوصيل'); },
    Icon: Bike,
    color: 'var(--color-series-1)',
    isActive: true,
  },
  {
    value: 'Delivered',
    get label() { return t('اتوصّل'); },
    get customerMessage() { return t('الطلب وصل. بالهنا والشفا!'); },
    Icon: CheckCircle2,
    color: 'var(--color-success)',
    isActive: false,
  },
  {
    value: 'Cancelled',
    get label() { return t('اتلغى'); },
    get customerMessage() { return tIn('order', 'الطلب اتلغى'); },
    Icon: XCircle,
    color: 'var(--color-danger)',
    isActive: false,
  },
];

export const orderStatus = (value: OrderStatus): OrderStatusMeta =>
  ORDER_STATUSES.find((s) => s.value === value) ?? ORDER_STATUSES[0];

/** Confirmed and not picked up yet: the driver and the price can still change. */
export const isAwaitingPickup = (status: OrderStatus) =>
  status === 'Confirmed' || status === 'Processing' || status === 'ReadyForPickup';

export const VEHICLE_TYPES: { value: VehicleType; label: string; Icon: LucideIcon }[] = [
  { value: 'Bicycle', get label() { return t('عجلة'); }, Icon: Bike },
  { value: 'Motorcycle', get label() { return t('موتوسيكل'); }, Icon: Bike },
  { value: 'Car', get label() { return t('عربية'); }, Icon: Car },
];

export const vehicleLabel = (v: VehicleType | null | undefined) => VEHICLE_TYPES.find((x) => x.value === v)?.label ?? null;

export const WALLET_ENTRY_LABEL: Record<WalletEntryKind, string> = {
  get OrderEarning() { return t('أرباح أوردر'); },
  get Payout() { return t('سحب اتدفع'); },
  get CashCollected() { return t('كاش من الزبون'); },
  get DeliveryEarning() { return t('أجرة التوصيل'); },
  get PurchaseCost() { return t('مشتريات طلب خاص'); },
  get CashHandIn() { return t('سلّم للإدارة'); },
  get Adjustment() { return t('تسوية من الإدارة'); },
  get Tip() { return t('بقشيش من زبون'); },
  get Refund() { return t('استرجاع لزبون'); },
};

export const PAYOUT_METHODS: { value: PayoutMethod; label: string; detailsHint: string }[] = [
  { value: 'InstaPay', get label() { return t('إنستاباي'); }, get detailsHint() { return t('عنوان إنستاباي أو رقم الموبايل'); } },
  { value: 'BankTransfer', get label() { return t('تحويل بنكي'); }, get detailsHint() { return t('اسم البنك ورقم الحساب'); } },
  { value: 'Wallet', get label() { return t('محفظة موبايل'); }, get detailsHint() { return t('رقم المحفظة'); } },
  { value: 'Cash', get label() { return t('كاش'); }, get detailsHint() { return t('هتستلمه منين؟ (اختياري)'); } },
];

export const payoutLabel = (m: PayoutMethod) => PAYOUT_METHODS.find((x) => x.value === m)?.label ?? m;

export const WITHDRAWAL_STATUS: Record<WithdrawalStatus, { label: string; color: string }> = {
  Pending: { get label() { return t('مستني الإدارة'); }, color: 'var(--color-warning)' },
  Paid: { get label() { return t('اتدفع'); }, color: 'var(--color-success)' },
  Rejected: { get label() { return t('اترفض'); }, color: 'var(--color-danger)' },
  Cancelled: { get label() { return t('اتلغى'); }, color: 'var(--color-text-muted)' },
};

export const CART_ISSUE_MESSAGE: Record<CartLineIssue, string | null> = {
  None: null,
  get ProductUnavailable() { return t('المنتج خلص'); },
  get OptionsChanged() { return t('الاختيارات اتغيرت، شيله وضيفه تاني'); },
  get StoreClosed() { return t('المحل مقفول دلوقتي'); },
  get StoreUnavailable() { return t('المحل مش متاح'); },
};

/** Preset areas in Sharm El Sheikh, used instead of GPS. */
export interface Area {
  name: string;
  latitude: number;
  longitude: number;
}

/** `name` stays Arabic (it is the saved pick); show it with `t(area.name)`. */
export const SHARM_AREAS: Area[] = [
  { name: 'خليج نعمة', latitude: 27.9158, longitude: 34.33 },
  { name: 'الهضبة', latitude: 27.8606, longitude: 34.2906 },
  { name: 'السوق القديم', latitude: 27.8656, longitude: 34.2952 },
  { name: 'نبق', latitude: 28.04, longitude: 34.43 },
  { name: 'شارك باي', latitude: 27.96, longitude: 34.395 },
];

/** Saved on the address as-is (Arabic); show them with `t(label)`. */
export const ADDRESS_LABELS = ['البيت', 'الشغل', 'الفندق'];
