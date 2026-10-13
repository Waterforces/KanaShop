import { createBrowserRouter } from 'react-router-dom';
import { UserLayout } from '../components/layout/UserLayout.js';
import { HomePage } from '../pages/HomePage.js';
import { CouponPage } from '../pages/CouponPage.js';
import { OrderStatusPage } from '../pages/OrderStatusPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { RegisterPage } from '../pages/auth/RegisterPage.js';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.js';
import { AdminLayout } from '../components/admin/AdminLayout.js';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.js';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage.js';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage.js';
import { AdminChatPage } from '../pages/admin/AdminChatPage.js';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.js';
import { AdminCouponsPage } from '../pages/admin/AdminCouponsPage.js';
import { AdminSecurityPage } from '../pages/admin/AdminSecurityPage.js';

export const router = createBrowserRouter([
  // User Portal
  {
    path: '/',
    element: <UserLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'coupons', element: <CouponPage /> },
      { path: 'status', element: <OrderStatusPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  // Authentication Flows
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Admin Control Panel
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'chat', element: <AdminChatPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'security', element: <AdminSecurityPage /> },
    ],
  },
]);
