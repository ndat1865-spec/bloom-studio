# api-gateway — Điểm vào duy nhất

Cổng **8080** · Không có CSDL

Hai frontend và đối tác chỉ gọi vào đây. Gateway định tuyến `/api/**` sang 3 service phía
sau, khai CORS cho hai frontend, và kiểm tra API Key cho route đối tác `/api/public/**`.

## Chạy

```bat
cd api-gateway
.\mvnw.cmd spring-boot:run
```

Chạy đúng khi log có **`Netty started on port 8080`** — Gateway chạy nền WebFlux nên là
Netty, không phải Tomcat.

## Định tuyến

| Đường dẫn vào | Chuyển tới |
|---|---|
| `/api/auth/**`, `/api/users/**`, `/api/api-keys/**` | `auth-service` :8081 |
| `/api/products/**`, `/api/categories/**`, `/uploads/**` | `product-service` :8082 |
| `/api/orders/**` | `order-service` :8083 |
| `/api/public/products` (cần `X-API-KEY`) | `product-service` :8082 |

Địa chỉ service đọc từ biến `AUTH_SERVICE_URI`, `PRODUCT_SERVICE_URI`, `ORDER_SERVICE_URI`;
không đặt thì dùng `localhost`. Docker Compose đặt các biến này thành tên container.

## CORS

Khai **duy nhất** trong `src/main/resources/application.yml`, cho đúng hai origin:
`localhost:5173` (customer-frontend) và `localhost:5174` (admin-frontend). Không service nào
khác được tự khai CORS. Frontend chạy lệch cổng thì mọi request bị chặn và giao diện báo
nhầm là "không kết nối được server".

## File đáng đọc

- `src/main/resources/application.yml` — route và CORS
- `filter/ApiKeyFilter.java` — kiểm tra khoá đối tác, nhớ kết quả `PARTNER_KEY_CACHE_TTL` giây,
  luôn xoá `X-Partner-Name` do client tự gửi
- `client/ApiKeyValidationClient.java` — hỏi `auth-service`; dùng `WebClient.create(...)`,
  **không** dùng `RestTemplate` (chặn luồng của WebFlux)

[Quay lại README chung](../README.md)
