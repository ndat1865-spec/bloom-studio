# order-service — Đặt hàng và đơn hàng

Cổng **8083** · CSDL `bloom_order`

Nhận đơn đặt hàng, gọi sang `product-service` để trừ tồn kho, lưu đơn và trạng thái đơn.
Cung cấp số liệu doanh thu cho trang Tổng quan của quản trị.

## Chạy

```bat
cd order-service
.\mvnw.cmd spring-boot:run
```

Cần MySQL, CSDL `bloom_order`, biến `DB_PASSWORD`, và `product-service` đang chạy thì mới
đặt hàng được (xem đơn cũ thì không cần).

## Endpoint (qua Gateway thêm tiền tố `/api`)

| Method | Đường dẫn | Quyền |
|---|---|---|
| POST | `/orders` | Đã đăng nhập |
| GET | `/orders/my` | Đã đăng nhập — đơn của chính mình |
| GET | `/orders/{id}` | Chủ đơn hoặc ADMIN |
| GET | `/orders` | ADMIN |
| GET | `/orders/overview?from=&to=` | ADMIN |
| PUT | `/orders/{id}/status` | ADMIN — sang `CANCELLED` thì hoàn kho + trả lượt mã |
| DELETE | `/orders/{id}` | Chủ đơn hoặc ADMIN — huỷ đơn |
| GET | `/orders/options` | Công khai — thiệp, quà kèm, khung giờ, phí ship |
| GET | `/vouchers/public` | Công khai — mã đang dùng được |
| GET | `/vouchers/hunt` | Công khai — trang Săn voucher (có JWT thì biết mã nào đã lưu) |
| POST | `/vouchers/{code}/claim` | Đã đăng nhập — lưu mã săn vào ví |
| POST | `/vouchers/check` | Đã đăng nhập — xem trước số tiền giảm |
| GET, POST, PUT, DELETE | `/vouchers`, `/vouchers/{id}` | ADMIN |
| POST | `/orders/{id}/shipment` | ADMIN — tạo vận đơn GHN |
| POST | `/orders/{id}/shipment/refresh` | Chủ đơn hoặc ADMIN — hỏi GHN trạng thái |
| GET | `/shipping/provinces`, `/shipping/districts`, `/shipping/wards` | Công khai — danh mục địa giới GHN |
| POST | `/shipping/fee` | Đã đăng nhập — xem trước phí GHN |
| POST | `/shipping/ghn/webhook` | GHN gọi |
| GET | `/internal/orders/purchase-check` | Chỉ `product-service` gọi |
| GET | `/internal/orders/{id}`, POST `/internal/orders/{id}/paid` | Chỉ `payment-service` gọi |

Danh sách đầy đủ: [docs/blueprint-api.md](../docs/blueprint-api.md).

## Luồng đặt hàng

1. Lấy `userId` từ JWT — **không** nhận `userId` từ body. Có GHN thì đối chiếu mã
   tỉnh / quận / phường với danh mục GHN và hỏi phí giao hàng **trước** khi trừ kho.
2. Với từng dòng: gọi `PATCH /internal/products/{id}/reserve-stock` sang `product-service`.
3. Một dòng lỗi giữa chừng (hết hàng → 409) thì gọi `release-stock` hoàn lại các dòng đã trừ.
4. Cộng quà kèm và phí thiệp (giá lấy từ enum phía server), rồi kiểm tra mã giảm giá trên
   tổng tiền hoa + quà. Mã sai → 400, và các dòng đã trừ kho ở bước 2 được hoàn lại.
5. Lưu đơn **và** tăng lượt dùng mã trong cùng một transaction (`VoucherService.saveWithVoucher`).
   Đơn lưu kèm `productName`, `unitPrice`, `imageUrl` tại thời điểm đặt (không đọc CSDL
   của `product-service`).

Đơn chọn VNPay / MoMo / ZaloPay lưu `paymentStatus = UNPAID` rồi chờ `payment-service` báo.
Quá `ORDER_UNPAID_CANCEL_MINUTES` (mặc định 30) phút chưa trả thì `UnpaidOrderCanceller` tự
huỷ và hoàn kho.

## GHN

Đặt `GHN_TOKEN` và `GHN_SHOP_ID` (môi trường thử nghiệm: https://5sao.ghn.dev). Không đặt thì
địa chỉ gõ tự do và phí giao hàng cố định 30.000đ như trước. Tiền tệ là VND; miễn phí giao
hàng khi tiền hàng sau giảm giá từ 800.000đ.

## File đáng đọc

- `client/ProductClient.java` — gọi sang `product-service` (địa chỉ từ `PRODUCT_SERVICE_URL`)
- `config/RestTemplateConfig.java` — phải dùng `JdkClientHttpRequestFactory`; mặc định
  `RestTemplate` không gửi được PATCH
- `service/OrderService.java` — đặt hàng và bù trừ
- `service/OrderOverviewService.java` — doanh thu, biểu đồ theo ngày, top bán chạy
- `shipping/GhnClient.java`, `shipping/ShippingService.java` — gọi GHN
- `repository/OrderRepository.java` — các câu `UPDATE ... WHERE` có điều kiện để thanh toán
  và huỷ đơn cùng lúc không ghi đè nhau

Muốn test hết hàng thì đặt `quantity: 99` (tồn kho mặc định 50). Số lớn hơn 99 bị chặn
`400` ở validation trước khi tới bước kiểm tra tồn kho.

[Quay lại README chung](../README.md)
