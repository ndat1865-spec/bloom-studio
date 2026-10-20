# Thiết kế biên giới Service — Bloom Studio

> Đồ án: **Thiết kế và phát triển nền tảng thương mại điện tử bán hoa theo kiến trúc
> hướng dịch vụ dựa trên RESTful API.**
>
> Tài liệu này chốt ranh giới giữa các service. Đây là bước quan trọng nhất: sai biên giới
> từ đầu sẽ kéo theo sửa chữa tốn kém ở các giai đoạn sau.

## 1. Danh sách Service

| Service | Cổng | Database | Trách nhiệm chính |
|---|---|---|---|
| `api-gateway` | 8080 | (không có DB) | Điểm vào duy nhất, định tuyến, chặn sớm, CORS |
| `auth-service` | 8081 | `bloom_auth` | User, đăng ký/đăng nhập (mật khẩu hoặc Google), sinh và ký JWT, quản lý API Key |
| `product-service` | 8082 | `bloom_product` | Category, Product (thành phần, số bông, cỡ bó, số ngày đặt trước), tìm kiếm/lọc theo dịp–màu–giá, upload ảnh, tồn kho, đánh giá sản phẩm |
| `order-service` | 8083 | `bloom_order` | Đặt hàng (cỡ bó, người tặng, thiệp, quà kèm, khung giờ, giờ chốt đơn, vùng giao), trạng thái đơn, ảnh bó hoa thành phẩm, đặt hoa theo yêu cầu (báo giá), mã giảm giá, gọi sang product-service trừ tồn kho, giao hàng qua GHN (phí, vận đơn) |
| `payment-service` | 8084 | `bloom_payment` | Thanh toán trực tuyến VNPay / MoMo / ZaloPay: tạo link, kiểm chữ ký kết quả và IPN, đối soát, hoàn tiền, báo order-service |
| `notification-service` | 8085 | `bloom_notification` | Nghe sự kiện đơn hàng trên RabbitMQ, gửi email cho khách và cửa hàng, giữ nhật ký gửi |
| `chat-service` | 8086 | `bloom_chat` | Chat khách – studio: trợ lý AI (Claude API) trả lời trước, dùng dữ liệu thật của product-service và order-service; chuyển nhân viên khi cần; hộp thư cho nhân viên |
| RabbitMQ | 5672 (quản trị 15672) | — | Hàng đợi tin nhắn giữa order-service và notification-service |
| `customer-frontend` | 5173 | — | React + Vite, giao diện khách hàng, chỉ nói chuyện với Gateway |
| `admin-frontend` | 5174 | — | React + Vite, giao diện quản trị (chỉ nhận ADMIN), chỉ nói chuyện với Gateway |

Mỗi thư mục con là một project Spring Boot độc lập, mở bằng một cửa sổ IntelliJ riêng.

Kiểm thử frontend ngày 15/09/2026 xác nhận hai trách nhiệm tại service sở hữu:
auth-service chuyển lỗi thông tin đăng nhập thành HTTP 401; product-service phục vụ
ảnh seed từ classpath qua `/uploads/seed/**`. Gateway giữ nguyên vai trò định tuyến,
frontend đọc cả API lẫn ảnh sản phẩm qua cổng 8080.

## 2. Vì sao chia như vậy

Ranh giới được cắt theo **năng lực nghiệp vụ**, không theo tầng kỹ thuật:

- **Danh tính** (ai đang mua) thay đổi vì lý do khác hẳn **danh mục hàng** (bán gì) và
  **đơn hàng** (đã mua gì). Ba nhóm dữ liệu này có nhịp thay đổi khác nhau.
- `Category` và `Product` **luôn đi cùng nhau** — không tách, vì mọi thao tác với sản phẩm
  đều cần danh mục, tách ra sẽ sinh lời gọi mạng cho một quan hệ 1-N tầm thường.
- `Order` và `OrderItem` cũng luôn đi cùng nhau — `OrderItem` không có ý nghĩa độc lập
  ngoài đơn hàng chứa nó.
- **Mã giảm giá nằm ở `order-service`**, không tách service riêng: tăng lượt dùng mã và lưu
  đơn phải nằm trong **cùng một transaction** (hai khách tranh lượt cuối cùng thì chỉ một
  người được). Việc đó chỉ làm được khi bảng `vouchers` và bảng `orders` chung một CSDL.
  Mã **tặng riêng** một khách lưu `owner_user_id` (id từ JWT) kèm bản sao `owner_username`
  để hiển thị — `order-service` không gọi sang `auth-service` mỗi lần liệt kê mã. Mã riêng
  của người khác được báo "không tồn tại" để không lộ mã.
  Mã **săn** (`claim_required`) chỉ dùng được sau khi khách bấm Lưu ở trang Săn voucher;
  bảng `voucher_claims` (unique `voucher_id + user_id`) ghi ai đã lưu, `claimed_count` tăng
  bằng `UPDATE` có điều kiện như lượt dùng nên hai khách tranh lượt lưu cuối chỉ một người được.
- **Đánh giá nằm ở `product-service`**: đánh giá gắn với sản phẩm, trang sản phẩm cần điểm
  trung bình ngay trong danh sách. Để tránh 20 câu `AVG()` mỗi trang, điểm và số đánh giá
  được lưu sẵn trên bảng `products`.
- **Thiệp, quà kèm, khung giờ** là thuộc tính của đơn nên ở `order-service`, khai dạng enum
  (danh sách ngắn, ít đổi); giá do server quyết, client chỉ gửi mã.
- **Cỡ bó nằm ở `product-service`, nhưng giá từng cỡ đi kèm response sản phẩm.** Chỉ
  product-service biết giá gốc và hệ số; `order-service` chọn dòng khớp cỡ khách chọn trong
  `sizes` mà `reserve-stock` trả về, không tự nhân hệ số. Đổi cách tính giá cỡ chỉ sửa một nơi.
- **Đặt hoa theo yêu cầu nằm ở `order-service`**, không tách service: "đồng ý báo giá" chính là
  đặt hàng — yêu cầu thành một dòng `OrderItem` (`customRequestId`, giá = giá đã báo) và đi qua
  đúng luồng thanh toán, giao hàng, huỷ, hoàn tiền của đơn thường. Tách ra thì phải đồng bộ
  trạng thái yêu cầu ↔ đơn qua mạng mà không có dữ liệu riêng nào đáng kể.
- **Ảnh bó hoa thành phẩm thuộc về đơn**, nên lưu ở `order-service` (`/order-media/**`), không
  mượn chỗ upload của product-service — ảnh sản phẩm là catalogue, ảnh thành phẩm là bằng
  chứng giao hàng của từng đơn.
- **Quy tắc giao hoa tươi** (giờ chốt đơn, vùng giao nội thành, số ngày đặt trước) kiểm ở
  `order-service` lúc đặt hàng (`DeliveryPolicy`) và công bố qua `GET /orders/options` để
  frontend không tự khai lại. `leadDays` của từng bó vẫn do product-service quản lý.
- **Chat tách thành `chat-service` riêng**: có dữ liệu riêng (cuộc chat, tin nhắn), có khoá bí
  mật riêng (Claude API) và nhịp thay đổi riêng (đổi model, sửa lời dặn cho AI không được đụng
  tới đặt hàng). Trợ lý AI chỉ có công cụ **đọc** (tìm hoa, xem quy tắc giao, xem đơn của chính
  khách) và một công cụ chuyển nhân viên — không có công cụ đặt hàng, sửa đơn hay áp mã giảm
  giá. Soạn trả lời chạy ở luồng riêng: gửi tin trả về ngay, client hỏi định kỳ lấy câu trả lời.
  Luôn có **bot kịch bản** miễn phí (nút bấm + bắt từ khoá) dùng cùng dữ liệu thật; thiếu
  `ANTHROPIC_API_KEY` thì bot trả lời cả câu gõ tay — không phụ thuộc dịch vụ bên ngoài.
- **Thanh toán tách thành `payment-service` riêng**: nó có dữ liệu riêng (mỗi lần bấm
  "Thanh toán" là một giao dịch, một đơn có thể có nhiều giao dịch thất bại trước khi thành
  công), có khoá bí mật riêng của ba cổng, và có nhịp thay đổi riêng (thêm cổng thứ tư
  không được phép đụng tới nghiệp vụ đặt hàng). `order-service` chỉ giữ **kết quả** —
  `paymentMethod`, `paymentStatus`, mã giao dịch đã trả.
- **GHN nằm trong `order-service`**, không tách service: phí giao hàng là một phần của tổng
  tiền, phải tính trong **cùng lúc** đặt hàng. Tách ra thì mỗi lần đặt hàng thêm một lời gọi
  mạng nội bộ mà service mới cũng không có dữ liệu riêng nào — dữ liệu vận đơn nằm ở GHN.
  Code GHN gom trong gói `shipping` (`GhnClient`, `ShippingService`) để tách ra sau này
  không phải sửa `OrderService`.
- **Địa chỉ mặc định theo GHN lưu ở `auth-service`, nhưng `auth-service` không gọi GHN.**
  Sổ địa chỉ là thuộc tính của người dùng nên nằm trên bảng `users` (`province_id`,
  `district_id`, `ward_code` và `area_label` là tên ghép sẵn để hiển thị). Frontend chọn
  Tỉnh / Quận / Phường qua `/api/shipping/*` của `order-service` rồi gửi mã về
  `auth-service` lưu lại. `auth-service` chỉ kiểm tra ba mã đi đủ bộ, không hỏi GHN mã có
  thật không: địa chỉ mặc định chỉ để điền sẵn form. Lúc đặt hàng `order-service` mới hỏi
  GHN và từ chối nếu mã không còn đúng. Nhờ vậy GHN vẫn chỉ có một chỗ gọi duy nhất.
- **Thông báo tách thành `notification-service` và nói chuyện bất đồng bộ qua RabbitMQ.**
  Gửi email chậm (SMTP vài giây) và hay lỗi, nhưng không bao giờ được phép làm hỏng việc
  đặt hàng. Gọi REST đồng bộ thì order-service phải chờ và phải xử lý lỗi của nó; phát sự
  kiện thì order-service chỉ "kể lại chuyện vừa xảy ra" rồi đi tiếp, không cần biết ai nghe.
  Thêm service mới quan tâm tới đơn hàng (thống kê, tích điểm) chỉ cần tạo queue mới buộc vào
  exchange — order-service không phải sửa dòng nào.

## 3. Nguyên tắc sở hữu dữ liệu (Data Ownership)

- Mỗi service có **database riêng**. Không service nào truy cập trực tiếp DB của service khác.
- Muốn lấy hoặc đổi dữ liệu của service khác → **phải gọi REST API**.

### Hai khoá ngoại bị cắt khi tách

| Trước (monolith) | Sau (microservices) |
|---|---|
| `Order.user` → `@ManyToOne User` | `Order.userId` kiểu `Long`, không khoá ngoại |
| `OrderItem.product` → `@ManyToOne Product` | `OrderItem.productId` kiểu `Long`, không khoá ngoại |

Việc cắt này **không làm mất dữ liệu hiển thị**, vì mô hình đã denormalize sẵn từ trước:

```java
// OrderItem đã lưu bản sao tại thời điểm đặt hàng
private String  productName;
private Double  unitPrice;
private Double  lineTotal;

// Order đã lưu bản sao thông tin người nhận
private String  customerName;
private String  phone;
private String  address;
```

Đây không phải giải pháp chữa cháy mà là **cách làm đúng**: giá hoa hôm nay đổi thì đơn
hàng tháng trước vẫn phải giữ nguyên giá cũ. Nếu `OrderItem` đọc giá qua khoá ngoại thì
mọi hoá đơn cũ sẽ tự động sai khi admin sửa giá.

### Hệ quả phải chấp nhận

- Không `JOIN` xuyên service, không ràng buộc toàn vẹn ở tầng DB giữa `order` và `product`.
- Tính nhất quán do tầng ứng dụng bảo đảm bằng lời gọi API và xử lý lỗi, không phải bằng
  transaction của MySQL.

## 4. Giao tiếp liên-service

Có **bốn** luồng gọi giữa các service nghiệp vụ:

```
order-service    ──PATCH /internal/products/{id}/reserve-stock──►  product-service
                 ──PATCH /internal/products/{id}/release-stock──►

product-service  ──GET /internal/orders/purchase-check─────────►  order-service

payment-service  ──GET  /internal/orders/{id}──────────────────►  order-service
                 ──POST /internal/orders/{id}/paid──────────────►

chat-service     ──GET /products, /products/{id}───────────────►  product-service
                 ──GET /orders/options──────────────────────────►  order-service
                 ──GET /orders/my (chuyển tiếp JWT của khách)───►  order-service
```

`chat-service` chỉ **đọc** qua API công khai của hai service kia, không có endpoint nội bộ
riêng. Đơn hàng của khách lấy bằng chính JWT của khách chuyển tiếp nguyên vẹn, nên order-service
vẫn tự xác thực và trợ lý AI không thể đọc đơn của người khác dù bị "dụ" bằng lời nhắn.

Và hai hệ thống bên ngoài:

```
order-service    ──HTTPS (Token, ShopId)──►  GHN        (danh mục địa giới, phí, vận đơn)
chat-service     ──HTTPS (API key)────────►  Claude API (trợ lý tư vấn, gọi công cụ)
payment-service  ──HTTPS (HMAC)───────────►  VNPay / MoMo / ZaloPay
VNPay / MoMo / ZaloPay ──IPN──► api-gateway ──► payment-service
GHN              ──webhook──► api-gateway ──► order-service
```

Và một luồng **bất đồng bộ** qua RabbitMQ:

```
order-service ──publish order.*──► [bloom.events] ──order.#──► [notification.order-events] ──► notification-service
                                                                    │ xử lý hỏng 3 lần                  │
                                                                    ▼                                   ▼ GET /internal/users/{id}/contact
                                                  [bloom.events.dlx] → [...dlq]                    auth-service
```

Tắt notification-service thì đặt hàng vẫn bình thường, sự kiện nằm chờ trong queue bền,
bật lại thì gửi bù. Tắt RabbitMQ thì đặt hàng vẫn thành công, chỉ mất thông báo (ghi log).

**Chiều phụ thuộc giữa thanh toán và đơn hàng chỉ có một hướng**: `payment-service` gọi
`order-service`, không bao giờ ngược lại. Hai việc tưởng cần gọi ngược đều được giải bên
trong từng service:

- *Giao dịch treo* (khách trả xong nhưng đóng trình duyệt, IPN không tới được `localhost`):
  `payment-service` tự hỏi cổng mỗi phút (`PaymentReconciler`).
- *Đơn trực tuyến không bao giờ được trả*: `order-service` tự huỷ sau 30 phút
  (`UnpaidOrderCanceller`). Link thanh toán hết hạn sau 15 phút + 10 phút đối soát, nên
  không huỷ nhầm đơn vừa được trả.

**Thanh toán và huỷ đơn cùng lúc.** Hai việc có thể xảy ra đồng thời (khách vừa trả tiền
đúng lúc bộ tự huỷ chạy). Đọc – kiểm – ghi bằng entity thì cả hai đều thấy đơn "còn mở"
và cả hai đều ghi. `order-service` dùng `UPDATE ... WHERE` có điều kiện — một câu lệnh vừa
kiểm vừa ghi — nên chỉ một bên thắng. Bên thua được xử lý rõ ràng: thanh toán tới sau đơn
đã huỷ → `payment-service` đánh dấu *cần hoàn tiền*; huỷ tới sau khi đã thanh toán → đơn
chuyển `REFUND_PENDING`.

Luồng thứ hai phục vụ quy tắc "chỉ khách đã nhận hàng mới được đánh giá". Dữ liệu "đã mua
chưa" thuộc `order-service`, nên `product-service` phải hỏi chủ sở hữu chứ không đọc bảng
`orders`. Nếu `order-service` không phản hồi, `product-service` trả **503** (timeout 2–3 giây),
**không** mặc định cho qua — mở cửa khi không kiểm tra được là lỗ hổng.

Khi khách đặt hàng, `order-service` **trừ tồn kho ở product-service trước**, chỉ khi
product-service xác nhận thành công mới lưu đơn. Làm ngược lại sẽ sinh ra đơn hàng cho
sản phẩm đã hết hàng.

`Product` được **bổ sung trường `stockQuantity`** khi tách — mô hình monolith cũ chưa có.
Hoa tươi mỗi ngày có số lượng nhất định nên trường này hợp lý về nghiệp vụ, đồng thời là
chỗ thể hiện giao dịch phân tán của đồ án.

Huỷ đơn (khách huỷ, hoặc ADMIN chuyển trạng thái sang `CANCELLED`) đều đi qua cùng một
chỗ: hoàn `release-stock` từng dòng rồi trả lại lượt dùng mã giảm giá. Đơn đã huỷ không mở
lại được, vì mở lại mà không trừ kho lần nữa là bán hàng không có thật.

### Chịu lỗi: timeout và circuit breaker

Mọi lời gọi HTTP đi ra của `order-service` và `payment-service` (sang service khác, GHN, cổng
thanh toán) đi qua **circuit breaker** (Resilience4j), mỗi máy đích một breaker. Timeout chỉ
giới hạn *một* lời gọi — máy đích chết hẳn thì request nào cũng vẫn chờ hết timeout, thread bị
giữ, service gọi chậm theo (lỗi dây chuyền). Breaker xét 10 lời gọi gần nhất: ≥ 50% thất bại
thì **mở mạch**, 30 giây liền từ chối ngay (503) không gọi ra; sau đó cho 2 lời gọi thử, thành
công thì đóng lại. Chỉ tính là lỗi khi không liên lạc được hoặc máy đích trả 5xx — 4xx (hết
hàng, địa chỉ sai) là lỗi nghiệp vụ, máy đích vẫn khoẻ. Đo thật: tắt product-service, 5 lần
đặt hàng đầu chờ ~5,3 giây mỗi lần, từ lần thứ 6 bị từ chối trong ~0,3 giây.

### Giới hạn đã biết

- Sự kiện RabbitMQ phát **sau** khi lưu đơn; tiến trình chết đúng giữa hai bước thì mất sự kiện
  (at-most-once ở phía phát). Hướng làm đúng: Transactional Outbox.

Đây **không phải** giao dịch phân tán thật (không Saga, không Outbox). Nếu `order-service`
chết ngay sau khi `reserve-stock` thành công nhưng trước khi lưu đơn, tồn kho sẽ bị trừ dư
mà không có đơn tương ứng. Với quy mô đồ án, rủi ro này được ghi nhận và chấp nhận; hướng
xử lý thật là Saga pattern hoặc bù trừ định kỳ.

## 5. Bảng định tuyến Gateway

| Route ngoài | Forward tới | Xác thực |
|---|---|---|
| `/api/auth/**` | `:8081` | `/login`, `/register`, `/google`, `/google/config` public; còn lại cần JWT |
| `/api/products/**` | `:8082` | GET public; POST/PUT/DELETE cần ROLE_ADMIN |
| `/api/categories/**` | `:8082` | GET public; còn lại ROLE_ADMIN |
| `/api/products/{id}/reviews/**` | `:8082` | Xem public; gửi đánh giá cần JWT |
| `/api/reviews/**` | `:8082` | ROLE_ADMIN — duyệt, ẩn, xoá đánh giá |
| `/api/orders/**` | `:8083` | Cần JWT (CUSTOMER hoặc ADMIN); `GET /api/orders/options` public; `POST /{id}/arrangement-photo` ADMIN, STAFF |
| `/api/custom-requests/**` | `:8083` | Cần JWT; xem tất cả, báo giá, từ chối: ADMIN, STAFF |
| `/api/vouchers/**` | `:8083` | `GET /public`, `GET /hunt` public; `POST /check`, `GET /mine`, `POST /{code}/claim` cần JWT; `GET /` ADMIN/STAFF; còn lại ROLE_ADMIN |
| `/api/shipping/**` | `:8083` | Danh mục địa giới GHN public; `POST /fee` cần JWT; `POST /ghn/webhook` public (không tin nội dung) |
| `/api/notifications/**` | `:8085` | ROLE_ADMIN — nhật ký email |
| `/api/payments/**` | `:8084` | `GET /methods`, `POST /return` và 3 IPN public (an toàn nhờ chữ ký); `GET /api/payments` ROLE_ADMIN; còn lại cần JWT |
| `/api/public/products` | `:8082` | **API Key** — dành cho đối tác ngoài, không cần JWT |
| `/api/api-keys/**` | `:8081` | Cần JWT của ADMIN — quản trị khoá đối tác |
| `/uploads/**` | `:8082` | Public — ảnh sản phẩm, thẻ `<img>` không gửi được header |
| `/order-media/**` | `:8083` | Public — ảnh bó hoa thành phẩm, ảnh mẫu của yêu cầu; tên file UUID |
| `/api/chat/**` | `:8086` | Cần JWT; `/api/chat/conversations/**` (hộp thư) ADMIN, STAFF |

### Route cố tình KHÔNG khai báo ở Gateway

`/internal/products/{id}/reserve-stock`, `/release-stock`, `/internal/orders/purchase-check`,
`/internal/orders/{id}` và `/internal/orders/{id}/paid` không nằm trong bảng định tuyến, nên
frontend và đối tác ngoài không gọi tới được. Các service gọi thẳng nhau (`localhost:8082`,
`localhost:8083`) qua mạng nội bộ. Riêng `/internal/orders/{id}/paid` là chỗ nhạy cảm nhất:
gọi được nó là đánh dấu được đơn "đã thanh toán" mà không trả tiền.

**Giới hạn đã biết:** đây là bảo mật dựa trên *việc không định tuyến*, không phải xác thực
thật. Ai vào được mạng nội bộ vẫn gọi được. Hướng cải thiện: giới hạn IP nội bộ hoặc dùng
secret riêng giữa các service.

## 6. Hai lớp bảo mật độc lập

| Lớp | Dành cho | Cơ chế |
|---|---|---|
| JWT | Người dùng thật (ADMIN / STAFF / CUSTOMER) | `Authorization: Bearer <token>` |
| API Key | Đối tác ngoài, máy gọi máy | Header `X-API-KEY` |
| Chữ ký HMAC | Cổng thanh toán gọi vào (IPN) và kết quả trả qua trình duyệt | `payment-service` tính lại chữ ký bằng khoá bí mật của cổng |

Kết quả thanh toán đi qua trình duyệt của khách (`vnp_ResponseCode=00`, `resultCode=0`,
`status=1` trên URL) nên khách **sửa được**. Frontend không bao giờ tự đọc các tham số đó để
báo thành công — nó chuyển nguyên bộ tham số lên `POST /api/payments/return`, server tính lại
chữ ký, khớp mới ghi nhận, và còn so số tiền với tổng đơn lấy từ `order-service`.

### Ba quyền trong JWT

| Quyền | Được làm |
|---|---|
| `ADMIN` | Mọi thứ, kể cả tạo / sửa / tắt mã giảm giá, Khoá API đối tác và tài khoản nhân viên |
| `STAFF` (nhân viên) | Xử lý đơn (đổi trạng thái, tạo vận đơn GHN, hoàn tiền), quản lý hoa, danh mục, duyệt đánh giá, xem nhật ký email; **chỉ xem** mã giảm giá |
| `CUSTOMER` | Mua hàng, xem và huỷ đơn của chính mình khi cửa hàng chưa bắt tay chuẩn bị |

Mã giảm giá và Khoá API để riêng cho ADMIN vì chúng đụng thẳng tới tiền và tới đối tác bên
ngoài. Quyền được kiểm ở **từng service** (`hasAnyRole("ADMIN", "STAFF")` trong
`SecurityConfig`), không ở Gateway — Gateway chỉ biết có token hay không. Trang quản trị ẩn menu
theo quyền chỉ để dễ dùng; gõ thẳng URL hay gọi thẳng API thì service vẫn trả 403.

Cột `users.role` và `orders.status` là `VARCHAR` chứ không để Hibernate tạo `ENUM` của MySQL:
`ddl-auto=update` không mở rộng được danh sách `ENUM`, thêm `STAFF` hay `PREPARING` sẽ báo
*"Data truncated"*. `SchemaUpgrade` trong auth-service và order-service tự đổi cột cũ lúc khởi
động (chạy lại nhiều lần cũng không sao).

### Khoá đối tác thuộc về ai

Cả hai lớp đều là **định danh**, nên cùng một service sở hữu: `auth-service` giữ bảng
`api_keys` bên cạnh bảng `users`. Gateway không tự giữ danh sách khoá — nó hỏi sang
`/internal/api-keys/validate` rồi nhớ kết quả trong ít giây. Hệ quả:

- Thu hồi khoá là một lệnh `UPDATE` ở đúng một nơi, không phải sửa file cấu hình rồi
  khởi động lại Gateway.
- Gateway đứng được một mình cho phần định tuyến, nhưng route đối tác thì phụ thuộc
  `auth-service`. Khi `auth-service` chết, route đối tác trả **503** chứ không cho qua:
  lớp bảo mật nào "lỗi thì cho qua" thì coi như không có.
- Khoá gốc chỉ rời hệ thống đúng một lần, lúc cấp. CSDL chỉ giữ SHA-256 — xem ghi chú
  trên entity `ApiKey` về lý do không dùng BCrypt như mật khẩu.

Gateway chặn sớm để giảm tải, nhưng **từng service vẫn tự xác thực JWT độc lập**. Nếu ai
đó gọi thẳng `localhost:8082` bỏ qua Gateway thì bước kiểm tra ở Gateway hoàn toàn vô
hiệu — nguyên tắc Zero Trust thu nhỏ.

## 7. Quy ước chung

Áp dụng cho mọi service:

- Package gốc: `dh13c6.nguyentiendat516.bloom.<tenservice>`
- Format lỗi JSON: `{"message": "..."}` cho lỗi nghiệp vụ, `{"tenField": "loi"}` cho validation
- `jwt.secret` giống hệt nhau ở cả 5 service backend
- Tiền tệ: VND, số nguyên (cổng thanh toán và GHN đều chỉ nhận số nguyên đồng)
- Mỗi phần việc một commit riêng, dạng `feat(<service>): <việc đã làm>`
