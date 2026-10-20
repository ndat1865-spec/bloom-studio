# notification-service — Email tự động qua RabbitMQ

Cổng **8085** · CSDL `bloom_notification` (tự tạo)

Nghe sự kiện đơn hàng mà `order-service` phát lên RabbitMQ, gửi email cho khách và cho hộp thư
cửa hàng, ghi nhật ký từng thư. Không service nào gọi đồng bộ vào đây để làm nghiệp vụ.

## Chạy

Cần RabbitMQ và một máy chủ SMTP. Cách nhanh nhất là bật hai container:

```bat
docker compose up -d rabbitmq mailpit
cd notification-service
.\mvnw.cmd spring-boot:run
```

Thư gửi đi xem ở http://localhost:8025 (Mailpit). Hàng đợi xem ở http://localhost:15672
(`guest` / `guest`).

## Sự kiện → email

| Sự kiện | Khách | Cửa hàng |
|---|---|---|
| `order.placed` | Xác nhận đã nhận đơn | Đơn mới |
| `order.paid` | Đã nhận thanh toán | Đơn đã thanh toán |
| `order.shipped` | Đã giao cho GHN, mã vận đơn | — |
| `order.delivered` | Đã giao thành công | — |
| `order.cancelled` | Đơn đã huỷ (kèm ghi chú hoàn tiền nếu đã trả) | Cần hoàn tiền (nếu đã trả) |
| `order.refunded` | Đã hoàn tiền | — |

Email khách lấy từ `auth-service` (`GET /internal/users/{id}/contact`) lúc gửi, không nằm trong
sự kiện. Tài khoản chưa khai email thì ghi `SKIPPED`.

## Chịu lỗi

- **Tin giao lặp:** `(eventId, người nhận)` là khoá duy nhất — không gửi hai thư giống nhau.
- **SMTP lỗi / không tra được email:** ghi `FAILED`, không ném lỗi (ném ra thì RabbitMQ thử lại
  cả sự kiện và gửi trùng cho người đã nhận).
- **Tin hỏng (JSON sai):** thử 3 lần rồi chuyển sang `notification.order-events.dlq`, không lặp vô hạn.
- **Service tắt:** queue bền, tin nằm chờ; bật lại thì gửi bù.

## Endpoint (qua Gateway, ADMIN)

| Method | Đường dẫn |
|---|---|
| GET | `/api/notifications?page=&size=` |
| GET | `/api/notifications/order/{orderId}` |

[Quay lại README chung](../README.md)
