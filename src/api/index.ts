import { api, tokenStorage } from './client';
import type {
  Address,
  AddressInput,
  AdminDashboard,
  Cart,
  DeliveryQuote,
  DailyReport,
  Driver,
  DriverOffer,
  DriverSignUpInput,
  DriverWallet,
  MenuImportResult,
  PayoutMethod,
  StoreSettingsInput,
  StoreWallet,
  VehicleType,
  WalletEntry,
  WalletParty,
  WalletsOverview,
  Withdrawal,
  WithdrawalStatus,
  Menu,
  MonthlyReport,
  NearbyStore,
  NotificationsPage,
  LoyaltySettings,
  Order,
  OrderStatus,
  OrderSummary,
  PointsAccount,
  Product,
  ProductInput,
  Store,
  StoreInput,
  StoreOrder,
  StoreOrdersFilter,
  StoreStatus,
  StoreCategory,
  StoreRatingsPage,
  Tokens,
  YearlyReport,
  MyEmployeeStore,
  StoreEmployee,
  StoreEmployeeInput,
} from '@/types';

// ---------- Auth ----------

async function authenticate(path: string, body: Record<string, unknown>): Promise<Tokens> {
  const tokens = await api.post<Tokens>(path, body);
  tokenStorage.save(tokens);
  return tokens;
}

export const authApi = {
  login: (email: string, password: string) =>
    authenticate('/identity/token/generate', { email: email.trim(), password }),
  signUp: (input: { email: string; password: string; role: string; city?: string | null; phoneNumber?: string | null }) =>
    authenticate('/identity/signup', { ...input, email: input.email.trim() }),
  /** A driver signs up with their ID card photo; the account waits for the admin's approval. */
  signUpDriver: async (input: DriverSignUpInput) => {
    const tokens = await api.postForm<Tokens>('/api/driver/signup', {
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      phoneNumber: input.phoneNumber.trim(),
      vehicleType: input.vehicleType,
      nationalIdImage: input.nationalIdImage,
    });
    tokenStorage.save(tokens);
    return tokens;
  },
  logout: () => tokenStorage.clear(),
};

// ---------- Stores ----------

export const storesApi = {
  /** Every active store; with a location, each has its distance and the nearest come first. */
  browse: (latitude: number | null, longitude: number | null, categoryId: number | null) =>
    api.get<NearbyStore[]>('/api/stores', { latitude, longitude, categoryId }),
  byId: (storeId: number) => api.get<Store>(`/api/stores/${storeId}`),
  /** Newest first; `beforeId` (the last id you have) loads older ones. */
  ratings: (storeId: number, beforeId?: number) => api.get<StoreRatingsPage>(`/api/stores/${storeId}/ratings`, { beforeId }),

  mine: () => api.get<Store[]>('/api/stores/mine'),
  create: (input: StoreInput) => api.post<Store>('/api/stores', input),
  update: (storeId: number, input: StoreInput) => api.put<Store>(`/api/stores/${storeId}`, input),
  uploadLogo: (storeId: number, file: File) => api.upload<Store>(`/api/stores/${storeId}/logo`, file),
  removeLogo: (storeId: number) => api.delete<Store>(`/api/stores/${storeId}/logo`),
  uploadCover: (storeId: number, file: File) => api.upload<Store>(`/api/stores/${storeId}/cover`, file),
  removeCover: (storeId: number) => api.delete<Store>(`/api/stores/${storeId}/cover`),
  /** Delivery times (UTC) a customer can schedule an order from this store for. */
  scheduleSlots: (storeId: number) => api.get<string[]>(`/api/stores/${storeId}/schedule-slots`),
  setOpen: (storeId: number, isOpen: boolean) => api.patch<void>(`/api/stores/${storeId}/open-status`, { isOpen }),
  /** Daily local hours as "HH:mm" (owner or admin); both null clears them. */
  setHours: (storeId: number, opensAt: string | null, closesAt: string | null) =>
    api.put<void>(`/api/stores/${storeId}/hours`, {
      opensAt: opensAt && `${opensAt.slice(0, 5)}:00`,
      closesAt: closesAt && `${closesAt.slice(0, 5)}:00`,
    }),

  all: (status?: StoreStatus | null) => api.get<Store[]>('/api/stores/admin', { status }),
  approve: (storeId: number) => api.post<void>(`/api/stores/${storeId}/approve`),
  suspend: (storeId: number) => api.post<void>(`/api/stores/${storeId}/suspend`),
  /** Commission and scheduled orders (admin only; affects new orders). */
  updateSettings: (storeId: number, input: StoreSettingsInput) => api.put<Store>(`/api/stores/${storeId}/settings`, input),
};

// ---------- Store categories ----------

const adminCategories = '/api/admin/store-categories';

export const storeCategoriesApi = {
  /** Visible categories in display order (the home tiles). */
  visible: () => api.get<StoreCategory[]>('/api/store-categories'),

  all: () => api.get<StoreCategory[]>(adminCategories),
  create: (name: string, icon: string) => api.post<StoreCategory>(adminCategories, { name, icon }),
  update: (id: number, name: string, icon: string) => api.put<StoreCategory>(`${adminCategories}/${id}`, { name, icon }),
  setVisible: (id: number, visible: boolean) =>
    api.post<StoreCategory>(`${adminCategories}/${id}/${visible ? 'show' : 'hide'}`),
  /** Every category id, first to last. */
  reorder: (ids: number[]) => api.put<StoreCategory[]>(`${adminCategories}/order`, { categoryIds: ids }),
  uploadImage: (id: number, file: File) => api.upload<StoreCategory>(`${adminCategories}/${id}/image`, file),
  removeImage: (id: number) => api.delete<StoreCategory>(`${adminCategories}/${id}/image`),
  delete: (id: number) => api.delete<void>(`${adminCategories}/${id}`),
};

// ---------- Catalog ----------

const store = (storeId: number) => `/api/stores/${storeId}`;
const group = (storeId: number, productId: number, groupId: number) =>
  `${store(storeId)}/products/${productId}/option-groups/${groupId}`;

export const catalogApi = {
  menu: (storeId: number) => api.get<Menu>(`${store(storeId)}/menu`),
  managedMenu: (storeId: number) => api.get<Menu>(`${store(storeId)}/manage/menu`),

  /** `parentId` makes it a sub-category of that main category. Translations: "" clears. */
  createCategory: (
    storeId: number,
    input: { name: string; displayOrder: number; parentId?: number | null; nameEn?: string; nameRu?: string },
  ) => api.post<void>(`${store(storeId)}/categories`, input),
  updateCategory: (storeId: number, categoryId: number, input: { name: string; displayOrder: number; nameEn?: string; nameRu?: string }) =>
    api.put<void>(`${store(storeId)}/categories/${categoryId}`, input),
  /** Into main category `parentId`, or out to a main category (null). */
  moveCategory: (storeId: number, categoryId: number, parentId: number | null) =>
    api.put<void>(`${store(storeId)}/categories/${categoryId}/parent`, { parentId }),
  /** The menu as an .xlsx sheet (an empty template when there are no products). */
  exportMenu: (storeId: number) => api.blob(`${store(storeId)}/manage/menu/excel`),
  /** A filled-in example menu with every column and the instructions sheet. */
  menuSample: (storeId: number) => api.blob(`${store(storeId)}/manage/menu/excel/sample`),
  /** Adds or updates products from the sheet; nothing is saved if a row has errors. */
  importMenu: (storeId: number, file: File) => api.postForm<MenuImportResult>(`${store(storeId)}/manage/menu/excel`, { file }),
  setCategoryActive: (storeId: number, categoryId: number, isActive: boolean) =>
    api.patch<void>(`${store(storeId)}/categories/${categoryId}/active`, { isActive }),
  deleteCategory: (storeId: number, categoryId: number) =>
    api.delete<void>(`${store(storeId)}/categories/${categoryId}`),

  createProduct: (storeId: number, input: ProductInput) => api.post<Product>(`${store(storeId)}/products`, input),
  updateProduct: (storeId: number, productId: number, input: ProductInput) =>
    api.put<Product>(`${store(storeId)}/products/${productId}`, input),
  setProductAvailability: (storeId: number, productId: number, isAvailable: boolean) =>
    api.patch<void>(`${store(storeId)}/products/${productId}/availability`, { isAvailable }),
  uploadProductImage: (storeId: number, productId: number, file: File) =>
    api.upload<Product>(`${store(storeId)}/products/${productId}/image`, file),
  removeProductImage: (storeId: number, productId: number) =>
    api.delete<Product>(`${store(storeId)}/products/${productId}/image`),
  deleteProduct: (storeId: number, productId: number) => api.delete<void>(`${store(storeId)}/products/${productId}`),

  addOptionGroup: (storeId: number, productId: number, name: string, min: number, max: number, displayOrder: number) =>
    api.post<Product>(`${store(storeId)}/products/${productId}/option-groups`, {
      name,
      minSelections: min,
      maxSelections: max,
      displayOrder,
    }),
  updateOptionGroup: (
    storeId: number,
    productId: number,
    groupId: number,
    name: string,
    min: number,
    max: number,
    displayOrder: number,
  ) =>
    api.put<Product>(group(storeId, productId, groupId), {
      name,
      minSelections: min,
      maxSelections: max,
      displayOrder,
    }),
  removeOptionGroup: (storeId: number, productId: number, groupId: number) =>
    api.delete<Product>(group(storeId, productId, groupId)),

  addOption: (storeId: number, productId: number, groupId: number, name: string, extraPrice: number) =>
    api.post<Product>(`${group(storeId, productId, groupId)}/options`, { name, extraPrice }),
  updateOption: (
    storeId: number,
    productId: number,
    groupId: number,
    optionId: number,
    name: string,
    extraPrice: number,
  ) => api.put<Product>(`${group(storeId, productId, groupId)}/options/${optionId}`, { name, extraPrice }),
  setOptionAvailability: (storeId: number, productId: number, groupId: number, optionId: number, isAvailable: boolean) =>
    api.patch<Product>(`${group(storeId, productId, groupId)}/options/${optionId}/availability`, { isAvailable }),
  removeOption: (storeId: number, productId: number, groupId: number, optionId: number) =>
    api.delete<Product>(`${group(storeId, productId, groupId)}/options/${optionId}`),
};

// ---------- Addresses ----------

export const addressesApi = {
  mine: () => api.get<Address[]>('/api/addresses'),
  create: (input: AddressInput) => api.post<Address>('/api/addresses', input),
  update: (addressId: number, input: AddressInput) => api.put<Address>(`/api/addresses/${addressId}`, input),
  setDefault: (addressId: number) => api.patch<void>(`/api/addresses/${addressId}/default`),
  delete: (addressId: number) => api.delete<void>(`/api/addresses/${addressId}`),
};

// ---------- Cart ----------

export const cartApi = {
  /** `scheduled`: checking out for later, so a closed store that takes scheduled orders is fine. */
  get: (scheduled = false) => api.get<Cart>('/api/cart', scheduled ? { scheduled: true } : undefined),
  /** One store per cart: another store's product fails with `Cart.DifferentStore` unless `replaceCart` empties it first. */
  add: (productId: number, optionIds: number[], quantity: number, note?: string | null, replaceCart = false) =>
    api.post<Cart>('/api/cart/items', { productId, optionIds, quantity, note: note ?? null, replaceCart }),
  /** Distance from the cart's store to this address and the delivery fee it costs. */
  deliveryQuote: (addressId: number) => api.get<DeliveryQuote>('/api/cart/delivery-quote', { addressId }),
  update: (itemId: number, quantity: number, note?: string | null) =>
    api.patch<Cart>(`/api/cart/items/${itemId}`, { quantity, note: note ?? null }),
  remove: (itemId: number) => api.delete<Cart>(`/api/cart/items/${itemId}`),
  clear: () => api.delete<Cart>('/api/cart'),
};

// ---------- Orders ----------

const adminOrders = '/api/admin/orders';

export const ordersApi = {
  /** `scheduledFor`: one of the store's schedule slots (UTC ISO); null = as soon as possible. */
  place: (addressId: number, note?: string | null, scheduledFor?: string | null) =>
    api.post<Order>('/api/orders', { addressId, note: note ?? null, scheduledFor: scheduledFor ?? null }),
  placeCustom: (addressId: number, requestDetails: string, paymentMethod?: string) =>
    api.post<number>('/api/orders/custom', { addressId, requestDetails, paymentMethod: paymentMethod ?? 'Cash' }),
  mine: () => api.get<OrderSummary[]>('/api/orders/mine'),
  mineById: (id: number) => api.get<Order>(`/api/orders/mine/${id}`),
  cancelMine: (id: number, reason?: string | null) =>
    api.post<Order>(`/api/orders/mine/${id}/cancel`, { reason: reason ?? null }),
  /** Stars (1-5) and an optional comment per store of a delivered order; rating again changes it. */
  rateMine: (id: number, ratings: { storeId: number; stars: number; comment: string | null }[]) =>
    api.put<Order>(`/api/orders/mine/${id}/ratings`, { ratings }),

  all: (status?: OrderStatus | null) => api.get<OrderSummary[]>(adminOrders, { status }),
  byId: (id: number) => api.get<Order>(`${adminOrders}/${id}`),
  /** Confirms now; a store that has not answered is accepted on its behalf. `taxPercent` is on the products only. */
  confirm: (id: number, deliveryFee: number, taxPercent: number) =>
    api.post<Order>(`${adminOrders}/${id}/confirm`, { deliveryFee, taxPercent }),
  setDeliveryFee: (id: number, deliveryFee: number, taxPercent: number) =>
    api.put<Order>(`${adminOrders}/${id}/delivery-fee`, { deliveryFee, taxPercent }),
  setCustomSubtotal: (id: number, newSubtotal: number) =>
    api.put<Order>(`${adminOrders}/${id}/custom-subtotal`, { newSubtotal }),
  /** `driverId` null takes the order back from its driver. */
  assignDriver: (id: number, driverId: number | null) => api.put<Order>(`${adminOrders}/${id}/driver`, { driverId }),
  /** The store did not answer: accept on its behalf. */
  acceptForStore: (id: number) => api.post<Order>(`${adminOrders}/${id}/store-accept`),
  startDelivery: (id: number) => api.post<Order>(`${adminOrders}/${id}/out-for-delivery`),
  markDelivered: (id: number) => api.post<Order>(`${adminOrders}/${id}/delivered`),
  cancel: (id: number, reason?: string | null) => api.post<Order>(`${adminOrders}/${id}/cancel`, { reason: reason ?? null }),
  removeItem: (id: number, itemId: number) => api.delete<Order>(`${adminOrders}/${id}/items/${itemId}`),
  /** A product of the order's store (e.g. the customer called to swap one), until pickup. */
  addItem: (id: number, productId: number, optionIds: number[], quantity: number, note: string | null) =>
    api.post<Order>(`${adminOrders}/${id}/items`, { productId, optionIds, quantity, note }),
  setItemQuantity: (id: number, itemId: number, quantity: number) =>
    api.patch<Order>(`${adminOrders}/${id}/items/${itemId}`, { quantity }),
};

// ---------- Admin ----------

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/api/admin/dashboard'),
};

// ---------- Drivers ----------

const adminDrivers = '/api/admin/drivers';
const me = '/api/driver';

export const driversApi = {
  all: () => api.get<Driver[]>(adminDrivers),
  create: (input: { fullName: string; phoneNumber: string; email: string; password: string; vehicleType?: VehicleType | null }) =>
    api.post<Driver>(adminDrivers, input),
  update: (id: number, input: { fullName: string; phoneNumber: string; vehicleType?: VehicleType | null }) =>
    api.put<Driver>(`${adminDrivers}/${id}`, input),
  /** Activating a driver who signed up also approves them. */
  setActive: (id: number, active: boolean) => api.post<Driver>(`${adminDrivers}/${id}/${active ? 'activate' : 'deactivate'}`),
  /** The ID card photo a driver signed up with (private: downloaded with the admin's token). */
  nationalIdImage: (id: number) => api.blob(`${adminDrivers}/${id}/national-id`),

  me: () => api.get<Driver>(`${me}/me`),
  /** Switch new order offers on or off. */
  setAvailable: (isAvailable: boolean) => api.put<Driver>(`${me}/me/availability`, { isAvailable }),
  /** Orders waiting for a driver (no customer contact details until accepted). */
  offers: () => api.get<DriverOffer[]>(`${me}/offers`),
  /** Take the order; fails with 409 if another driver was faster. */
  accept: (id: number) => api.post<Order>(`${me}/orders/${id}/accept`),
  /** Turn down an offer, or give back an order before pickup. */
  reject: (id: number) => api.post<null>(`${me}/orders/${id}/reject`),
  /** Active orders by default; `history` for delivered and cancelled ones. */
  myOrders: (history: boolean) => api.get<Order[]>(`${me}/orders`, { history }),
  myOrder: (id: number) => api.get<Order>(`${me}/orders/${id}`),
  /** "استلمت": picked up from the stores. */
  pickedUp: (id: number) => api.post<Order>(`${me}/orders/${id}/picked-up`),
  /** "وصّلت": handed to the customer. */
  delivered: (id: number) => api.post<Order>(`${me}/orders/${id}/delivered`),
};

// ---------- Reports ----------

const reports = '/api/admin/reports';
const two = (v: number) => String(v).padStart(2, '0');

export const reportsApi = {
  daily: (d: Date) => api.get<DailyReport>(`${reports}/daily`, { date: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` }),
  monthly: (d: Date) => api.get<MonthlyReport>(`${reports}/monthly`, { year: d.getFullYear(), month: d.getMonth() + 1 }),
  yearly: (d: Date) => api.get<YearlyReport>(`${reports}/yearly`, { year: d.getFullYear() }),
};

// ---------- Notifications (the bell) ----------

const notifications = '/api/notifications';

export const notificationsApi = {
  /** Newest first; `beforeId` (the last id you have) loads older ones. */
  page: (beforeId?: number) => api.get<NotificationsPage>(notifications, { beforeId }),
  // A zero count is left out of the response.
  unreadCount: async () => (await api.get<number | undefined>(`${notifications}/unread-count`)) ?? 0,
  /** Returns the unread count left. */
  markRead: async (id: number) => (await api.post<number | undefined>(`${notifications}/${id}/read`)) ?? 0,
  markAllRead: async () => (await api.post<number | undefined>(`${notifications}/read-all`)) ?? 0,
};

// ---------- Loyalty points ----------

const adminLoyalty = '/api/admin/loyalty';

export const loyaltyApi = {
  /** Newest first; `beforeId` (the last id you have) loads older history. */
  mine: (beforeId?: number) => api.get<PointsAccount>('/api/loyalty/me', { beforeId }),
  settings: () => api.get<LoyaltySettings>(`${adminLoyalty}/settings`),
  updateSettings: (input: LoyaltySettings) => api.put<LoyaltySettings>(`${adminLoyalty}/settings`, input),
  customer: (customerId: string, beforeId?: number) =>
    api.get<PointsAccount>(`${adminLoyalty}/customers/${customerId}`, { beforeId }),
  /** Positive adds, negative takes (not below zero). */
  adjust: (customerId: string, points: number, reason: string) =>
    api.post<PointsAccount>(`${adminLoyalty}/customers/${customerId}/adjust`, { points, reason }),
};

// ---------- Store orders (the store's side) ----------

const storeOrders = '/api/store-orders';

export const storeOrdersApi = {
  list: (filter: StoreOrdersFilter) => api.get<StoreOrder[]>(storeOrders, { filter }),
  byId: (id: number) => api.get<StoreOrder>(`${storeOrders}/${id}`),
  accept: (id: number) => api.post<StoreOrder>(`${storeOrders}/${id}/accept`),
  /** The order is cancelled; the reason reaches the customer and the admin. */
  reject: (id: number, reason: string | null) => api.post<StoreOrder>(`${storeOrders}/${id}/reject`, { reason }),
  /** Confirmed → being prepared. */
  startPreparing: (id: number) => api.post<StoreOrder>(`${storeOrders}/${id}/preparing`),
  /** E.g. the customer called to swap a product; until the driver picks the order up. */
  addItem: (id: number, productId: number, optionIds: number[], quantity: number, note: string | null) =>
    api.post<StoreOrder>(`${storeOrders}/${id}/items`, { productId, optionIds, quantity, note }),
  setItemQuantity: (id: number, itemId: number, quantity: number) =>
    api.patch<StoreOrder>(`${storeOrders}/${id}/items/${itemId}`, { quantity }),
  /** The last item cannot be removed (reject the order instead). */
  removeItem: (id: number, itemId: number) => api.delete<StoreOrder>(`${storeOrders}/${id}/items/${itemId}`),
  markReady: (id: number) => api.post<StoreOrder>(`${storeOrders}/${id}/ready`),
};

// ---------- Wallets ----------

export const walletsApi = {
  // Store (its owner or the admin)
  storeWallet: (storeId: number) => api.get<StoreWallet>(`/api/stores/${storeId}/wallet`),
  /** Newest first; `beforeId` (the last id you have) loads older ones. */
  storeEntries: (storeId: number, beforeId?: number) =>
    api.get<WalletEntry[]>(`/api/stores/${storeId}/wallet/entries`, { beforeId }),
  storeWithdrawals: (storeId: number) => api.get<Withdrawal[]>(`/api/stores/${storeId}/withdrawals`),
  requestWithdrawal: (storeId: number, amount: number, method: PayoutMethod, paymentDetails: string | null) =>
    api.post<Withdrawal>(`/api/stores/${storeId}/withdrawals`, { amount, method, paymentDetails }),
  cancelWithdrawal: (storeId: number, id: number) => api.post<Withdrawal>(`/api/stores/${storeId}/withdrawals/${id}/cancel`),

  // Driver
  myWallet: () => api.get<DriverWallet>(`${me}/wallet`),
  myEntries: (beforeId?: number) => api.get<WalletEntry[]>(`${me}/wallet/entries`, { beforeId }),

  // Admin
  overview: () => api.get<WalletsOverview>('/api/admin/wallets'),
  entries: (party?: WalletParty | null, partyId?: number | null, beforeId?: number) =>
    api.get<WalletEntry[]>('/api/admin/wallets/entries', { party, partyId, beforeId }),
  withdrawals: (status?: WithdrawalStatus | null) => api.get<Withdrawal[]>('/api/admin/withdrawals', { status }),
  /** The money was sent; `reference` is the transfer number. */
  pay: (id: number, reference: string | null) => api.post<Withdrawal>(`/api/admin/withdrawals/${id}/pay`, { note: reference }),
  /** The reason is shown to the store. */
  reject: (id: number, reason: string | null) => api.post<Withdrawal>(`/api/admin/withdrawals/${id}/reject`, { note: reason }),
  driverWallet: (driverId: number) => api.get<DriverWallet>(`${adminDrivers}/${driverId}/wallet`),
  recordCashHandIn: (driverId: number, amount: number, note: string | null) =>
    api.post<DriverWallet>(`${adminDrivers}/${driverId}/cash-hand-ins`, { amount, note }),
  /** Positive raises the balance, negative lowers it; the reason is required. */
  adjust: (party: WalletParty, partyId: number, amount: number, note: string) =>
    api.post<WalletEntry>('/api/admin/wallets/adjustments', { party, partyId, amount, note }),
};

// ---------- Store employees (cashiers) ----------

const adminEmployees = (storeId: number) => `/api/admin/stores/${storeId}/employees`;

export const storeEmployeesApi = {
  /** Admin only. */
  list: (storeId: number) => api.get<StoreEmployee[]>(adminEmployees(storeId)),
  create: (storeId: number, input: StoreEmployeeInput) =>
    api.post<StoreEmployee>(adminEmployees(storeId), {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
    }),
  update: (storeId: number, id: number, input: StoreEmployeeInput) =>
    api.put<StoreEmployee>(`${adminEmployees(storeId)}/${id}`, {
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      newPassword: input.password || null,
    }),
  remove: (storeId: number, id: number) => api.delete<void>(`${adminEmployees(storeId)}/${id}`),
  /** The signed-in cashier's store. */
  myStore: () => api.get<MyEmployeeStore>('/api/store-employee/me'),
};
