import { Navigate, Route, Routes } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { CustomerArea, GuestOnly, RequireRole } from '@/components/layout/Guards';
import { AccountPage } from '@/features/account/AccountPage';
import { AddressesPage } from '@/features/addresses/AddressesPage';
import { AdminCategoriesPage } from '@/features/admin/AdminCategoriesPage';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminDriversPage } from '@/features/admin/AdminDriversPage';
import { AdminReportsPage } from '@/features/admin/AdminReportsPage';
import { AdminOrderPage } from '@/features/admin/AdminOrderPage';
import { AdminOrdersPage } from '@/features/admin/AdminOrdersPage';
import { AdminStoresPage } from '@/features/admin/AdminStoresPage';
import { StoreEmployeesPage } from '@/features/admin/StoreEmployeesPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { CartPage } from '@/features/cart/CartPage';
import { CheckoutPage } from '@/features/cart/CheckoutPage';
import { CustomOrderPage } from '@/features/customer/CustomOrderPage';
import { HomePage } from '@/features/customer/HomePage';
import { PointsPage } from '@/features/loyalty/PointsPage';
import { DriverHomePage } from '@/features/driver/DriverHomePage';
import { DriverOrderPage } from '@/features/driver/DriverOrderPage';
import { StorePage } from '@/features/customer/StorePage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { MyOrderPage } from '@/features/orders/MyOrderPage';
import { MyOrdersPage } from '@/features/orders/MyOrdersPage';
import { ManageMenuPage } from '@/features/owner/ManageMenuPage';
import { OwnerStoresPage } from '@/features/owner/OwnerStoresPage';
import { ProductEditorPage } from '@/features/owner/ProductEditorPage';
import { StoreFormPage } from '@/features/owner/StoreFormPage';
import { StoreOrderPage, StoreOrdersPage } from '@/features/owner/StoreOrdersPage';
import { StoreRatingsPage } from '@/features/ratings/Ratings';
import { AdminFinancePage } from '@/features/wallets/AdminFinancePage';
import { DriverWalletPage } from '@/features/wallets/DriverWalletPage';
import { StoreWalletPage } from '@/features/wallets/StoreWalletPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Customer (guests can browse; account actions ask for login) */}
        <Route element={<CustomerArea />}>
          <Route index element={<HomePage />} />
          <Route path="custom-order" element={<CustomOrderPage />} />
          <Route path="store/:id" element={<StorePage />} />
          <Route path="store/:id/ratings" element={<StoreRatingsPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="orders/:id" element={<MyOrderPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="points" element={<PointsPage />} />
        </Route>

        {/* Shared by every role */}
        <Route path="account" element={<AccountPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Store cashier: the store's orders only */}
        <Route element={<RequireRole role="cashier" />}>
          <Route path="cashier" element={<StoreOrdersPage />} />
          <Route path="cashier/orders/:id" element={<StoreOrderPage />} />
        </Route>

        {/* Store owner */}
        <Route element={<RequireRole role="storeOwner" />}>
          <Route path="owner" element={<OwnerStoresPage />} />
          <Route path="owner/orders" element={<StoreOrdersPage />} />
          <Route path="owner/orders/:id" element={<StoreOrderPage />} />
          <Route path="owner/stores/:id/edit" element={<StoreFormPage />} />
          <Route path="owner/stores/:id/menu" element={<ManageMenuPage />} />
          <Route path="owner/stores/:id/wallet" element={<StoreWalletPage />} />
          <Route path="owner/stores/:id/products/new" element={<ProductEditorPage />} />
          <Route path="owner/stores/:id/products/:productId" element={<ProductEditorPage />} />
        </Route>

        {/* Admin */}
        <Route element={<RequireRole role="admin" />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/orders" element={<AdminOrdersPage />} />
          <Route path="admin/orders/:id" element={<AdminOrderPage />} />
          <Route path="admin/stores" element={<AdminStoresPage />} />
          <Route path="admin/drivers" element={<AdminDriversPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/finance" element={<AdminFinancePage />} />
          <Route path="admin/stores/:id/wallet" element={<StoreWalletPage isAdmin />} />
          <Route path="admin/drivers/:id/wallet" element={<DriverWalletPage />} />
          <Route path="admin/stores/new" element={<StoreFormPage isAdmin />} />
          <Route path="admin/stores/:id/edit" element={<StoreFormPage isAdmin />} />
          <Route path="admin/stores/:id/menu" element={<ManageMenuPage />} />
          <Route path="admin/stores/:id/employees" element={<StoreEmployeesPage />} />
          <Route path="admin/stores/:id/products/new" element={<ProductEditorPage />} />
          <Route path="admin/stores/:id/products/:productId" element={<ProductEditorPage />} />
        </Route>

        {/* Driver */}
        <Route element={<RequireRole role="driver" />}>
          <Route path="driver" element={<DriverHomePage />} />
          <Route path="driver/orders/:id" element={<DriverOrderPage />} />
          <Route path="driver/wallet" element={<DriverWalletPage />} />
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
