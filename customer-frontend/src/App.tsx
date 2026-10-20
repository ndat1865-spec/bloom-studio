import { Suspense, lazy, useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Spinner } from "@/components/ui/feedback";
import HomePage from "@/pages/HomePage";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const PaymentResultPage = lazy(() => import("@/pages/PaymentResultPage"));
const AccountProfilePage = lazy(() => import("@/pages/AccountProfilePage"));
const AccountAddressPage = lazy(() => import("@/pages/AccountAddressPage"));
const AccountOrdersPage = lazy(() => import("@/pages/AccountOrdersPage"));
const AccountRequestsPage = lazy(() => import("@/pages/AccountRequestsPage"));
const AccountVouchersPage = lazy(() => import("@/pages/AccountVouchersPage"));
const VoucherHuntPage = lazy(() => import("@/pages/VoucherHuntPage"));
const CustomOrderPage = lazy(() => import("@/pages/CustomOrderPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

/** Doi route thi cuon len dau trang (tru khi duong dan co hash). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

/** Khung tran man hinh cho cac trang xac thuc: chi co skip link + <main>. */
function BareLayout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-accent focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:text-accent"
      >
        Bỏ qua tới nội dung
      </a>
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
    </>
  );
}

function Layout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-accent focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:text-accent"
      >
        Bỏ qua tới nội dung
      </a>

      <SiteHeader />

      <main id="main" tabIndex={-1}>
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

      <SiteFooter />

      {/* Chat voi studio: tro ly AI tra loi truoc, can thi chuyen nhan vien */}
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/*
          /login va /register dung khung toan man hinh (AuthLayout) nen nam NGOAI Layout
          — khong co navbar va footer cua site, dung nhu mockup.
        */}
        <Route element={<BareLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<HomePage />} />

          {/* CUSTOMER va ADMIN deu xem duoc danh muc hoa; khach chua dang nhap van xem duoc */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />

          {/* Phan mo rong ngoai SOS01-SOS10: gio hang, thanh toan, don hang */}
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          {/* Dat hoa theo yeu cau: khach mo ta, studio bao gia */}
          <Route
            path="dat-hoa-theo-yeu-cau"
            element={
              <RequireAuth>
                <CustomOrderPage />
              </RequireAuth>
            }
          />
          {/* San voucher: ai cung xem duoc, bam Luu moi can dang nhap */}
          <Route path="voucher" element={<VoucherHuntPage />} />
          {/* VNPay / MoMo / ZaloPay dua khach ve day (payment.return-url cua payment-service) */}
          <Route path="payment/result" element={<PaymentResultPage />} />

          {/* Khu vuc tai khoan — ca ADMIN lan CUSTOMER deu vao duoc */}
          <Route
            path="tai-khoan"
            element={
              <RequireAuth>
                <AccountProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="tai-khoan/dia-chi"
            element={
              <RequireAuth>
                <AccountAddressPage />
              </RequireAuth>
            }
          />
          <Route
            path="tai-khoan/don-hang"
            element={
              <RequireAuth>
                <AccountOrdersPage />
              </RequireAuth>
            }
          />

          <Route
            path="tai-khoan/yeu-cau-dat-hoa"
            element={
              <RequireAuth>
                <AccountRequestsPage />
              </RequireAuth>
            }
          />

          <Route
            path="tai-khoan/ma-giam-gia"
            element={
              <RequireAuth>
                <AccountVouchersPage />
              </RequireAuth>
            }
          />

          {/* Cac trang /admin/... nam o admin-frontend (cong 5174) */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
