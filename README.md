# Bloom Studio — Website bán hoa

Đồ án môn Phát triển phần mềm hướng dịch vụ: **Thiết kế và phát triển nền tảng thương mại
điện tử bán hoa theo kiến trúc hướng dịch vụ dựa trên RESTful API.**

Sinh viên thực hiện: **Nguyễn Tiến Đạt**. Hệ thống tách từ một bản monolith thành 6 dịch vụ
backend và 2 giao diện.
Thanh toán và hoàn tiền trực tuyến qua **VNPay, MoMo, ZaloPay**; giao hàng qua **Giao Hàng
Nhanh (GHN)**; email tự động qua **RabbitMQ**.

## Các thành phần

| Thành phần | Chức năng | Thư mục | Cổng |
|---|---|---|---|
| API Gateway | Điểm vào duy nhất: định tuyến, CORS, kiểm tra JWT và API Key | `api-gateway/` | 8080 |
| Xác thực | JWT, BCrypt, đăng nhập Google, người dùng, API Key | `auth-service/` | 8081 |
| Sản phẩm | Hoa, danh mục, tồn kho, đánh giá | `product-service/` | 8082 |
| Đơn hàng | Đặt hàng, mã giảm giá, giao hàng GHN | `order-service/` | 8083 |
| Thanh toán | VNPay, MoMo, ZaloPay (thanh toán + hoàn tiền) | `payment-service/` | 8084 |
| Thông báo | Nghe RabbitMQ, gửi email | `notification-service/` | 8085 |
| Chat | Chat khách – studio, bot gợi ý hoa + trợ lý AI | `chat-service/` | 8086 |
| Giao diện khách hàng | Cửa hàng, giỏ hàng, thanh toán, tài khoản | `customer-frontend/` | 5173 |
| Giao diện quản trị | Tổng quan, quản lý hoa, danh mục, đơn hàng, khoá API | `admin-frontend/` | 5174 |

Mỗi thư mục có `README.md` riêng: phần đó làm gì, chạy thế nào, file nào quan trọng.

## Kiến trúc

```
   customer-frontend :5173 ─┐
                            ├──►┌──────────────┐
   admin-frontend    :5174 ─┘   │ api-gateway  │ :8080   điểm vào duy nhất
                                └──────┬───────┘
                                       │
      ┌───────────────────┬───────────┴─────────┬──────────────────────┐
      ▼                   ▼                     ▼                      ▼
┌─────────────┐   ┌───────────────┐     ┌─────────────┐        ┌───────────────┐
│auth-service │   │product-service│     │order-service│        │payment-service│
│   :8081     │   │    :8082      │     │    :8083    │        │     :8084     │
│ bloom_auth  │   │ bloom_product │     │ bloom_order │        │ bloom_payment │
└─────────────┘   └──────▲────────┘     └──┬───▲──────┘        └───┬───────────┘
                         └─ reserve-stock ─┘   └─ /internal/orders ─┘
                                           │                        │
                                           ▼                        ▼
                                          GHN            VNPay · MoMo · ZaloPay
                                           │
                            order.* (RabbitMQ, bất đồng bộ)
                                           ▼
                                ┌────────────────────┐
                                │notification-service│ :8085  → email (Mailpit)
                                │ bloom_notification │
                                └────────────────────┘
```

- Mỗi service một CSDL riêng, **không service nào đọc CSDL của service khác**.
- Hai frontend chỉ biết một địa chỉ: Gateway `localhost:8080`. CORS khai **duy nhất** ở Gateway.
- Luồng gọi giữa các service: `order-service` → `product-service` (trừ / hoàn tồn kho),
  `product-service` → `order-service` (đã mua chưa, trước khi cho đánh giá),
  `payment-service` → `order-service` (tổng tiền thật, báo đã thanh toán).
- Giao tiếp bất đồng bộ: `order-service` phát sự kiện `order.*` lên RabbitMQ,
  `notification-service` nghe và gửi email. Tắt notification-service thì đặt hàng vẫn chạy.
- Chat: `chat-service` (:8086, `bloom_chat`) — trợ lý tự động trả lời trước: bot kịch bản miễn
  phí (gợi ý hoa theo dịp + ngân sách, giờ giao, đơn của khách) và **Claude API** khi có khoá; dữ
  liệu thật lấy qua API của `product-service` / `order-service`, cần thì chuyển nhân viên.
- Ba lớp bảo mật: **JWT** cho người dùng, **API Key** cho đối tác (`/api/public/**`, có giới
  hạn tần suất theo từng khoá), **chữ ký HMAC** cho kết quả và IPN của cổng thanh toán.
- Chịu lỗi: timeout tường minh + **circuit breaker** (Resilience4j) cho mọi lời gọi ra ngoài.
- Tiền tệ: **VND** ở mọi nơi.

Chi tiết: [Ranh giới service](docs/thiet-ke-bien-gioi-service.md) ·
[Danh sách API](docs/blueprint-api.md) · [Hướng dẫn chạy](docs/huong-dan-chay.md) ·
[Chạy bằng IntelliJ](docs/huong-dan-chay-intellij.md)

## Cấu trúc

```
bloom-studio/
├── auth-service/        # JWT, BCrypt, người dùng, API Key
├── api-gateway/         # định tuyến, CORS, kiểm tra API Key
├── product-service/     # hoa, danh mục, ảnh, tồn kho
├── order-service/       # đặt hàng, trạng thái đơn, thống kê, giao hàng GHN
├── payment-service/     # VNPay, MoMo, ZaloPay
├── notification-service/# nghe RabbitMQ, gửi email
├── chat-service/        # chat khách – studio, bot gợi ý hoa + Claude API
├── customer-frontend/   # cửa hàng, giỏ hàng, thanh toán, tài khoản
├── admin-frontend/      # tổng quan, quản lý hoa/danh mục/đơn/khoá API
├── database/            # script chuyển dữ liệu từ bản monolith
├── docs/                # Thiết kế, API, hướng dẫn chạy, biên bản kiểm thử, bộ Postman (docs/postman)
├── docker-compose.yml   # 7 service + 6 MySQL + RabbitMQ + Mailpit
└── .env.example         # Mẫu biến môi trường cho Docker Compose
```

## Chạy bằng Docker (khuyên dùng)

Cả backend (7 service, 6 MySQL, RabbitMQ, Mailpit) chạy bằng **một lệnh**, không phải cài
JDK hay MySQL. Hai frontend vẫn chạy bằng `npm run dev`.

### Chuẩn bị (một lần)

1. Cài **Docker Desktop** và mở lên, đợi biểu tượng cá voi báo *running*.
2. Docker Desktop → Settings → Resources: cho **RAM từ 6 GB** trở lên. 7 service Java + 6 MySQL,
   ít RAM hơn thì Docker dễ sập giữa chừng.
3. Cài **Node 24** cho hai frontend.
4. Tạo file `.env` ở thư mục gốc repo từ file mẫu, rồi sửa `DB_PASSWORD`:

```bash
cp .env.example .env
```

   Trên Command Prompt dùng `copy .env.example .env`. File `.env` chứa mật khẩu và khoá dịch vụ
   ngoài — **không bao giờ commit**. Các khoá để trống thì tính năng đó tự ẩn (xem
   [Khoá dịch vụ bên ngoài](#khoá-dịch-vụ-bên-ngoài)).

### Mỗi lần chạy

**1. Bật backend** (ở thư mục gốc repo). Lần đầu, hoặc sau khi sửa code Java, thêm `--build`:

```bash
docker compose up -d --build
```

Lần đầu lâu (tải ảnh nền và thư viện Maven, có thể vài chục phút). Những lần sau, không sửa
code thì chỉ cần:

```bash
docker compose up -d
```

**2. Đợi 1–2 phút** cho các service Java khởi động, rồi kiểm tra — mọi dòng phải là `running`
hoặc `healthy`:

```bash
docker compose ps
```

**3. Bật trang khách** — mở một terminal riêng (lần đầu chạy `npm ci` trước):

```bash
cd customer-frontend
npm ci
npm run dev
```

**4. Bật trang quản trị** — thêm một terminal nữa:

```bash
cd admin-frontend
npm ci
npm run dev
```

Hai frontend không nằm trong Docker: đóng terminal là trang web tắt, backend vẫn chạy.

### Địa chỉ

| Mở | Để làm gì |
|---|---|
| http://localhost:5173 | Cửa hàng: xem hoa, giỏ hàng, đặt hàng, đơn của tôi, chat với studio |
| http://localhost:5174 | Quản trị: chỉ ADMIN / nhân viên đăng nhập được |
| http://localhost:8080/api/products | Gọi thẳng API qua Gateway |
| http://localhost:8025 | Hộp thư Mailpit — xem email hệ thống gửi |
| http://localhost:15672 | Quản trị RabbitMQ (`guest` / `guest`) — xem queue, DLQ |

Chạy bằng Docker thì **chỉ Gateway (8080)** lộ ra ngoài; các service 8081–8086 chỉ gọi được
bên trong mạng của Compose. "Gateway là điểm vào duy nhất" thành điều kiện kỹ thuật thật.

Hai frontend **không dùng chung phiên đăng nhập** (localStorage tách theo cổng).

### Lệnh hay dùng

Xem log một service khi có lỗi (`Ctrl + C` để thoát):

```bash
docker compose logs -f order-service
```

Sửa code một service thì chỉ build lại service đó:

```bash
docker compose up -d --build order-service
```

Tắt backend, giữ nguyên dữ liệu:

```bash
docker compose stop
```

Xoá container, vẫn giữ dữ liệu:

```bash
docker compose down
```

> ⚠️ `docker compose down -v` **xoá sạch cả 6 CSDL** (tài khoản, đơn hàng, mã giảm giá, ảnh…).
> Chỉ dùng khi muốn làm lại từ đầu, **không** dùng trước buổi demo.

Trên CSDL trắng, `product-service` tự nạp danh mục hoa mẫu; `auth-service` tự tạo các tài
khoản thử và khoá đối tác demo.

Trước buổi thuyết trình: chạy `docker compose up -d` sớm 5 phút, mở thử cả trang khách lẫn
trang quản trị một lượt.

## Chạy tay (không Docker)

Dùng khi cần debug một service trong IDE. Chi tiết từng bước ở
[hướng dẫn chạy](docs/huong-dan-chay.md) và [chạy bằng IntelliJ](docs/huong-dan-chay-intellij.md).

### Chuẩn bị

- **JDK 17**, `JAVA_HOME` trỏ đúng JDK 17 (không phải JDK 11). Mỗi service có Maven Wrapper,
  không cần cài Maven.
- **MySQL 8** đang chạy. Tạo ba CSDL một lần (`bloom_payment` do `payment-service` tự tạo):

```sql
CREATE DATABASE bloom_auth    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE bloom_product CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE bloom_order   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

  CSDL đã có dữ liệu từ trước (giá GBP) thì chạy thêm một lần
  `database/gbp-sang-vnd-product.sql` và `database/gbp-sang-vnd-order.sql`.

- Biến môi trường **`DB_PASSWORD`** = mật khẩu root MySQL (User variables trong Windows).
  Mật khẩu không nằm trong file nào để không lọt lên Git. Đặt xong phải đóng hẳn
  terminal/IntelliJ rồi mở lại.
- **Node 24** cho hai frontend.

Bảng được tạo tự động khi service khởi động lần đầu. `product-service` tự nạp 20 sản phẩm
mẫu khi bảng còn rỗng; `auth-service` tự tạo tài khoản `admin` và `john`.

### Chạy

Thứ tự: `auth-service` → `product-service` → `order-service` → `payment-service` → `api-gateway`
→ hai frontend.
Mỗi thành phần một terminal, bắt đầu từ thư mục gốc repo:

```bat
cd auth-service
.\mvnw.cmd spring-boot:run
```

Làm tương tự với `product-service`, `order-service`, `payment-service`, `api-gateway`. Hai frontend:

```bat
cd customer-frontend
npm ci
npm run dev
```

```bat
cd admin-frontend
npm ci
npm run dev
```

Trên macOS/Linux dùng `./mvnw spring-boot:run` thay cho `.\mvnw.cmd spring-boot:run`.

Địa chỉ mở giống như khi chạy Docker (bảng ở trên).

`notification-service` cần RabbitMQ và một máy chủ SMTP. Chạy tay thì bật hai thứ đó bằng
`docker compose up -d rabbitmq mailpit`. Không có RabbitMQ thì đặt hàng vẫn chạy, chỉ không có
email.

## Khoá dịch vụ bên ngoài

Đặt trong file `.env` khi chạy Docker (mẫu ở `.env.example`), hoặc User variables trên Windows
khi chạy tay. **Không** ghi khoá vào file nào commit lên Git. Sửa `.env` xong thì chạy lại
`docker compose up -d` để service nhận giá trị mới.

| Biến | Của | Không đặt thì |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `auth-service` | Nút "Đăng nhập bằng Google" tự ẩn, chỉ còn đăng nhập mật khẩu |
| `ANTHROPIC_API_KEY` | `chat-service` | Chỉ dùng bot kịch bản miễn phí, không có Claude trả lời câu gõ tự do |
| `GHN_TOKEN`, `GHN_SHOP_ID` | `order-service` | Địa chỉ gõ tự do, phí giao hàng cố định 30.000đ, không tạo vận đơn được |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | `payment-service` | VNPay ẩn khỏi trang thanh toán |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | `payment-service` | MoMo ẩn |
| `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` | `payment-service` | ZaloPay ẩn |

**Đăng nhập bằng Google** chỉ chạy ở đúng `http://localhost:5173` (địa chỉ đã khai ở Google
Cloud). Ứng dụng Google đang ở chế độ thử nghiệm nên chỉ các Gmail nằm trong danh sách
*Test users* mới đăng nhập được.

GHN và ba cổng thanh toán mặc định trỏ vào môi trường **thử nghiệm**, không có tiền thật. Chạy trên máy
cá nhân thì cổng thanh toán không gọi được IPN vào `localhost`; `payment-service` tự hỏi lại
cổng mỗi phút nên đơn vẫn chuyển "Đã thanh toán" (chậm tối đa khoảng một phút), hoặc bấm
*Tôi đã trả — kiểm tra lại* trên trang đơn.

## Tài khoản thử

| Username | Mật khẩu | Quyền |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `john` | `john123` | CUSTOMER |
| `staff` | `staff123` | STAFF (nhân viên) |

Thẻ thử của VNPay sandbox (ngân hàng NCB): số thẻ `9704198526191432198`, tên
`NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456`.

API Key đối tác demo: `bloom-partner-key-2026` (header `X-API-KEY`, route `/api/public/**`).

## Môi trường

JDK 17 · Spring Boot 4.1.1 · Spring Cloud 2025.1.3 · JJWT 0.12.6 · MySQL 8 · Node 24 ·
React 19 + Vite 6 + Tailwind 4

## Quy ước trong mã nguồn

- Commit: `feat(<service>): ...`, `fix(<service>): ...`, `docs: ...` — tiếng Việt không dấu.
- Đổi API thì cập nhật luôn `docs/blueprint-api.md`.
- Package Java: `dh13c6.nguyentiendat516.bloom.<tenservice>`. Không dùng Lombok. Comment
  trong code viết tiếng Việt không dấu.
- Mọi định danh lấy từ JWT, không bao giờ tin `userId`/`role` do client gửi.
- Không commit `target/`, `node_modules/`, `dist/`, `.env`, `.idea/`, thư mục `uploads/` lúc chạy.
- Biên dịch sạch chưa chắc chạy được: sửa xong phải khởi động thật và gọi thử API.
