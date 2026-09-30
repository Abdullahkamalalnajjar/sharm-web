import { Navigate, Route, Routes } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { CustomerArea, GuestOnly, RequireRole } from '@/components/layout/Guards';
import { AccountPage } from '@/features/account/AccountPage';
import { AddressesPage } from '@/features/addresses/AddressesPage';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminOrderPage } from '@/features/admin/AdminOrderPage';
import { AdminOrdersPage } from '@/features/admin/AdminOrdersPage';
import { AdminStoresPage } from '@/features/admin/AdminStoresPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { CartPage } from '@/features/cart/CartPage';
import { CheckoutPage } from '@/features/cart/CheckoutPage';
import { HomePage } from '@/features/customer/HomePage';
import { StorePage } from '@/features/customer/StorePage';
import { MyOrderPage } from '@/features/orders/MyOrderPage';
import { MyOrdersPage } from '@/features/orders/MyOrdersPage';
import { ManageMenuPage } from '@/features/owner/ManageMenuPage';
import { OwnerStoresPage } from '@/features/owner/OwnerStoresPage';
import { ProductEditorPage } from '@/features/owner/ProductEditorPage';
import { StoreFormPage } from '@/features/owner/StoreFormPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Customer (guests can browse; account actions ask for login) */}
        <Route element={<CustomerArea />}>
          <Route index element={<HomePage />} />
          <Route path="store/:id" element={<StorePage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="orders/:id" element={<MyOrderPage />} />
          <Route path="addresses" element={<AddressesPage />} />
        </Route>

        {/* Shared by every role */}
        <Route path="account" element={<AccountPage />} />

        {/* Store owner */}
        <Route element={<RequireRole role="storeOwner" />}>
          <Route path="owner" element={<OwnerStoresPage />} />
          <Route path="owner/stores/new" element={<StoreFormPage />} />
          <Route path="owner/stores/:id/edit" element={<StoreFormPage />} />
          <Route path="owner/stores/:id/menu" element={<ManageMenuPage />} />
          <Route path="owner/stores/:id/products/new" element={<ProductEditorPage />} />
          <Route path="owner/stores/:id/products/:productId" element={<ProductEditorPage />} />
        </Route>

        {/* Admin */}
        <Route element={<RequireRole role="admin" />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/orders" element={<AdminOrdersPage />} />
          <Route path="admin/orders/:id" element={<AdminOrderPage />} />
          <Route path="admin/stores" element={<AdminStoresPage />} />
          <Route path="admin/stores/new" element={<StoreFormPage isAdmin />} />
          <Route path="admin/stores/:id/edit" element={<StoreFormPage isAdmin />} />
          <Route path="admin/stores/:id/menu" element={<ManageMenuPage />} />
          <Route path="admin/stores/:id/products/new" element={<ProductEditorPage />} />
          <Route path="admin/stores/:id/products/:productId" element={<ProductEditorPage />} />
        </Route>

        {/* Auth */}
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
