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
  /** Admin only. */
  customer: OrderCustomer | null;
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
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export type AppRole = 'customer' | 'storeOwner' | 'admin';

export interface Session {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  role: AppRole;
}
