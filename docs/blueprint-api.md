# Blueprint API — Bloom Studio

> Toàn bộ endpoint của hệ thống sau khi tách service, đối chiếu với bản monolith cũ.
>
> Tiền tố `/api2025` của bản monolith được thay bằng `/api` do Gateway sở hữu; Gateway
> dùng `RewritePath` để dịch sang đường dẫn nội bộ của từng service.

## auth-service — cổng 8081, tiền tố qua Gateway: `/api/auth`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu | Từ monolith |
|---|---|---|---|---|
| POST | `/auth/login` | Đăng nhập, trả JWT | Public | `POST /api2025/users/login` |
| POST | `/auth/register` | Đăng ký tài khoản CUSTOMER | Public | `POST /api2025/users/register` |
| GET | `/auth/google/config` | `{ enabled, clientId }` — frontend hỏi trước khi vẽ nút "Đăng nhập bằng Google" (Client ID là thông tin công khai) | Public | *(mới)* |
| POST | `/auth/google` | Đăng nhập bằng Google — body `{ credential }` là ID token Google. auth-service kiểm chữ ký (JWKS của Google), `iss`, `aud` = Client ID, hạn; tìm tài khoản theo `google_sub`, chưa có thì tạo tài khoản CUSTOMER. Trả JWT như `/auth/login`. Token sai / hết hạn → 400 | Public | *(mới)* |
| POST | `/auth/me/google` | Liên kết tài khoản Google vào tài khoản đang đăng nhập (chỉ CUSTOMER). Google đã gắn với tài khoản khác → 409 | JWT | *(mới)* |
| GET | `/auth/me` | Thông tin tài khoản đang đăng nhập (kèm `googleLinked`, `avatarUrl` — ảnh Google, cập nhật mỗi lần đăng nhập Google) | JWT | *(mới)* |
| PUT | `/auth/me/profile` | Sửa hồ sơ của chính mình, kể cả địa chỉ mặc định theo GHN (`provinceId`, `districtId`, `wardCode`, `areaLabel`) | JWT | `PUT /api2025/users/{id}/profile` |
| GET | `/users` | Danh sách tài khoản | ADMIN | `GET /api2025/users` |
| GET | `/users/{id}` | Chi tiết tài khoản | ADMIN | `GET /api2025/users/{id}` |
| POST | `/users` | Tạo tài khoản nội bộ — `{ username, password, fullName, role }`, `role` chỉ nhận `STAFF` hoặc `ADMIN` | ADMIN | *(mới)* |
| PUT | `/users/{id}` | Đổi quyền (`ADMIN` / `STAFF` / `CUSTOMER`) và/hoặc đặt lại mật khẩu. Không tự đổi quyền của mình, không hạ ADMIN cuối cùng (409) | ADMIN | `PUT /api2025/users/{id}` |
| DELETE | `/users/{id}` | Xoá tài khoản. Không tự xoá mình, không xoá ADMIN cuối cùng (409) | ADMIN | `DELETE /api2025/users/{id}` |
| GET | `/api-keys` | Danh sách API Key đã cấp — **không kèm khoá gốc** | ADMIN | *(mới)* |
| POST | `/api-keys` | Cấp API Key cho đối tác, trả khoá gốc **một lần duy nhất** | ADMIN | *(mới)* |
| POST | `/api-keys/{id}/revoke` | Thu hồi, giữ lại dòng để truy vết | ADMIN | *(mới)* |
| DELETE | `/api-keys/{id}` | Xoá hẳn khỏi CSDL, chỉ dùng dọn dữ liệu test | ADMIN | *(mới)* |

`PUT /auth/me/profile` thay cho `PUT /users/{id}/profile` của monolith: khách chỉ sửa được
hồ sơ **của chính mình**, id lấy từ token chứ không nhận từ URL. Bản cũ cho phép truyền id
bất kỳ — lỗi IDOR.

Địa chỉ mặc định theo GHN: ba mã `provinceId` / `districtId` / `wardCode` luôn đi đủ bộ,
`wardCode` quyết định cách xử lý:

| `wardCode` gửi lên | Kết quả |
|---|---|
| không gửi (`null`) | Giữ nguyên địa chỉ GHN đang lưu — trang *Thông tin cá nhân* không đụng tới nó |
| `""` | Xoá cả bộ ba mã và `areaLabel` |
| có giá trị | Lưu cả bộ; thiếu `provinceId` hoặc `districtId` thì **400** *"Chọn đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã"* |

`auth-service` không hỏi GHN để kiểm tra mã; `order-service` kiểm tra lúc đặt hàng.
`GET /auth/me` và mọi response hồ sơ trả kèm bốn trường này để trang Thanh toán chọn sẵn
Tỉnh / Quận / Phường và tính phí GHN ngay.

`POST /auth/login` trả **401** cùng `message: "Sai tên đăng nhập hoặc mật khẩu"`
cho cả mật khẩu sai và username không tồn tại. `GlobalExceptionHandler` xử lý
`InvalidCredentialsException` để lỗi này không trở thành 500.

### API nội bộ (không lộ qua Gateway)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/internal/api-keys/validate` | Gateway hỏi: khoá này còn hiệu lực cho scope này không |

Dùng **POST với khoá trong body**, không phải `GET ?key=`: query string bị ghi vào access
log của mọi tầng đi qua, khoá sẽ nằm lại trong log dưới dạng rõ.

Body trả về `{valid, reason, ownerName, scopes}`. `reason` (`KHONG_TON_TAI`, `DA_THU_HOI`,
`HET_HAN`, `THIEU_SCOPE`) chỉ để Gateway ghi log và chọn mã trạng thái — **không** chuyển
nguyên văn ra ngoài cho đối tác, vì nói rõ "khoá đã bị thu hồi" là cho kẻ dò biết chuỗi
nào từng là khoá thật.

### Payload JWT

```json
{ "sub": "john", "userId": 2, "role": "CUSTOMER", "iat": ..., "exp": ... }
```

`userId` là bắt buộc — `order-service` cần nó để gán chủ đơn hàng mà không phải gọi
sang auth-service.

`role` là một trong `ADMIN`, `STAFF` (nhân viên), `CUSTOMER`. Mỗi service tự đọc role từ token
đã kiểm chữ ký rồi đặt thành `ROLE_<role>`, không service nào hỏi lại auth-service. Hệ quả:
ADMIN đổi quyền một tài khoản thì quyền mới chỉ có hiệu lực từ **lần đăng nhập sau** — token
cũ vẫn mang role cũ tới khi hết hạn (24 giờ).

## product-service — cổng 8082, tiền tố: `/api/products`, `/api/categories`, `/api/reviews`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu | Từ monolith |
|---|---|---|---|---|
| GET | `/products` | Danh sách: `name`, `categoryId`, `occasion`, `color`, `minPrice`, `maxPrice` + `page` + `size` + `sort` (có `ratingAverage,desc`). `name` gõ có dấu thì phân biệt dấu (`bó` không ra `Bộ`), gõ không dấu thì khớp mọi dấu. `minPrice` / `maxPrice` và `sort=price,asc|desc` đều theo giá **"Từ ..."** (cỡ rẻ nhất với hoa có nhiều cỡ), không phải giá cỡ Tiêu chuẩn | Public | mở rộng |
| GET | `/products/search` | Cùng handler với `/products` — bí danh giữ từ SOS07 | Public | giữ nguyên |
| GET | `/products/{id}` | Chi tiết sản phẩm — có thêm `occasions`, `color`, `ratingAverage`, `ratingCount`, `composition`, `stemCount`, `sized`, `leadDays`, `sizes` | Public | mở rộng |
| GET | `/products/attributes` | Danh sách dịp và màu kèm nhãn tiếng Việt, dùng cho bộ lọc và form | Public | *(mới)* |
| POST | `/products` | Thêm sản phẩm | ADMIN, STAFF | bỏ `?role=ADMIN` |
| PUT | `/products/{id}` | Sửa sản phẩm | ADMIN, STAFF | bỏ `?role=ADMIN` |
| DELETE | `/products/{id}` | Xoá sản phẩm | ADMIN, STAFF | bỏ `?role=ADMIN` |
| GET | `/products/category/{categoryId}` | Lọc theo danh mục | Public | giữ nguyên |
| POST | `/products/category/{categoryId}` | Thêm sản phẩm vào một danh mục | ADMIN, STAFF | bỏ `?role=ADMIN` |
| POST | `/products/upload` | Lưu ảnh độc lập, trả chuỗi `uploads/<uuid>_<tên>` | ADMIN, STAFF | bỏ `?role=ADMIN` |
| PUT | `/products/{id}/image` | Thay ảnh của sản phẩm | ADMIN, STAFF | bỏ `?role=ADMIN` |
| POST | `/products/{id}/upload-image` | Upload ảnh, trả về sản phẩm đã cập nhật | ADMIN, STAFF | giữ nguyên |
| GET | `/categories` | Danh sách danh mục | Public | giữ nguyên |
| GET | `/categories/{id}` | Chi tiết danh mục | Public | giữ nguyên |
| POST | `/categories` | Thêm danh mục | ADMIN, STAFF | bỏ `?role=ADMIN` |
| PUT | `/categories/{id}` | Sửa danh mục | ADMIN, STAFF | bỏ `?role=ADMIN` |
| DELETE | `/categories/{id}` | Xoá danh mục | ADMIN, STAFF | bỏ `?role=ADMIN` |
| GET | `/categories/{id}/products` | Sản phẩm trong danh mục | Public | giữ nguyên |
| GET | `/products/{id}/reviews` | Đánh giá đang hiện, phân trang, tên khách đã che bớt | Public | *(mới)* |
| GET | `/products/{id}/reviews/summary` | Điểm trung bình, số đánh giá, phân bố 1–5 sao | Public | *(mới)* |
| GET | `/products/{id}/reviews/eligibility` | Người đang đăng nhập có được đánh giá không, lý do nếu không | Đăng nhập | *(mới)* |
| POST | `/products/{id}/reviews` | Tạo hoặc sửa đánh giá của chính mình — `rating` 1–5, `comment` | Đăng nhập, **đã nhận hàng** | *(mới)* |
| GET | `/reviews` | Mọi đánh giá, lọc `hidden=true/false` | ADMIN, STAFF | *(mới)* |
| PATCH | `/reviews/{id}/visibility` | Ẩn / hiện đánh giá — `{ "hidden": true }` | ADMIN, STAFF | *(mới)* |
| DELETE | `/reviews/{id}` | Xoá hẳn đánh giá | ADMIN, STAFF | *(mới)* |
| POST | `/categories/{id}/products` | Thêm sản phẩm vào danh mục — trùng chức năng với `POST /products/category/{id}` | ADMIN, STAFF | bỏ `?role=ADMIN` |

Năm dòng `/products/search`, `POST /products/category/{id}`, `POST /products/upload`,
`PUT /products/{id}/image` và `POST /categories/{id}/products` được **giữ lại để tương thích
với bài thực hành SOS07/SOS09**; giao diện không gọi tới. Frontend chỉ dùng
`POST /products/{id}/upload-image` để tải ảnh.

**Thay đổi lớn nhất:** `?role=ADMIN` biến mất hoàn toàn. Role nay lấy từ JWT đã xác thực
chữ ký, không phải từ tham số do client tự khai. Đây là điểm khác biệt cốt lõi giữa bản
thực hành và bản đồ án.

**Bó hoa: thành phần, cỡ bó, số ngày đặt trước.** `Product` có thêm `composition` (loại hoa,
lá phụ, giấy gói), `stemCount` (số bông cỡ tiêu chuẩn, null = trọn gói / trang trí), `sized`
(bán theo 3 cỡ) và `leadDays` (phải đặt trước bao nhiêu ngày, 0 = giao trong ngày; bắt buộc
khi thêm / sửa). Mọi response sản phẩm kèm `sizes`:

```json
"sizes": [
  { "code": "SMALL",    "label": "Nhỏ",        "stems": 11, "price": 510000 },
  { "code": "STANDARD", "label": "Tiêu chuẩn", "stems": 15, "price": 680000 },
  { "code": "LARGE",    "label": "Lớn",        "stems": 23, "price": 950000 }
]
```

Giá từng cỡ tính từ `price` (cỡ tiêu chuẩn): nhỏ × 0,75, lớn × 1,4, làm tròn 10.000đ; số bông
× 0,7 / × 1,5. Sản phẩm `sized = false` chỉ có dòng `STANDARD`. `order-service` lấy giá theo cỡ
từ chính danh sách này (qua `reserve-stock`), không tự nhân hệ số.

Ảnh sản phẩm được đọc công khai qua Gateway: `GET /uploads/seed/**` lấy từ
`classpath:/static/uploads/seed/`; các ảnh upload runtime ở `/uploads/**` lấy từ đĩa.
`WebConfig` phải khai riêng đường dẫn seed vì handler `/uploads/**` trên đĩa che
đường dẫn static mặc định của Spring.

### API nội bộ (không lộ qua Gateway)

| Method | Endpoint | Mô tả |
|---|---|---|
| PATCH | `/internal/products/{id}/reserve-stock` | Kiểm tra còn hàng, trừ `stockQuantity` — có `@Transactional` |
| PATCH | `/internal/products/{id}/release-stock` | Hoàn trả tồn kho khi huỷ đơn |

Chỉ `order-service` gọi hai endpoint này, gọi thẳng `localhost:8082`.

**Đánh giá sản phẩm.** Mỗi tài khoản một đánh giá cho mỗi sản phẩm; gửi lại là sửa. Đánh giá
mới chỉ được nhận khi khách có ít nhất một đơn **DELIVERED** chứa sản phẩm đó — dữ liệu này
thuộc `order-service`, nên `product-service` hỏi qua `GET /internal/orders/purchase-check`
(bên dưới). `order-service` không phản hồi thì trả **503**, không mặc định cho qua. Điểm
trung bình và số đánh giá được lưu sẵn trên bảng `products` (chỉ tính đánh giá đang hiện),
cập nhật mỗi khi có đánh giá mới, bị ẩn hoặc bị xoá.

## order-service — cổng 8083, tiền tố: `/api/orders`, `/api/vouchers`, `/api/shipping`, `/api/custom-requests`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu | Từ monolith |
|---|---|---|---|---|
| POST | `/orders` | Đặt hàng — gọi ngầm `reserve-stock` từng dòng; mỗi dòng là bó hoa (`productId` + `size`) **hoặc** hoa theo yêu cầu đã báo giá (`customRequestId`); nhận thêm người tặng, thiệp, quà kèm, khung giờ, mã giảm giá, mã địa giới GHN (`provinceId`, `districtId`, `wardCode`) và `paymentMethod` (`COD` / `VNPAY` / `MOMO` / `ZALOPAY`) | CUSTOMER | mở rộng |
| GET | `/orders/options` | Loại thiệp, quà kèm (kèm giá), khung giờ giao, ngưỡng miễn phí ship, `ghnEnabled`; quy tắc giao hoa: `today` (giờ VN), `sameDayCutoffHour`, `sameDayOpen`, `deliveryProvinceIds`, `deliveryAreaLabel` | Public | *(mới)* |
| POST | `/orders/{id}/arrangement-photo` | Tải ảnh bó hoa thành phẩm (multipart `file`, JPG/PNG/WEBP ≤ 5MB). Đơn chưa tới `PREPARING` thì chuyển `PREPARING`; phát `order.arranged` để gửi email kèm ảnh. Đơn huỷ / đã giao / trực tuyến chưa trả → 409 | ADMIN, STAFF | *(mới)* |
| GET | `/orders/my` | Đơn hàng của chính tôi | CUSTOMER | *(mới)* |
| GET | `/orders/{id}` | Chi tiết đơn | Chủ đơn, ADMIN hoặc STAFF | giữ nguyên |
| GET | `/orders` | Toàn bộ đơn hàng, mới nhất trước. Lọc tuỳ chọn: `status=PENDING,CONFIRMED` (nhiều giá trị), `q` (mã đơn / người nhận / SĐT / tài khoản / người tặng, không phân biệt hoa thường), `deliveryDate=yyyy-MM-dd` | ADMIN, STAFF | giữ nguyên, thêm tham số lọc |
| GET | `/orders/status-counts` | Số đơn mỗi trạng thái + `DUE_TODAY` (đơn chưa xong phải giao hôm nay, giờ Việt Nam) — cho thẻ lọc trang quản trị | ADMIN, STAFF | *(mới)* |
| GET | `/orders/overview` | Doanh thu, biểu đồ theo ngày, top bán chạy — `from` + `to`, mặc định 30 ngày gần nhất | ADMIN, STAFF | *(mới, xem ghi chú cuối file)* |
| PUT | `/orders/{id}/status` | Đổi trạng thái đơn theo tiến trình `PENDING` → `CONFIRMED` → `PREPARING` → `SHIPPING` → `DELIVERED`, chỉ đi tới (lùi → 409). Đơn đang có vận đơn GHN thì không tự chuyển `SHIPPING` / `DELIVERED` được (409) — hai bước đó do GHN báo; muốn tự giao thì huỷ vận đơn trước. Đơn trả trực tuyến chưa `PAID` thì dừng ở `CONFIRMED`. Sang `CANCELLED` thì hoàn tồn kho + trả lượt mã; đơn đã huỷ / đã giao không đổi được nữa (409) | ADMIN, STAFF | sửa |
| DELETE | `/orders/{id}` | Huỷ đơn — huỷ vận đơn GHN nếu có (đã lấy hàng thì 409), gọi ngầm `release-stock`, trả lại lượt mã giảm giá; đơn đã trả tiền trực tuyến chuyển `REFUND_PENDING`. Khách chỉ tự huỷ khi đơn còn `PENDING` / `CONFIRMED`; ADMIN / STAFF huỷ được tới `PREPARING`; `SHIPPING` thì không ai huỷ được (409) | Chủ đơn, ADMIN hoặc STAFF | *(mới)* |
| POST | `/orders/{id}/shipment` | Tạo vận đơn GHN. Đơn trực tuyến phải `PAID`; đơn COD thì GHN thu hộ tổng tiền. Đơn chưa tới `PREPARING` thì chuyển `PREPARING`; lưu phí GHN, tiền thu hộ, khối lượng | ADMIN, STAFF | *(mới)* |
| POST | `/orders/{id}/shipment/simulate` | **Chỉ môi trường thử GHN** (`ghn.sandbox-simulation=auto` + `dev-online-gateway`): giả lập shipper `{ status: "picked" \| "delivering" \| "delivered" }`, chỉ đi tới. Đi đúng đường của webhook thật: ghi hành trình, kéo trạng thái đơn, giao xong thì ghi nhận COD và gửi email. Môi trường thật → 409 | ADMIN, STAFF | *(mới)* |
| POST | `/orders/{id}/shipment/cancel` | Huỷ vận đơn GHN (GHN chỉ cho huỷ khi chưa lấy hàng, đã lấy → 409) để studio tự giao; trạng thái đơn giữ nguyên | ADMIN, STAFF | *(mới)* |
| POST | `/orders/{id}/shipment/refresh` | Hỏi GHN trạng thái vận đơn, lưu hành trình (`shippingEvents`) và kéo trạng thái đơn đi tới: chờ lấy → `PREPARING`, đã lấy / đang giao → `SHIPPING`, `delivered` → `DELIVERED` | Chủ đơn, ADMIN hoặc STAFF | *(mới)* |
| GET | `/shipping/provinces` | Danh mục tỉnh/thành của GHN (có cache) | Public | *(mới)* |
| GET | `/shipping/districts?provinceId=` | Quận/huyện của một tỉnh | Public | *(mới)* |
| GET | `/shipping/wards?districtId=` | Phường/xã của một quận | Public | *(mới)* |
| POST | `/shipping/fee` | Xem trước phí GHN — `{ districtId, wardCode, itemCount }` | Đăng nhập | *(mới)* |
| GET | `/orders/circuit-breakers` | Trạng thái circuit breaker (product-service, GHN) | ADMIN, STAFF | *(mới)* |
| POST | `/shipping/ghn/webhook` | GHN báo đổi trạng thái vận đơn. Không tin nội dung: chỉ lấy `OrderCode` rồi tự hỏi lại GHN | Public (GHN gọi) | *(mới)* |
| GET | `/vouchers/public` | Mã **chung** đang dùng được (không gồm mã tặng riêng và mã săn) | Public | *(mới)* |
| GET | `/vouchers/hunt` | Trang **Săn voucher**: mọi mã chung đang bật, chưa hết hạn (kể cả sắp mở, đã hết lượt). Mỗi mã kèm `claimRequired`, `state` (`CLAIMABLE`, `CLAIMED`, `READY`, `UPCOMING`, `SOLD_OUT`, `USED`) và `claimedPercent` (chỉ lộ tỉ lệ, không lộ số lượt). Có JWT thì biết mã nào khách đã lưu | Public | *(mới)* |
| POST | `/vouchers/{code}/claim` | Lưu mã săn vào ví (userId từ JWT). Lưu lại mã đã lưu → 200 `alreadyClaimed: true`; mã thường / sắp mở / hết hạn → 400; hết lượt lưu → 409; mã riêng hoặc không tồn tại → 404 | Đăng nhập | *(mới)* |
| GET | `/vouchers/mine?amount=` | Ví mã của khách: mã chung đang chạy + mã tặng riêng cho tài khoản (từ JWT). Mỗi mã kèm `status` (`USABLE`, `BELOW_MIN`, `ALREADY_USED`, `EXPIRED`, `USED_UP`, `NOT_STARTED`, `INACTIVE`), `reason`, `discount` cho đơn `amount`; bỏ `amount` thì chỉ xét còn hạn. Mã săn chỉ có trong ví sau khi đã lưu. Dùng cho trang "Mã giảm giá của tôi" và popup chọn mã khi đặt hoa | Đăng nhập | *(mới)* |
| POST | `/vouchers/check` | Xem trước số tiền giảm — `{ code, amount }`, không ghi gì xuống CSDL. Mã tặng riêng của người khác trả 400 "Mã giảm giá không tồn tại"; mã săn chưa lưu trả 400 (đặt hàng cũng vậy) | Đăng nhập | *(mới)* |
| GET | `/vouchers` | Toàn bộ mã kèm lượt đã dùng | ADMIN, STAFF (chỉ xem) | *(mới)* |
| POST | `/vouchers` | Tạo mã. `ownerUserId` + `ownerUsername` (chọn từ `GET /api/users`) = mã tặng riêng một khách; bỏ trống = mã chung. `claimRequired: true` + `claimLimit` = mã săn (chỉ cho mã chung) | ADMIN | *(mới)* |
| PUT | `/vouchers/{id}` | Sửa / bật / tắt mã | ADMIN | *(mới)* |
| DELETE | `/vouchers/{id}` | Xoá mã chưa ai dùng; đã có người dùng thì 409, chỉ tắt được | ADMIN | *(mới)* |
| POST | `/custom-requests` | Gửi yêu cầu đặt hoa theo ý — `{ occasion, arrangement, sizeOption, flowers, colors, style, wrapping, avoid, budget, description, desiredDate, contactPhone }`. `arrangement` (kiểu hoa: bó, hộp, giỏ, bình, kệ, hoa cưới) bắt buộc; các lựa chọn khác và ghi chú `description` không bắt buộc, lưu bằng nhãn tiếng Việt để studio đọc thẳng. Ngày cần hoa sớm nhất là ngày mai | Đăng nhập | *(mới)* |
| POST | `/custom-requests/{id}/reference-image` | Ảnh mẫu tham khảo (multipart `file`) — chỉ khi còn `NEW` | Chủ yêu cầu | *(mới)* |
| GET | `/custom-requests/my` | Yêu cầu của chính tôi | Đăng nhập | *(mới)* |
| GET | `/custom-requests/{id}` | Chi tiết yêu cầu | Chủ yêu cầu, ADMIN hoặc STAFF | *(mới)* |
| DELETE | `/custom-requests/{id}` | Khách huỷ yêu cầu còn `NEW` / `QUOTED` | Chủ yêu cầu | *(mới)* |
| GET | `/custom-requests?status=` | Mọi yêu cầu, lọc theo trạng thái | ADMIN, STAFF | *(mới)* |
| PUT | `/custom-requests/{id}/quote` | Báo giá — `{ price, note }`; `NEW` / `QUOTED` → `QUOTED` | ADMIN, STAFF | *(mới)* |
| PUT | `/custom-requests/{id}/reject` | Từ chối — `{ note }` bắt buộc | ADMIN, STAFF | *(mới)* |

`userId` của đơn luôn lấy từ JWT, không nhận từ body. `GET /orders/{id}` kiểm tra người
gọi đúng là chủ đơn — nếu không sẽ là IDOR: khách A đọc được đơn của khách B chỉ bằng
cách đổi số trên URL.

**Cách tính tiền đơn** (server tính lại toàn bộ, không tin số client gửi):

```
hàng hoá   = tiền hoa (giá từ product-service) + quà kèm + phí thiệp
giảm giá   = theo mã, tính trên hàng hoá (PERCENT có trần maxDiscount)
phí ship   = 0 nếu (hàng hoá − giảm giá) ≥ 800.000đ, ngược lại phí GHN theo phường/xã
             (chưa cấu hình GHN thì 30.000đ cố định)
tổng cộng  = hàng hoá − giảm giá + phí ship
```

Tiền tệ là **VND** ở mọi service (trước đây là GBP). Dữ liệu cũ đổi bằng
`database/gbp-sang-vnd-product.sql` và `database/gbp-sang-vnd-order.sql` (× 10.000).

**Khối lượng gửi GHN:** mỗi bó 800 g trong hộp hoa 30 × 20 × 15 cm (cao thêm 15 cm mỗi bó). GHN
tính cước theo max(cân nặng thật, dài × rộng × cao ÷ 5000) → 1 bó = 1,8 kg. (Trước đây khai thùng
40 × 30 × 30 cm nên mọi đơn bị tính 7,2 kg.)

**Trạng thái vận đơn chỉ đi tới:** "Cập nhật từ GHN" / webhook báo trạng thái cũ hơn trạng thái
đang lưu thì giữ nguyên (sandbox GHN luôn báo "Chờ lấy hàng" vì không có shipper thật).
`GET /orders/options` có `ghnSandbox` để trang quản trị biết có hiện công cụ giả lập không.

**Giao hàng GHN.** Khi `GHN_TOKEN` và `GHN_SHOP_ID` đã khai, `address` trong body chỉ là
số nhà + tên đường; server đối chiếu `provinceId` / `districtId` / `wardCode` với danh mục
GHN, tự ghép tên phường / quận / tỉnh vào địa chỉ và hỏi GHN phí giao hàng **trước** khi trừ
kho. Số điện thoại người nhận phải là số di động Việt Nam 10 chữ số (GHN bắt buộc). Token GHN
chỉ nằm ở `order-service` — frontend không bao giờ gọi thẳng GHN.

**Thanh toán.** Đơn lưu `paymentMethod` và `paymentStatus` (`UNPAID` / `PAID` /
`REFUND_PENDING`). Đơn COD chuyển `PAID` khi giao xong. Đơn trực tuyến chuyển `PAID` khi
`payment-service` báo qua API nội bộ bên dưới. Đơn trực tuyến chưa trả sau
`order.unpaid-cancel-minutes` (mặc định 30) phút thì tự huỷ và hoàn kho.

**Quy tắc mã giảm giá**, kiểm theo thứ tự và trả **400** kèm lý do: mã tồn tại → đang bật →
đã tới ngày bắt đầu → chưa hết hạn → còn lượt → tài khoản chưa dùng (nếu mã giới hạn mỗi
người một lần) → đơn đạt giá trị tối thiểu. Tăng lượt dùng bằng một câu `UPDATE ... WHERE
used_count < usage_limit` trong **cùng transaction** với việc lưu đơn, nên hai khách tranh
lượt cuối cùng chỉ một người được; người còn lại nhận 409 và tồn kho đã trừ được hoàn lại.

**Giờ giao:** khách chọn **khung 1 tiếng** `deliveryHour` (giờ bắt đầu 8..20, tức 8:00–9:00 …
20:00–21:00) hoặc bỏ trống = lúc nào cũng được. Có `deliveryHour` thì server tự suy ra buổi
`timeSlot` (`MORNING` 8–12, `AFTERNOON` 12–17, `EVENING` 17–21) — không tin buổi client gửi kèm.
Giao hôm nay thì phải còn ít nhất 1 tiếng cắm hoa trước giờ bắt đầu khung (10:30 đặt → sớm nhất
khung 12:00–13:00), nếu không trả 400. Đơn trả `deliveryHour` và `deliveryTimeLabel`
(`"10:00 – 11:00"`); `GET /orders/options` có thêm `nowTime` (giờ Việt Nam), `firstDeliveryHour`,
`lastDeliveryHour`, `prepHours` để giao diện khoá sẵn các khung không còn kịp.

**Quy tắc giao hoa tươi** (`DeliveryPolicy`, mọi phép tính "hôm nay" theo giờ Việt Nam vì
container chạy UTC):

- **Giờ chốt đơn trong ngày** `order.same-day-cutoff-hour` (mặc định 15): sau giờ này, ngày
  giao là hôm nay → 400, sớm nhất ngày mai.
- **Đặt trước:** lấy `leadDays` lớn nhất trong các bó (từ product-service); dòng hoa theo yêu
  cầu tính 1 ngày. Có hoa cần đặt trước mà không chọn ngày, hoặc chọn sớm hơn → 400. Kiểm tra
  sau khi đã trừ kho nên lỗi thì kho được hoàn như mọi lỗi khác.
- **Vùng giao** `order.delivery-province-ids` (mặc định `201` — Hà Nội): địa chỉ GHN ngoài vùng
  → 400. Hoa tươi đi bưu kiện liên tỉnh 2–3 ngày là héo. Để trống thì giao mọi nơi.

**Cỡ bó:** dòng bó hoa gửi `size` (`SMALL` / `STANDARD` / `LARGE`, bỏ trống = `STANDARD`). Cùng
bó ở hai cỡ là hai dòng riêng; giá theo cỡ lấy từ `sizes` product-service trả về, cỡ không có
→ 400. `OrderItem` lưu `size` và `sizeLabel` (vd. `Lớn · 23 bông`).

**Hoa theo yêu cầu:** khách gửi mô tả + ngân sách → studio báo giá (`QUOTED`) → khách cho
yêu cầu vào giỏ và đặt như đơn thường với dòng `{ customRequestId, quantity: 1 }`. Server giữ
yêu cầu bằng một câu `UPDATE ... WHERE status = 'QUOTED' AND user_id = ?` (hai tab cùng đặt
thì chỉ một bên được), giá dòng = giá đã báo. Đặt hàng lỗi hoặc đơn bị huỷ thì yêu cầu quay về
`QUOTED` để khách đặt lại.

**Ảnh bó hoa thành phẩm** lưu trên đĩa của order-service (`order.media.dir`, Docker dùng volume
`order-media`), đọc công khai qua Gateway ở `GET /order-media/**` — thẻ `<img>` không gửi được
JWT. Tên file là UUID nên không đoán được ảnh của đơn khác. Ảnh mẫu của yêu cầu đặt hoa dùng
chung cơ chế này.

### API nội bộ (không lộ qua Gateway)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/internal/orders/purchase-check?userId=&productId=` | `{ "delivered": true }` nếu user có đơn DELIVERED chứa sản phẩm |
| GET | `/internal/orders/{id}` | Mã đơn, chủ đơn, **tổng tiền thật**, trạng thái đơn và thanh toán — cho `payment-service` |
| POST | `/internal/orders/{id}/paid` | `{ provider, txnRef, amount }` — ghi nhận đã thanh toán. Idempotent theo `txnRef`; 409 nếu đơn đã huỷ, đã trả bằng giao dịch khác hoặc lệch số tiền |
| POST | `/internal/orders/{id}/refunded` | `{ txnRef }` — đơn `REFUND_PENDING` chuyển `REFUNDED` nếu đúng giao dịch đã trả đơn |

`purchase-check` do `product-service` gọi trước khi nhận đánh giá mới. Hai endpoint còn lại do
`payment-service` gọi. Ghi nhận thanh toán và huỷ đơn có thể xảy ra cùng lúc, nên cả hai dùng
`UPDATE ... WHERE` có điều kiện (một câu lệnh vừa kiểm vừa ghi) thay vì đọc rồi ghi.

## payment-service — cổng 8084, tiền tố: `/api/payments`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu |
|---|---|---|---|
| GET | `/payments/methods` | COD + các cổng đã khai khoá (cổng chưa khai khoá tự ẩn) | Public |
| POST | `/payments` | `{ orderId, provider }` → tạo giao dịch, trả `payUrl`. **Không** nhận số tiền — lấy từ `order-service` | Chủ đơn |
| POST | `/payments/return` | Frontend chuyển nguyên tham số cổng gắn vào URL trả về; server kiểm chữ ký rồi ghi nhận | Public |
| GET | `/payments/order/{orderId}` | Lịch sử giao dịch của một đơn | Chủ đơn, ADMIN hoặc STAFF |
| POST | `/payments/{id}/refresh` | Hỏi thẳng cổng thanh toán trạng thái giao dịch (API truy vấn) | Chủ giao dịch, ADMIN hoặc STAFF |
| GET | `/payments` | Toàn bộ giao dịch, phân trang | ADMIN, STAFF |
| POST | `/payments/{id}/refund` | Hoàn **toàn bộ** tiền qua API của cổng (VNPay `refund`, MoMo `/v2/gateway/api/refund`, ZaloPay `/v2/refund`). Chỉ khi giao dịch bị đánh dấu *cần hoàn* hoặc đơn đang `REFUND_PENDING`; cổng từ chối → 502 kèm lý do của cổng | ADMIN, STAFF |
| GET | `/payments/circuit-breakers` | Trạng thái circuit breaker của các lời gọi ra ngoài | ADMIN, STAFF |
| GET | `/payments/vnpay/ipn` | IPN của VNPay, trả `{ RspCode, Message }` | Public (VNPay gọi) |
| POST | `/payments/momo/ipn` | IPN của MoMo, trả 204 | Public (MoMo gọi) |
| POST | `/payments/zalopay/callback` | Callback của ZaloPay, trả `{ return_code, return_message }` | Public (ZaloPay gọi) |

Cách ký của từng cổng:

| Cổng | Ký yêu cầu gửi đi | Kiểm kết quả trả về | Ghi chú |
|---|---|---|---|
| VNPay 2.1.0 | HMAC-SHA512 trên query đã sắp xếp + mã hoá URL | cùng cách, bỏ `vnp_SecureHash` | Số tiền × 100; `vnp_OrderInfo` không dấu |
| MoMo v2 | HMAC-SHA256 trên chuỗi `key=value` theo bảng chữ cái | chuỗi 13 trường cố định | `requestType=payWithMethod` |
| ZaloPay v2 | HMAC-SHA256(key1) trên các trường nối bằng `\|` | redirect và callback kiểm bằng **key2** | `app_trans_id` bắt đầu bằng `yyMMdd_` giờ VN |

Ba nguyên tắc: số tiền luôn lấy từ `order-service`; chỉ tin kết quả **đã kiểm chữ ký** hoặc
do chính server hỏi cổng; mọi bước ghi nhận đều idempotent (return URL và IPN có thể tới
cùng lúc hoặc lặp lại). Chạy trên máy cá nhân thì cổng thanh toán **không gọi được IPN**
vào `localhost` — `PaymentReconciler` mỗi phút hỏi lại cổng các giao dịch đang chờ, đóng
giao dịch quá hạn và báo lại `order-service` nếu lần trước chưa báo được.

Tiền đã trừ mà đơn không nhận (đơn đã huỷ vì quá hạn, hoặc trả hai lần) → giao dịch được
đánh dấu `refundRequired` để quản trị hoàn tay trên trang của cổng thanh toán.

## notification-service — cổng 8085, tiền tố: `/api/notifications`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu |
|---|---|---|---|
| GET | `/notifications` | Nhật ký email đã xử lý (phân trang) | ADMIN, STAFF |
| GET | `/notifications/order/{orderId}` | Email của một đơn | ADMIN, STAFF |

Service này **không nhận lời gọi nghiệp vụ nào**: nó nghe RabbitMQ.

| Exchange | Kiểu | Routing key | Ai phát | Ai nghe |
|---|---|---|---|---|
| `bloom.events` | topic | `order.placed`, `order.paid`, `order.arranged`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded` | order-service | queue `notification.order-events` (`order.#`) |
| `bloom.events.dlx` | topic | `#` | RabbitMQ (tin xử lý hỏng 3 lần) | queue `notification.order-events.dlq` |

Body là JSON `OrderEvent` (`eventId`, `type`, `orderId`, `orderCode`, `userId`, `total`,
`paymentMethodLabel`, `ghnOrderCode`, `photoUrl`...). `order.arranged` gửi khách email kèm ảnh bó
hoa thật (`notification.media-base-url` + `photoUrl`). Không có email: notification-service tự hỏi
`auth-service` `GET /internal/users/{id}/contact`. `eventId` + người nhận là khoá duy nhất
trong bảng `notifications`, nên tin giao lặp không sinh thư lặp. Chạy Docker thì thư vào
hộp thư giả lập **Mailpit** (http://localhost:8025), không ra Internet.

## chat-service — cổng 8086, tiền tố: `/api/chat`

| Method | Endpoint nội bộ | Mô tả | Yêu cầu |
|---|---|---|---|
| GET | `/chat/me?afterId=` | Cuộc chat mới nhất của tôi + tin mới sau `afterId` (bỏ trống = 50 tin gần nhất); đọc xong thì xoá số chưa đọc. Trả `{ conversation, messages, aiEnabled }` | Đăng nhập |
| POST | `/chat/me/messages` | Gửi tin `{ content, action }` (≤ 1000 ký tự). `action` là mã lệnh của nút trả lời nhanh khách vừa bấm (vd. `occ:BIRTHDAY`), gõ tay thì bỏ trống. Chưa có cuộc chat mở thì tạo mới, bắt đầu với trợ lý tự động. Nút bấm → bot kịch bản trả lời ngay trong response; gõ tay → Claude soạn ở luồng riêng nếu có khoá, không thì bot bắt từ khoá | Đăng nhập |
| POST | `/chat/me/handoff` | Khách bấm "Gặp nhân viên": `AI` → `WAITING_STAFF`; không có cuộc chat mở → 409 | Đăng nhập |
| GET | `/chat/conversations?status=` | Hộp thư, mới nhất trước; bỏ trống `status` = mọi cuộc chưa đóng | ADMIN, STAFF |
| GET | `/chat/conversations/summary` | Số cuộc chat theo trạng thái | ADMIN, STAFF |
| GET | `/chat/conversations/{id}?afterId=` | Nội dung cuộc chat; xoá số chưa đọc của nhân viên | ADMIN, STAFF |
| POST | `/chat/conversations/{id}/messages` | Nhân viên trả lời → `WITH_STAFF`, AI dừng; cuộc đã đóng → 409 | ADMIN, STAFF |
| POST | `/chat/conversations/{id}/return-to-ai` | Trả cuộc chat cho trợ lý tự động (bot kịch bản luôn có, Claude khi có khoá) → `AI`; cuộc đã đóng → 409 | ADMIN, STAFF |
| POST | `/chat/conversations/{id}/close` | Kết thúc; khách nhắn tiếp sẽ mở cuộc mới | ADMIN, STAFF |

Không có id cuộc chat trên URL của khách: chủ cuộc chat lấy từ JWT, khách không đổi số để đọc
chat của người khác được.

**Tin nhắn** có thêm `quickReplies` (`[{ label, action }]`) và `cards` (thẻ bó hoa: `id, name, imageUrl,
priceFrom, sizeCount, stems, leadDays, link`) — lưu ở cột `payload` (JSON) của `chat_messages`.

**Trợ lý tự động = bot kịch bản (luôn có, miễn phí) + Claude API (khi có khoá).** Bot không lưu
trạng thái: mỗi nút mang đủ thông tin các bước trước.

| `action` | Bot trả lời | Dữ liệu từ |
|---|---|---|
| `menu`, `find`, `faq` | Menu / hỏi dịp / câu hỏi thường gặp | — |
| `occ:DỊP` | Hỏi ngân sách | — |
| `find:DỊP:MIN-MAX[:TRANG]` | 3 bó còn hàng, đúng dịp và khoảng giá, nút "Xem thêm mẫu" | product-service `GET /products` |
| `delivery` | Giờ chốt đơn hôm nay, vùng giao, khung giờ, ngưỡng miễn phí | order-service `GET /orders/options` |
| `orders` | 3 đơn gần nhất của chính khách | order-service `GET /orders/my` (JWT của khách) |
| `faq:payment\|card\|photo\|care\|cancel` | Trả lời cố định; thiệp và quà kèm lấy giá thật | order-service `GET /orders/options` |
| `custom` | Dẫn sang trang đặt hoa theo yêu cầu | — |
| `staff` | Chuyển `WAITING_STAFF` | — |

Gõ tay (không có khoá Claude): bỏ dấu, chữ thường, bắt từ khoá — dịp (`sinh nhật`, `khai trương`,
`viếng`…), ngân sách (`500k`, `1 triệu`, `1tr5`, `700.000đ`, `2 củ`), đơn hàng, giờ giao, thanh toán,
thiệp. Nói tới khiếu nại, hoàn tiền, huỷ / sửa đơn → chuyển nhân viên. Không hiểu → menu.

**Trạng thái:** `AI` (trợ lý tự động đang trả lời) → `WAITING_STAFF` (khách yêu cầu, hoặc AI tự chuyển khi
khách khiếu nại / đòi hoàn tiền / muốn sửa đơn / AI không chắc / Claude API lỗi / quá
`chat.ai-max-replies` câu) → `WITH_STAFF` (nhân viên trả lời) → `CLOSED`.

**Trợ lý AI** gọi Claude API bằng SDK chính thức `com.anthropic:anthropic-java` (model
`ANTHROPIC_MODEL`, mặc định `claude-opus-5-5`, effort `low`), tự chạy vòng lặp công cụ tối đa 6
bước. Công cụ — đều là lời gọi API chỉ đọc:

| Công cụ | Gọi tới |
|---|---|
| `search_bouquets` (dịp, màu, khoảng giá, từ khoá) | product-service `GET /products` |
| `get_bouquet` | product-service `GET /products/{id}` |
| `get_delivery_rules` | order-service `GET /orders/options` |
| `get_my_orders` | order-service `GET /orders/my` bằng JWT của khách |
| `handoff_to_staff` | chuyển cuộc chat sang `WAITING_STAFF` |

System prompt và danh sách công cụ cố định (không chèn ngày giờ) để dùng prompt caching; "hôm nay"
AI tự hỏi qua `get_delivery_rules`. Thiếu `ANTHROPIC_API_KEY` → `aiEnabled: false`: cuộc chat mới
vẫn bắt đầu ở `AI` nhưng chỉ bot kịch bản trả lời (cả nút bấm lẫn câu gõ tay).

## auth-service — API nội bộ bổ sung

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/internal/users/{id}/contact` | `{ id, username, email, displayName }` — cho notification-service |
| PATCH | `/api-keys/{id}/rate-limit` (qua Gateway, ADMIN) | `{ rateLimitPerMinute }` 1–10.000 |

## Route dành cho đối tác ngoài

| Method | Endpoint qua Gateway | Forward tới | Xác thực |
|---|---|---|---|
| GET | `/api/public/products` | `product-service` `/products` | `X-API-KEY`, scope `products:read` |

Khoá **không còn** là chuỗi tĩnh trong `application.yml`. `auth-service` giữ bảng
`api_keys` (chủ sở hữu, scope, trạng thái, hạn dùng); Gateway hỏi sang
`/internal/api-keys/validate` rồi nhớ kết quả trong `partner.cache-ttl-seconds` giây
(mặc định 60 — thu hồi có độ trễ tương ứng; đặt `PARTNER_KEY_CACHE_TTL=0` để tắt cache).

Mã trạng thái phía đối tác: **401** thiếu header, **403** khoá sai / đã thu hồi / hết hạn
/ thiếu scope, **429** vượt hạn mức của khoá, **503** khi chưa hỏi được `auth-service` —
không bao giờ cho qua khi chưa kiểm tra được.

**Giới hạn tần suất.** Mỗi khoá có `rateLimitPerMinute` (mặc định 60, ADMIN đổi được). Gateway
đếm bằng token bucket theo từng khoá và luôn trả `X-RateLimit-Limit`, `X-RateLimit-Remaining`;
vượt hạn mức thì 429 kèm `Retry-After` (giây). Bộ đếm nằm trong bộ nhớ của một Gateway — chạy
nhiều Gateway thì phải chuyển sang Redis.

Sau khi kiểm tra xong, Gateway gắn `X-Partner-Name` cho service phía sau và **luôn xoá**
header này khỏi request của client trên mọi route, để không ai tự khai danh tính đối tác.

Khoá gốc chỉ tồn tại trong response của lệnh cấp khoá; CSDL chỉ giữ SHA-256 của nó.

## Endpoint của monolith bị bỏ

| Endpoint cũ | Lý do |
|---|---|
| `/hello/**` | Endpoint làm quen của bài thực hành SOS01, không thuộc nghiệp vụ |
| `POST /api2025/users` | Trùng chức năng với `/auth/register`, gộp lại |
| `GET /api2025/admin/overview` | Cần dữ liệu từ cả 3 service — xem ghi chú bên dưới |

### Ghi chú về trang tổng quan Admin

`GET /api2025/admin/overview` của monolith đếm sản phẩm, đơn hàng và doanh thu bằng một
câu truy vấn trên cùng một DB. Sau khi tách, dữ liệu nằm ở ba DB khác nhau nên không làm
như vậy được nữa. Hai cách:

1. **Frontend tự ghép** — gọi song song từng service rồi cộng lại. Đơn giản, không phải sửa backend.
2. **Backend tổng hợp** — tạo endpoint ở Gateway hoặc một service riêng đứng ra gọi cả ba.

Đồ án dùng **cách lai**, chia theo đúng ranh giới sở hữu dữ liệu:

- Phần nào **order-service tự tính được** thì để nó tính: doanh thu, biểu đồ theo ngày và top
  bán chạy đều chỉ cần bảng `orders` / `order_items`, nên có endpoint riêng
  `GET /orders/overview` (`OrderOverviewService`). Gộp ở đây tránh cho frontend phải tải về
  toàn bộ đơn hàng rồi tự cộng.
- Ba con số **tổng sản phẩm / tổng danh mục / tổng khách hàng** thì không: chúng thuộc CSDL mà
  order-service không được phép đọc. Frontend lấy riêng và ghép lại trong `getAdminOverview`
  (`admin-frontend/src/lib/api.ts`), gọi song song `/api/orders/overview`,
  `/api/products?page=0&size=1` (lấy `totalElements`), `/api/categories` và `/api/users`.

Tức trang Tổng quan ghép từ **4 nguồn**. Không chọn cách 2 thuần tuý vì như vậy phải dựng thêm
một service tổng hợp chỉ để đếm ba con số — không đáng với phạm vi đồ án.

## Quy ước mã trạng thái dùng chung

| Mã | Khi nào |
|---|---|
| 200 | Lấy / sửa thành công |
| 201 | Tạo mới thành công |
| 204 | Xoá thành công, không có body |
| 400 | Lỗi validation đầu vào |
| 401 | Chưa xác thực: thiếu token, token hỏng hoặc hết hạn |
| 403 | Đã xác thực nhưng không đủ quyền (sai role, sai scope) |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột nghiệp vụ: hết hàng, không gọi được service phụ thuộc, GHN từ chối (địa chỉ không hỗ trợ, vận đơn đã lấy hàng), đơn đã thanh toán |
| 429 | Khoá đối tác vượt hạn mức request/phút |
| 502 | Cổng thanh toán từ chối tạo giao dịch / hoàn tiền, hoặc không phản hồi |
| 503 | GHN / `order-service` không phản hồi, GHN chưa được cấu hình, hoặc circuit breaker đang mở (từ chối ngay, không chờ timeout) |

**Bắt buộc khai `authenticationEntryPoint`.** Mặc định Spring Security trả **403** cho cả
trường hợp thiếu token, vì khi không khai gì nó dùng `Http403ForbiddenEntryPoint`. Như vậy
sai với bảng trên và làm hỏng cơ chế tự đăng xuất khi hết phiên ở frontend. Mỗi
`SecurityConfig` phải có:

```java
.exceptionHandling(ex -> ex.authenticationEntryPoint(
        (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
```
