import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdminShell } from "@/components/site/AdminShell";
import { RequireRole } from "@/components/RequireRole";
import { Spinner } from "@/components/ui/feedback";
import { BACKOFFICE_ROLES } from "@/lib/api";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AdminOverviewPage = lazy(() => import("@/pages/AdminOverviewPage"));
const AdminOrdersPage = lazy(() => import("@/pages/AdminOrdersPage"));
const AdminProductsPage = lazy(() => import("@/pages/AdminProductsPage"));
const AdminCategoriesPage = lazy(() => import("@/pages/AdminCategoriesPage"));
const AdminApiKeysPage = lazy(() => import("@/pages/AdminApiKeysPage"));
const AdminVouchersPage = lazy(() => import("@/pages/AdminVouchersPage"));
const AdminReviewsPage = lazy(() => import("@/pages/AdminReviewsPage"));
const AdminCustomRequestsPage = lazy(() => import("@/pages/AdminCustomRequestsPage"));
const AdminChatPage = lazy(() => import("@/pages/AdminChatPage"));
const AdminNotificationsPage = lazy(() => import("@/pages/AdminNotificationsPage"));
const AdminStaffPage = lazy(() => import("@/pages/AdminStaffPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

/** Khung tran man hinh cho trang dang nhap: chi co <main>. */
function BareLayout() {
  return (
    <main id="main" tabIndex={-1}>
      <Suspense
        fallback={
          <div className="flex min-h-svh items-center justify-center">
            <Spinner label="Đang tải trang…" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </main>
  );
}

/**
 * Khung cua moi trang quan tri: sidebar + thanh tren. RequireRole boc ca khung cho ADMIN
 * va nhan vien; trang chi danh cho ADMIN (Khoa API, Nhan vien) boc them AdminOnly.
 */
function AdminLayout() {
  return (
    <RequireRole roles={BACKOFFICE_ROLES}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:border focus:border-accent focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:text-accent"
      >
        Bỏ qua tới nội dung
      </a>

      <AdminShell>
        <main id="main" tabIndex={-1} className="focus:outline-none">
          <Suspense
            fallback={
              <div className="shell flex min-h-[50svh] items-center justify-center">
                <Spinner label="Đang tải trang…" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </AdminShell>
    </RequireRole>
  );
}

/** Trang nhan vien khong duoc vao: go thang URL thi ve Bang dieu khien. */
function AdminOnly({ children }: { children: ReactNode }) {
  return <RequireRole roles={["ADMIN"]}>{children}</RequireRole>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<BareLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>

      <Route element={<AdminLayout />}>
        {/* Giu nguyen duong dan /admin/... nhu ban mot frontend de link giua cac trang khong doi */}
        <Route index element={<Navigate to="/admin" replace />} />
        <Route path="admin" element={<AdminOverviewPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="admin/categories" element={<AdminCategoriesPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
        <Route path="admin/requests" element={<AdminCustomRequestsPage />} />
        <Route path="admin/chat" element={<AdminChatPage />} />
        <Route path="admin/api-keys" element={<AdminOnly><AdminApiKeysPage /></AdminOnly>} />
        <Route path="admin/staff" element={<AdminOnly><AdminStaffPage /></AdminOnly>} />
        <Route path="admin/vouchers" element={<AdminVouchersPage />} />
        <Route path="admin/reviews" element={<AdminReviewsPage />} />
        <Route path="admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
