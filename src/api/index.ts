import { api, tokenStorage } from './client';
import type {
  Address,
  AddressInput,
  AdminDashboard,
  Cart,
  Menu,
  NearbyStore,
  Order,
  OrderStatus,
  OrderSummary,
  Product,
  ProductInput,
  Store,
  StoreInput,
  StoreStatus,
  StoreType,
  Tokens,
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
  logout: () => tokenStorage.clear(),
};

// ---------- Stores ----------

export const storesApi = {
  nearby: (latitude: number, longitude: number, type: StoreType | null, radiusKm = 15) =>
    api.get<NearbyStore[]>('/api/stores/nearby', { latitude, longitude, type, radiusKm }),
  byId: (storeId: number) => api.get<Store>(`/api/stores/${storeId}`),

  mine: () => api.get<Store[]>('/api/stores/mine'),
  create: (input: StoreInput) => api.post<Store>('/api/stores', input),
  update: (storeId: number, input: StoreInput) => api.put<Store>(`/api/stores/${storeId}`, input),
  uploadLogo: (storeId: number, file: File) => api.upload<Store>(`/api/stores/${storeId}/logo`, file),
  removeLogo: (storeId: number) => api.delete<Store>(`/api/stores/${storeId}/logo`),
  setOpen: (storeId: number, isOpen: boolean) => api.patch<void>(`/api/stores/${storeId}/open-status`, { isOpen }),

  all: (status?: StoreStatus | null) => api.get<Store[]>('/api/stores/admin', { status }),
  approve: (storeId: number) => api.post<void>(`/api/stores/${storeId}/approve`),
  suspend: (storeId: number) => api.post<void>(`/api/stores/${storeId}/suspend`),
};

// ---------- Catalog ----------

const store = (storeId: number) => `/api/stores/${storeId}`;
const group = (storeId: number, productId: number, groupId: number) =>
  `${store(storeId)}/products/${productId}/option-groups/${groupId}`;

export const catalogApi = {
  menu: (storeId: number) => api.get<Menu>(`${store(storeId)}/menu`),
  managedMenu: (storeId: number) => api.get<Menu>(`${store(storeId)}/manage/menu`),

  createCategory: (storeId: number, name: string, displayOrder: number) =>
    api.post<void>(`${store(storeId)}/categories`, { name, displayOrder }),
  updateCategory: (storeId: number, categoryId: number, name: string, displayOrder: number) =>
    api.put<void>(`${store(storeId)}/categories/${categoryId}`, { name, displayOrder }),
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
  get: () => api.get<Cart>('/api/cart'),
  add: (productId: number, optionIds: number[], quantity: number, note?: string | null) =>
    api.post<Cart>('/api/cart/items', { productId, optionIds, quantity, note: note ?? null }),
  update: (itemId: number, quantity: number, note?: string | null) =>
    api.patch<Cart>(`/api/cart/items/${itemId}`, { quantity, note: note ?? null }),
  remove: (itemId: number) => api.delete<Cart>(`/api/cart/items/${itemId}`),
  clear: () => api.delete<Cart>('/api/cart'),
};

// ---------- Orders ----------

const adminOrders = '/api/admin/orders';

export const ordersApi = {
  place: (addressId: number, note?: string | null) => api.post<Order>('/api/orders', { addressId, note: note ?? null }),
  mine: () => api.get<OrderSummary[]>('/api/orders/mine'),
  mineById: (id: number) => api.get<Order>(`/api/orders/mine/${id}`),
  cancelMine: (id: number, reason?: string | null) =>
    api.post<Order>(`/api/orders/mine/${id}/cancel`, { reason: reason ?? null }),

  all: (status?: OrderStatus | null) => api.get<OrderSummary[]>(adminOrders, { status }),
  byId: (id: number) => api.get<Order>(`${adminOrders}/${id}`),
  confirm: (id: number, deliveryFee: number) => api.post<Order>(`${adminOrders}/${id}/confirm`, { deliveryFee }),
  setDeliveryFee: (id: number, deliveryFee: number) =>
    api.put<Order>(`${adminOrders}/${id}/delivery-fee`, { deliveryFee }),
  startDelivery: (id: number) => api.post<Order>(`${adminOrders}/${id}/out-for-delivery`),
  markDelivered: (id: number) => api.post<Order>(`${adminOrders}/${id}/delivered`),
  cancel: (id: number, reason?: string | null) => api.post<Order>(`${adminOrders}/${id}/cancel`, { reason: reason ?? null }),
  removeItem: (id: number, itemId: number) => api.delete<Order>(`${adminOrders}/${id}/items/${itemId}`),
};

// ---------- Admin ----------

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/api/admin/dashboard'),
};
