# payment-service — Thanh toán VNPay, MoMo, ZaloPay

Cổng **8084** · CSDL `bloom_payment` (tự tạo khi khởi động)

Tạo link thanh toán cho một đơn, kiểm chữ ký kết quả trả về và IPN của cổng thanh toán, đối
soát định kỳ các giao dịch còn treo, rồi báo `order-service` biết đơn đã được thanh toán.

## Chạy

```bat
cd payment-service
.\mvnw.cmd spring-boot:run
```

Cần MySQL, biến `DB_PASSWORD`, và `order-service` đang chạy. Khoá của từng cổng đặt bằng biến
môi trường; cổng nào chưa có khoá thì tự ẩn khỏi trang thanh toán (COD vẫn dùng được).

| Biến | Cổng | Lấy ở đâu |
|---|---|---|
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | VNPay | Email sau khi đăng ký https://sandbox.vnpayment.vn/devreg/ |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | MoMo | Khoá thử nghiệm trong tài liệu https://developers.momo.vn |
| `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` | ZaloPay | Ứng dụng thử nghiệm trong tài liệu https://docs.zalopay.vn |
| `PAYMENT_RETURN_URL` | cả ba | Mặc định `http://localhost:5173/payment/result` |
| `PAYMENT_PUBLIC_BASE_URL` | cả ba | Địa chỉ công khai để nhận IPN, mặc định `http://localhost:8080` |

## Endpoint (qua Gateway thêm tiền tố `/api`)

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/payments/methods` | Công khai — COD + cổng đã có khoá |
| POST | `/payments` | Chủ đơn — `{ orderId, provider }`, trả `payUrl` |
| POST | `/payments/return` | Công khai — tham số cổng gắn vào URL trả về, kiểm chữ ký |
| GET | `/payments/order/{orderId}` | Chủ đơn hoặc ADMIN |
| POST | `/payments/{id}/refresh` | Chủ giao dịch hoặc ADMIN — hỏi thẳng cổng |
| GET | `/payments` | ADMIN |
| GET | `/payments/vnpay/ipn` | VNPay gọi |
| POST | `/payments/momo/ipn` | MoMo gọi |
| POST | `/payments/zalopay/callback` | ZaloPay gọi |

## Luồng

1. Khách đặt đơn với `paymentMethod` = `VNPAY` / `MOMO` / `ZALOPAY` (`order-service`).
2. Frontend gọi `POST /payments`. Service hỏi `order-service` **tổng tiền thật** và chủ đơn
   (`GET /internal/orders/{id}`), không nhận số tiền từ client.
3. Trình duyệt sang trang cổng thanh toán, trả tiền, được đưa về `/payment/result`.
4. Frontend chuyển **nguyên** bộ tham số lên `POST /payments/return`. Service tính lại chữ
   ký bằng khoá bí mật, so số tiền, rồi báo `order-service` (`POST /internal/orders/{id}/paid`).
5. IPN (nếu cổng gọi được tới) đi cùng đường đó — ghi nhận là idempotent nên tới hai lần
   hay tới cùng lúc với bước 4 đều không sao.

## Chạy trên máy cá nhân: IPN không tới

Cổng thanh toán chỉ gọi IPN vào địa chỉ công khai trên Internet. Với `localhost`,
`PaymentReconciler` mỗi phút hỏi lại cổng (API truy vấn) các giao dịch còn chờ, đóng giao dịch
quá hạn (15 phút + 10 phút), và báo lại `order-service` nếu lần trước chưa báo được. Muốn thử
IPN thật thì mở tunnel (ngrok / cloudflared) tới cổng 8080 và đặt `PAYMENT_PUBLIC_BASE_URL`.

## File đáng đọc

- `gateway/VnpayGateway.java`, `MomoGateway.java`, `ZalopayGateway.java` — cách ký riêng của từng cổng
- `service/PaymentService.java` — tạo giao dịch, ghi nhận kết quả, báo `order-service`
- `service/PaymentReconciler.java` — đối soát định kỳ
- `src/test/.../GatewaySignatureTests.java` — chữ ký đối chiếu với vector tính bằng Node.js,
  và các trường hợp sửa tham số sau khi ký phải bị từ chối

[Quay lại README chung](../README.md)
