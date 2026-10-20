# customer-frontend — Giao diện khách hàng

Cổng **5173** · React 19 + Vite 6 + Tailwind 4

Trang cửa hàng: trang chủ, danh sách và chi tiết hoa, giỏ hàng, thanh toán, đăng ký/đăng
nhập, hồ sơ, sổ địa chỉ, đơn hàng của tôi. Chỉ gọi Gateway `http://localhost:8080`, không
bao giờ gọi thẳng 8081/8082/8083.

## Chạy

Cần **Node 24**. Backend chạy trước (ít nhất `api-gateway`, `auth-service`, `product-service`).

```bat
cd customer-frontend
npm ci
npm run dev
```

Mở http://localhost:5173. Tài khoản thử: `john` / `john123`.

Thử thanh toán **ZaloPay** thì chạy `npm run dev:https` và mở https://localhost:5173
(chứng chỉ tự ký, trình duyệt cảnh báo một lần). ZaloPay chỉ đưa khách về địa chỉ
`https://`; `PAYMENT_RETURN_URL` bên payment-service phải đổi sang https cho khớp.

Cổng cố định 5173 (`strictPort`). Báo *"Port 5173 is already in use"* thì tắt tiến trình
vite cũ, **đừng** đổi cổng: Gateway chỉ cho phép CORS từ 5173 và 5174.

Đổi địa chỉ Gateway: chép `.env.example` thành `.env` rồi sửa `VITE_API_BASE_URL`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/pages/` | Mỗi trang một file: `HomePage`, `ProductsPage`, `CartPage`, `CheckoutPage`, `Account*Page`… |
| `src/components/home/` | Các khối của trang chủ |
| `src/components/shop/` | Thẻ sản phẩm, giỏ hàng, bước thanh toán, phân trang |
| `src/components/site/` | Header, footer, menu tài khoản, khung trang đăng nhập |
| `src/components/ui/` | Nút, ô nhập, hộp thoại, thông báo dùng chung |
| `src/context/` | `AuthContext` (phiên đăng nhập), `CartContext` (giỏ hàng) |
| `src/lib/api.ts` | Mọi lệnh gọi API: tự gắn JWT, gặp 401 thì tự đăng xuất |

## Kiểm tra trước khi commit

```bat
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Rồi bấm thử thật trên trình duyệt: đăng nhập, **F5 vẫn giữ phiên**, thêm vào giỏ, đặt hàng,
xem *Đơn hàng của tôi*. Mở DevTools → Network: mọi request phải đi tới `localhost:8080`.

## Liên quan tới admin-frontend

Trang quản trị là app riêng ở cổng 5174. Tài khoản ADMIN đăng nhập ở đây vẫn
mua hàng được, menu tài khoản có link *Trang quản trị ↗* sang app kia (phải đăng nhập lại
vì hai app không dùng chung localStorage). `src/lib/api.ts` hai bên giống nhau; sửa hàm
gọi API dùng chung thì sửa ở cả hai app.

[Quay lại README chung](../README.md)
