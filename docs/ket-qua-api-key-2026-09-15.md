# Kết quả kiểm thử API Key động — 15/09/2026

Phạm vi: thay khoá đối tác tĩnh trong `application.yml` bằng khoá quản lý động trong
`auth-service`.

Cách đo: bản đang dùng vẫn chạy code cũ ở 8080/8081/8082 nên **không đụng tới**. Bản mới chạy song song ở cổng riêng: `auth-service` 8181, `api-gateway` 8180
(`AUTH_SERVICE_URI=http://localhost:8181`), dùng chung `product-service` 8082 vì phần
này không đổi. Mọi lệnh gọi đều đi qua Gateway 8180.

## Kết quả: 21/21 đạt

### Luồng đối tác — `GET /api/public/products`

| # | Tình huống | Mong đợi | Quan sát |
|---|---|---|---|
| 1 | Không gửi `X-API-KEY` | 401 | 401 `{"message":"Thiếu header X-API-KEY"}` |
| 2 | Khoá demo cũ `bloom-partner-key-2026` | 200 | 200, trả 20 sản phẩm |
| 3 | Khoá sai | 403 | 403 `{"message":"API Key không hợp lệ"}` |
| 8 | Khoá vừa cấp | 200 | 200 |
| 10 | Khoá vừa bị thu hồi | 403 | 403 |
| 13 | Khoá demo cũ vẫn chạy sau khi thu hồi khoá khác | 200 | 200 |
| 14 | Khoá chỉ có scope `orders:read` | 403 | 403 (lý do `THIEU_SCOPE`) |
| 16 | `auth-service` chết, gửi khoá thật | 503, không cho qua | 503 `{"message":"Chưa kiểm tra được API Key, thử lại sau"}` |

Bước 16 là điểm quan trọng nhất: một lớp bảo mật mà "lỗi thì cho qua" coi như không có.
Lần đo đầu ra 200 nhầm vì tiến trình `auth-service` chưa chết thật — `mvnw spring-boot:run`
sinh JVM con, giết tiến trình Maven không giết JVM đó. Giết đúng tiến trình đang nghe
cổng rồi đo lại mới ra 503.

### Quản trị — `/api/api-keys` (qua Gateway, cần JWT của ADMIN)

| # | Tình huống | Mong đợi | Quan sát |
|---|---|---|---|
| 4 | CUSTOMER gọi danh sách | 403 | 403 |
| 5 | Không đăng nhập | 401 | 401 |
| 6 | ADMIN cấp khoá mới | 201 + khoá gốc | 201, `keyValue` `bloom_pk_…`, kèm câu cảnh báo chỉ hiện một lần |
| 7 | ADMIN xem danh sách | **không có khoá gốc** | chỉ `keyPrefix`; so khớp chuỗi: không chứa khoá gốc |
| 9 | Thu hồi | 200, `status=REVOKED` | đúng |
| 11 | Thu hồi lần hai | 409 | 409 `{"message":"Khoá này đã bị thu hồi trước đó"}` |
| 12 | Thu hồi khoá không tồn tại | 404 | 404 |

### Chống giả mạo danh tính và cache

| # | Tình huống | Mong đợi | Quan sát |
|---|---|---|---|
| 18 | Khoá hợp lệ | service sau nhận `X-Partner-Name` do Gateway gán | `"Doi tac demo"` |
| 19 | Client tự bịa `X-Partner-Name: Toi la doi tac VIP` | header bịa bị thay bằng chủ sở hữu thật | `"Doi tac demo"` |
| 20 | Client bịa header trên route thường | header bị xoá hẳn | `null` |
| 21 | 5 request liên tiếp cùng khoá | chỉ tra cứu CSDL ở lần đầu | 0 truy vấn `api_keys` thêm |

Bước 18–20 đo bằng một server giả dựng tạm ở cổng 9099 in lại header Gateway chuyển
xuống, trỏ `PRODUCT_SERVICE_URI` vào đó. Bước 21 đếm số dòng `select … from api_keys`
trong log của `auth-service` (`show-sql=true`).

## Lỗi phát hiện khi chạy thật

**`WebClient.Builder` không có bean trong api-gateway.** Bản đầu tiêm
`WebClient.Builder` qua constructor: biên dịch sạch, chết ngay lúc khởi động với
*No qualifying bean of type WebClient$Builder* — starter của Gateway không kéo theo
auto-config đăng ký bean đó. Đổi sang `WebClient.create(baseUrl)`. Cùng kiểu lỗi
"biên dịch sạch, chỉ lộ lúc chạy" như khi quên `@ConfigurationPropertiesScan`.

## Đánh đổi đã biết

- **Thu hồi có độ trễ tới `partner.cache-ttl-seconds`** (mặc định 60 giây). Khi trình bày
  cảnh thu hồi thì đặt `PARTNER_KEY_CACHE_TTL=0` để có hiệu lực tức thì — toàn bộ ma trận
  trên chạy ở chế độ này, trừ bước 21 đo đúng phần cache.
- `/internal/api-keys/validate` chỉ được bảo vệ bằng việc **không khai route nào** trỏ tới
  `/internal/**` ở Gateway, giống `/internal/**` của `product-service`. Hệ thống thật phải
  chặn ở tầng mạng hoặc ký request giữa các service.
- Khoá demo `bloom-partner-key-2026` được `DataSeeder` nạp lại dưới dạng khoá động để tài
  liệu và ảnh chụp Postman đã có vẫn chạy. Khoá thật cấp cho đối tác phải tạo qua
  `POST /api/api-keys`.
