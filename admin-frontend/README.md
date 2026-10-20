# admin-frontend — Giao diện quản trị

Cổng **5174** · React 19 + Vite 6 + Tailwind 4

Trang dành cho quản trị viên: tổng quan doanh thu, quản lý hoa (thêm/sửa/xoá, tải ảnh, tồn
kho, dịp, màu), danh mục, đơn hàng (đổi trạng thái, xem chi tiết quà tặng), mã giảm giá,
duyệt đánh giá, khoá API đối tác. Chỉ gọi Gateway
`http://localhost:8080`.

## Chạy

Cần **Node 24** và cả 4 backend đang chạy (Tổng quan ghép số liệu từ cả ba service).

```bat
cd admin-frontend
npm ci
npm run dev
```

Mở http://localhost:5174, đăng nhập `admin` / `admin123`. Tài khoản CUSTOMER bị từ chối ngay
ở trang đăng nhập.

Cổng cố định 5174 (`strictPort`). Báo *"Port 5174 is already in use"* thì tắt tiến trình
vite cũ, **đừng** đổi cổng: Gateway chỉ cho phép CORS từ 5173 và 5174.

## Trang

| Đường dẫn | File | Gọi tới |
|---|---|---|
| `/admin` | `AdminOverviewPage` | `/orders/overview` + `/products` + `/categories` + `/users` |
| `/admin/products` | `AdminProductsPage` | `/products`, `/products/attributes`, `/products/{id}/upload-image` |
| `/admin/categories` | `AdminCategoriesPage` | `/categories` |
| `/admin/orders` | `AdminOrdersPage` | `/orders`, `/orders/{id}/status` |
| `/orders/:id` | `OrderDetailPage` | `/orders/{id}` |
| `/admin/vouchers` | `AdminVouchersPage` | `/vouchers` |
| `/admin/reviews` | `AdminReviewsPage` | `/reviews`, `/reviews/{id}/visibility` |
| `/admin/api-keys` | `AdminApiKeysPage` | `/api-keys` |

Mọi trang nằm trong `AdminLayout` (`src/App.tsx`), đã bọc `RequireRole role="ADMIN"`. Đó chỉ
là trải nghiệm người dùng — quyền thật do backend kiểm tra trong JWT.

## Kiểm tra trước khi commit

```bat
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Rồi **bấm nút ghi thật**: thêm → sửa → tải ảnh → xoá một sản phẩm, thêm/sửa/xoá danh mục, đổi
trạng thái một đơn. Chỉ mở trang thấy có dữ liệu là chưa đủ — lỗi nặng nhất của đồ án từng
nằm đúng ở đường ghi mà không ai bấm tới.

## Liên quan tới customer-frontend

Link *Xem cửa hàng* ở header mở app khách hàng (cổng 5173). `src/lib/api.ts` hai bên giống
nhau; sửa hàm gọi API dùng chung thì sửa ở cả hai app.

[Quay lại README chung](../README.md)
