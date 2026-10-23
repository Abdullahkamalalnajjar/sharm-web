// Models mirrored from the Flutter app (lib/features/**/*_models.dart). Field names match the API.

/** A store category (مطاعم، سوبر ماركت، ...), managed by the admin. `icon` is a key of STORE_CATEGORY_ICONS. */
export interface StoreCategory {
  id: number;
  name: string;
  icon: string;
  imageUrl: string | null;
  displayOrder: number;
  isVisible: boolean;
  /** Active stores in it. */
  storesCount: number;
}

/** The category fields embedded in stores and cart groups. */
export interface CategoryRef {
  categoryName: string;
  categoryIcon: string;
}
export type StoreStatus = 'PendingApproval' | 'Active' | 'Suspended';

export interface Store {
  id: number;
  ownerId: string;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  status: StoreStatus;
  logoUrl: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  minOrderAmount: number;
  isOpen: boolean;
  canAcceptOrders: boolean;
  /** Customers' average stars (0 when unrated) and how many rated. */
  ratingAverage: number;
  ratingsCount: number;
  /** Optional translations of `name` / `description` (see `localized`). */
  nameEn: string | null;
  nameRu: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  /** The wide header image of the store page. */
  coverUrl: string | null;
  /** Customers can order for later today or tomorrow (admin setting). */
  allowsScheduledOrders: boolean;
  /** The app's % of the products; null for customers (admin setting). */
  commissionPercent: number | null;
  /** The owner's open/closed switch; `isOpen` is that AND within `opensAt`–`closesAt`. */
  openSwitch: boolean;
  /** Daily local (Egypt) hours, "HH:mm:ss"; both null when only the switch decides. Closing before
   *  opening means it closes after midnight. */
  opensAt: string | null;
  closesAt: string | null;
}

export interface NearbyStore {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  logoUrl: string | null;
  address: string;
  minOrderAmount: number;
  isOpen: boolean;
  /** Null when the list was asked for without a location. */
  distanceKm: number | null;
  ratingAverage: number;
  ratingsCount: number;
  nameEn: string | null;
  nameRu: string | null;
  coverUrl: string | null;
  /** A closed store that allows it still takes orders for later. */
  allowsScheduledOrders: boolean;
  /** Open right now is `isOpen`; the switch alone and the daily hours ("HH:mm:ss"). */
  openSwitch: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface StoreInput {
  name: string;
  description: string | null;
  categoryId: number;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  minOrderAmount: number;
  /** Admin only: register the store for this owner. */
  ownerEmail?: string;
  /** Admin only, when creating: the store's commission % (later changed from its settings). */
  commissionPercent?: number;
  /** Translations: null keeps the current one, "" clears it. */
  nameEn?: string | null;
  nameRu?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
}

/** Admin settings of a store; they affect new orders only. */
export interface StoreSettingsInput {
  commissionPercent: number;
  allowsScheduledOrders: boolean;
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
  nameEn: string | null;
  nameRu: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  /** % off the whole unit price (base and extras); 0 when not discounted. `price` is before it. */
  discountPercent: number;
  /** The base price after the discount. */
  finalPrice: number | null;
}

/** A menu section. Sub-categories follow their main category, with `parentId` set. */
export interface MenuCategory {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  products: Product[];
  parentId: number | null;
  nameEn: string | null;
  nameRu: string | null;
}

/** What a menu Excel import did; nothing is saved when `errors` is not empty. */
export interface MenuImportResult {
  imported: boolean;
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  /** Add-on choices added / updated from the add-ons sheet. */
  optionsCreated: number;
  optionsUpdated: number;
  /** `sheet`: "المنتجات" or "الإضافات". */
  errors: { rowNumber: number; message: string; sheet: string }[];
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
  /** Translations: null keeps the current one, "" clears it. */
  nameEn?: string | null;
  nameRu?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  /** 0 removes the discount; omitted keeps the current one. */
  discountPercent?: number | null;
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
  categoryIcon: string;
  logoUrl: string | null;
  isOpen: boolean;
  minOrderAmount: number;
  subtotal: number;
  meetsMinimum: boolean;
  lines: CartLine[];
  /** Takes orders for later, even while closed now. */
  allowsScheduledOrders: boolean;
}

export interface Cart {
  stores: CartStoreGroup[];
  itemsCount: number;
  subtotal: number;
  canCheckout: boolean;
}

export const EMPTY_CART: Cart = { stores: [], itemsCount: 0, subtotal: 0, canCheckout: false };

/** Confirmed = "Accepted"; ReadyForPickup = "Handover". */
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'ReadyForPickup' | 'OutForDelivery' | 'Delivered' | 'Cancelled';

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
  /** The customer's rating of this store in this order (customer view). */
  myStars?: number | null;
  myComment?: string | null;
}

export interface OrderCustomer {
  userId?: string;
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
  /** Whether this is a custom order placed with free-form text. */
  isCustomOrder?: boolean;
  paymentMethod?: string;
  subtotal: number;
  deliveryFee: number | null;
  /** Store → customer distance the fee was calculated from (null for custom orders). */
  deliveryDistanceKm?: number | null;
  /** Set by the admin with the delivery fee (e.g. 14 = 14%); charged on the products only, not the delivery fee. */
  taxPercent: number;
  taxAmount: number;
  total: number;
  itemsCount: number;
  canCustomerCancel: boolean;
  stores: OrderStoreGroup[];
  /** Admin and driver only. */
  customer: OrderCustomer | null;
  driver: OrderDriver | null;
  driverAssignedUtc: string | null;
  /** Delivered and not a custom order: the customer can rate its stores. */
  canRate?: boolean;
  /** The order is confirmed as soon as the store accepts (or the admin confirms it). */
  storeDecision?: StoreDecision;
  adminApprovedUtc?: string | null;
  /** When the store marked it ready for pickup. */
  readyUtc?: string | null;
  /** When the store started preparing it. */
  processingUtc?: string | null;
  /** The delivery time the customer asked for; null = as soon as possible. */
  scheduledForUtc?: string | null;
  /** The admin / store can change the items (add, quantity, remove) until pickup. */
  canEditItems?: boolean;
}

export interface OrderSummary {
  id: number;
  number: string;
  status: OrderStatus;
  createdUtc: string;
  isCustomOrder?: boolean;
  storeNames: string[];
  itemsCount: number;
  deliveryFee: number | null;
  total: number;
  addressLabel: string;
  customerEmail: string | null;
  /** Admin only. */
  driverName: string | null;
  storeDecision?: StoreDecision;
  adminApproved?: boolean;
  isReady?: boolean;
  scheduledForUtc?: string | null;
}

export interface PlaceCustomOrderRequest {
  addressId: number;
  requestDetails: string;
  paymentMethod?: string;
}

export interface StoreCategoryCount {
  categoryId: number;
  name: string;
  icon: string;
  count: number;
}

export interface AdminDashboard {
  totalStores: number;
  activeStores: number;
  pendingStores: number;
  suspendedStores: number;
  openStores: number;
  storesByCategory: StoreCategoryCount[];
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
  /** False while a driver who signed up waits for the admin (activating approves them). */
  isApproved: boolean;
  /** The driver's own switch for new order offers. */
  isAvailable: boolean;
  vehicleType: VehicleType | null;
  /** Signed up with an ID card photo the admin can view. */
  hasNationalIdImage: boolean;
}

export type VehicleType = 'Bicycle' | 'Motorcycle' | 'Car';

/** An order waiting for a driver, before they take it: no customer contact details. */
export interface DriverOffer {
  orderId: number;
  number: string;
  status: OrderStatus;
  createdUtc: string;
  isCustomOrder: boolean;
  storeName: string | null;
  storeAddress: string | null;
  storeLatitude: number | null;
  storeLongitude: number | null;
  dropOffArea: string;
  dropOffLatitude: number;
  dropOffLongitude: number;
  deliveryDistanceKm: number | null;
  deliveryFee: number | null;
  total: number;
  itemsCount: number;
  isReady: boolean;
  scheduledForUtc: string | null;
}

export interface DriverSignUpInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  vehicleType: VehicleType;
  nationalIdImage: File;
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

/** One item of the in-app inbox (the bell). */
export interface AppNotification {
  id: number;
  /** What it is about, e.g. "order". */
  type: string;
  /** What happened, e.g. "Placed", "DriverAssigned". */
  event: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdUtc: string;
}

export interface NotificationsPage {
  items: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
}

/** A live message pushed over SignalR while the site is open. */
export interface LiveNotification {
  type: string;
  event: string;
  title: string;
  body: string;
  data: Record<string, string>;
  actorUserId: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** `cashier`: a store's employee (made by the admin) who works its orders, with no access to its money. */
export type AppRole = 'customer' | 'storeOwner' | 'admin' | 'driver' | 'cashier';

export interface Session {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  role: AppRole;
}

// ---------- Ratings ----------

/** What delivering the cart to an address costs: 40 EGP up to 3 km, then 8.5 per km, 270 from 27 km. */
export interface DeliveryQuote {
  storeId: number;
  distanceKm: number;
  deliveryFee: number;
}

export interface StoreRating {
  id: number;
  stars: number;
  comment: string | null;
  createdUtc: string;
}

/** A page of a store's ratings, newest first. */
export interface StoreRatingsPage {
  average: number;
  count: number;
  items: StoreRating[];
  hasMore: boolean;
}

// ---------- Loyalty points ----------

/** A delivered order whose total reaches `minOrderTotal` earns `pointsPerOrder` points. */
export interface LoyaltySettings {
  isEnabled: boolean;
  minOrderTotal: number;
  pointsPerOrder: number;
}

export interface PointsTransaction {
  id: number;
  points: number;
  kind: 'OrderReward' | 'AdminAdjustment';
  orderNumber: string | null;
  reason: string | null;
  createdUtc: string;
}

/** A balance, the current rule and a page of history (newest first). */
export interface PointsAccount {
  balance: number;
  rule: LoyaltySettings;
  items: PointsTransaction[];
  hasMore: boolean;
}

// ---------- Store orders ----------

/** The store's answer to an order. Custom orders and older orders need none. */
export type StoreDecision = 'NotRequired' | 'Pending' | 'Accepted' | 'Rejected';

/** New: waiting for the store; Active: accepted, not picked up; Done: picked up, delivered or cancelled. */
export type StoreOrdersFilter = 'New' | 'Active' | 'Done';

/** What a store sees of an order: items and note, not the customer's details. */
export interface StoreOrder {
  id: number;
  number: string;
  storeId: number;
  storeName: string;
  status: OrderStatus;
  storeDecision: StoreDecision;
  adminApproved: boolean;
  createdUtc: string;
  readyUtc: string | null;
  note: string | null;
  itemsCount: number;
  subtotal: number;
  items: OrderItem[];
  driver: OrderDriver | null;
  cancellationReason: string | null;
  canAccept: boolean;
  canMarkReady: boolean;
  /** Confirmed and not started: show "ابدأ التجهيز". */
  canStartPreparing: boolean;
  processingUtc: string | null;
  scheduledForUtc: string | null;
  /** The app's commission taken from the products; `storeEarnings` = subtotal − commission. */
  commissionPercent: number;
  commissionAmount: number;
  storeEarnings: number;
  /** The store can change the items (add, quantity, remove) until the driver picks the order up. */
  canEditItems?: boolean;
}

// ---------- Wallets ----------

/** A store's balance is what the app owes it; a driver's is what they owe the app. */
export type WalletParty = 'Store' | 'Driver';

export type WalletEntryKind =
  | 'OrderEarning'
  | 'Payout'
  | 'CashCollected'
  | 'DeliveryEarning'
  | 'PurchaseCost'
  | 'CashHandIn'
  | 'Adjustment';

/** One account line; `amount` is signed. */
export interface WalletEntry {
  id: number;
  party: WalletParty;
  partyId: number;
  /** Admin list only. */
  partyName: string | null;
  kind: WalletEntryKind;
  amount: number;
  orderId: number | null;
  orderNumber: string | null;
  withdrawalId: number | null;
  note: string | null;
  createdUtc: string;
}

export interface StoreWallet {
  storeId: number;
  storeName: string;
  /** What the app owes the store. */
  balance: number;
  pendingWithdrawals: number;
  /** Balance minus pending withdrawals: what can still be requested. */
  available: number;
  totalEarned: number;
  totalPaidOut: number;
  deliveredOrders: number;
  recent: WalletEntry[];
}

export interface DriverWallet {
  driverId: number;
  driverName: string;
  deliveredOrders: number;
  todayDeliveredOrders: number;
  totalEarnings: number;
  todayEarnings: number;
  /** Customers' cash not handed in yet. */
  cashInHand: number;
  /** What the driver owes the app after keeping their fees; negative = the app owes them. */
  amountToHandIn: number;
  recent: WalletEntry[];
}

export type PayoutMethod = 'InstaPay' | 'BankTransfer' | 'Wallet' | 'Cash';
export type WithdrawalStatus = 'Pending' | 'Paid' | 'Rejected' | 'Cancelled';

export interface Withdrawal {
  id: number;
  storeId: number;
  storeName: string;
  amount: number;
  method: PayoutMethod;
  paymentDetails: string | null;
  status: WithdrawalStatus;
  /** The transfer reference, or the rejection reason. */
  adminNote: string | null;
  createdUtc: string;
  processedUtc: string | null;
}

export interface PartyBalance {
  party: WalletParty;
  id: number;
  name: string;
  balance: number;
  pendingWithdrawals: number;
}

export interface WalletsOverview {
  owedToStores: number;
  cashWithDrivers: number;
  commissionEarned: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  stores: PartyBalance[];
  drivers: PartyBalance[];
}

// ---------- Store employees (cashiers) ----------

export interface StoreEmployee {
  id: number;
  storeId: number;
  userId: string;
  email: string | null;
  fullName: string;
  phoneNumber: string | null;
  createdUtc: string;
}

export interface StoreEmployeeInput {
  fullName: string;
  phoneNumber: string | null;
  /** Create: required. Update: empty keeps the current password. */
  password?: string;
  email?: string;
}

/** The store the signed-in cashier works at. */
export interface MyEmployeeStore {
  storeId: number;
  storeName: string;
  fullName: string;
  logoUrl: string | null;
}
