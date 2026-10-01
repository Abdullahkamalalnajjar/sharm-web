// Models mirrored from the Flutter app (lib/features/**/*_models.dart). Field names match the API.

export type StoreType = 'Restaurant' | 'Supermarket' | 'Pharmacy';
export type StoreStatus = 'PendingApproval' | 'Active' | 'Suspended';

export interface Store {
  id: number;
  ownerId: string;
  name: string;
  description: string | null;
  type: StoreType;
  status: StoreStatus;
  logoUrl: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  minOrderAmount: number;
  isOpen: boolean;
  canAcceptOrders: boolean;
}

export interface NearbyStore {
  id: number;
  name: string;
  type: StoreType;
  logoUrl: string | null;
  address: string;
  minOrderAmount: number;
  isOpen: boolean;
  distanceKm: number;
}

export interface StoreInput {
  name: string;
  description: string | null;
  type: StoreType;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  minOrderAmount: number;
  /** Admin only: register the store for this owner. */
  ownerEmail?: string;
}

export interface ProductOption {
  id: number;
  name: string;
  extraPrice: number;
  isAvailable: boolean;
}

export interface ProductOptionGroup {
  id: number;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  displayOrder: number;
  options: ProductOption[];
}

export interface Product {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
  optionGroups: ProductOptionGroup[];
}

export interface MenuCategory {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  products: Product[];
}

export interface Menu {
  storeId: number;
  categories: MenuCategory[];
}

export interface ProductInput {
  categoryId: number;
  name: string;
  price: number;
  description: string | null;
  imageUrl?: string | null;
  displayOrder: number;
}

export interface Address {
  id: number;
  label: string;
  addressLine: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface AddressInput {
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string | null;
  makeDefault: boolean;
}

export type CartLineIssue = 'None' | 'ProductUnavailable' | 'OptionsChanged' | 'StoreClosed' | 'StoreUnavailable';

export interface CartLine {
  id: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  optionIds: number[];
  optionNames: string[];
  quantity: number;
  note: string | null;
  unitPrice: number;
  lineTotal: number;
  issue: CartLineIssue;
}

export interface CartStoreGroup {
  storeId: number;
  storeName: string;
  storeType: StoreType;
  logoUrl: string | null;
  isOpen: boolean;
  minOrderAmount: number;
  subtotal: number;
  meetsMinimum: boolean;
  lines: CartLine[];
}

export interface Cart {
  stores: CartStoreGroup[];
  itemsCount: number;
  subtotal: number;
  canCheckout: boolean;
}

export const EMPTY_CART: Cart = { stores: [], itemsCount: 0, subtotal: 0, canCheckout: false };

export type OrderStatus = 'Pending' | 'Confirmed' | 'OutForDelivery' | 'Delivered' | 'Cancelled';

export interface OrderAddress {
  label: string;
  addressLine: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** The driver on an order. The customer sees them once assigned, to call them. */
export interface OrderDriver {
  id: number;
  fullName: string;
  phoneNumber: string;
}

export interface OrderItem {
  id: number;
  productName: string;
  optionsText: string | null;
  note: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStoreGroup {
  storeId: number;
  storeName: string;
  subtotal: number;
  items: OrderItem[];
}

export interface OrderCustomer {
  email: string | null;
  phoneNumber: string | null;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  createdUtc: string;
  confirmedUtc: string | null;
  outForDeliveryUtc: string | null;
  deliveredUtc: string | null;
  cancelledUtc: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  address: OrderAddress;
  note: string | null;
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  itemsCount: number;
  canCustomerCancel: boolean;
  stores: OrderStoreGroup[];
  /** Admin and driver only. */
  customer: OrderCustomer | null;
  driver: OrderDriver | null;
  driverAssignedUtc: string | null;
}

export interface OrderSummary {
  id: number;
  number: string;
  status: OrderStatus;
  createdUtc: string;
  storeNames: string[];
  itemsCount: number;
  deliveryFee: number | null;
  total: number;
  addressLabel: string;
  customerEmail: string | null;
  /** Admin only. */
  driverName: string | null;
}

export interface StoreTypeCount {
  type: StoreType;
  count: number;
}

export interface AdminDashboard {
  totalStores: number;
  activeStores: number;
  pendingStores: number;
  suspendedStores: number;
  openStores: number;
  storesByType: StoreTypeCount[];
  totalProducts: number;
  unavailableProducts: number;
  totalCategories: number;
  customers: number;
  storeOwners: number;
  pendingApprovals: Store[];
  pendingOrders: number;
  ordersInProgress: number;
  deliveredOrders: number;
  activeDrivers: number;
  /** Confirmed orders still without a driver. */
  unassignedOrders: number;
}

/** A delivery driver as the admin sees them (also the driver's own profile). */
export interface Driver {
  id: number;
  userId: string;
  email: string | null;
  fullName: string;
  phoneNumber: string;
  isActive: boolean;
  /** Confirmed or on the way right now. */
  activeOrders: number;
  deliveredOrders: number;
  createdUtc: string;
}

// ---------- Reports ----------

/** Headline numbers of a period. Orders count on the day placed, money on the day delivered. */
export interface ReportTotals {
  ordersPlaced: number;
  delivered: number;
  cancelled: number;
  inProgress: number;
  /** Everything collected from customers (products + delivery). */
  sales: number;
  /** The stores' share (products only). */
  storeSales: number;
  /** The app's share. */
  deliveryFees: number;
  averageOrder: number;
}

/** One bar: a day of a month or a month of a year. */
export interface ReportPoint {
  start: string;
  ordersPlaced: number;
  delivered: number;
  sales: number;
  deliveryFees: number;
}

export interface StoreSales {
  storeId: number;
  storeName: string;
  orders: number;
  itemsSold: number;
  sales: number;
}

export interface DriverStats {
  driverId: number;
  fullName: string;
  delivered: number;
  collected: number;
  deliveryFees: number;
}

export interface DailyReport {
  date: string;
  totals: ReportTotals;
  previousDay: ReportTotals;
  hours: { hour: number; orders: number }[];
  stores: StoreSales[];
  drivers: DriverStats[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  totals: ReportTotals;
  previousMonth: ReportTotals;
  days: ReportPoint[];
  bestDay: ReportPoint | null;
  stores: StoreSales[];
  drivers: DriverStats[];
}

export interface YearlyReport {
  year: number;
  totals: ReportTotals;
  previousYear: ReportTotals;
  months: ReportPoint[];
  bestMonth: ReportPoint | null;
  stores: StoreSales[];
  drivers: DriverStats[];
}

/** What every report has in common, so one page can show day, month or year. */
export interface Report {
  totals: ReportTotals;
  previous: ReportTotals;
  /** Days of the month or months of the year. Empty for a day report. */
  points: ReportPoint[];
  /** Orders per hour (0-23). Day report only. */
  hours: number[];
  best: ReportPoint | null;
  stores: StoreSales[];
  drivers: DriverStats[];
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export type AppRole = 'customer' | 'storeOwner' | 'admin' | 'driver';

export interface Session {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  role: AppRole;
}
