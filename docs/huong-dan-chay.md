# Hướng dẫn chạy hệ thống

Tài liệu vận hành. Làm đúng thứ tự từ trên xuống.

---

## 0. Kiểm tra một lần trước khi bắt đầu

Mở **Command Prompt** mới, chạy lần lượt 4 lệnh:

```
echo %JAVA_HOME%
```
→ phải ra `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot`

```
echo %DB_PASSWORD%
```
→ phải ra mật khẩu root MySQL

```
node -v
```
→ phải ra `v24.x` trở lên

```
sc query MySQL80 | findstr STATE
```
→ phải ra `RUNNING`

Nếu hai lệnh `echo` đầu ra chính chuỗi `%JAVA_HOME%` / `%DB_PASSWORD%` thì biến chưa
được đặt, hoặc cửa sổ Command Prompt này mở từ **trước** lúc đặt biến — đóng hẳn rồi mở
cửa sổ mới.

---

## 1. Mở 7 cửa sổ Command Prompt

Mỗi thành phần một cửa sổ riêng, **không đóng cửa sổ nào** trong lúc chạy. Các lệnh `cd`
bên dưới tính từ thư mục chứa repo `bloom-studio`. Khởi động
đúng thứ tự bên dưới: `order-service` cần `product-service` sống để trừ tồn kho,
`payment-service` cần `order-service`, còn `api-gateway` cần cả bốn service phía sau.

### Cửa sổ 1 — auth-service (cổng 8081)

```
cd bloom-studio\auth-service
```
```
mvnw spring-boot:run
```

Chạy được khi thấy:
```
Tomcat started on port 8081 (http)
Started AuthServiceApplication in ... seconds
```

### Cửa sổ 2 — product-service (cổng 8082)

```
cd bloom-studio\product-service
```
```
mvnw spring-boot:run
```

Chạy được khi thấy `Tomcat started on port 8082 (http)`.

### Cửa sổ 3 — order-service (cổng 8083)

```
cd bloom-studio\order-service
```
```
mvnw spring-boot:run
```

Chạy được khi thấy `Tomcat started on port 8083 (http)`.

Muốn giao hàng qua GHN thì đặt `GHN_TOKEN` và `GHN_SHOP_ID` trước khi mở cửa sổ này (xem
README chung, mục *GHN và cổng thanh toán*). Không đặt thì vẫn chạy, địa chỉ gõ tự do và phí
giao hàng cố định.

### Cửa sổ 3b — payment-service (cổng 8084)

```
cd bloom-studio\payment-service
```
```
mvnw spring-boot:run
```

Chạy được khi thấy `Tomcat started on port 8084 (http)`. CSDL `bloom_payment` tự tạo. Cổng
thanh toán nào chưa đặt khoá (`VNPAY_*`, `MOMO_*`, `ZALOPAY_*`) thì tự ẩn khỏi trang thanh
toán; `GET http://localhost:8080/api/payments/methods` cho biết cổng nào đang bật.

### Cửa sổ 4 — api-gateway (cổng 8080)

```
cd bloom-studio\api-gateway
```
```
mvnw spring-boot:run
```

Chạy được khi thấy **`Netty started on port 8080`** — không phải Tomcat. Gateway dùng
nền reactive (WebFlux) nên chạy Netty, đây là dấu hiệu đúng chứ không phải lỗi.

### Cửa sổ 5 — customer-frontend (cổng 5173)

```
cd bloom-studio\customer-frontend
```
```
npm ci
```
```
npm run dev
```

Chạy được khi thấy `Local: http://localhost:5173/`. `npm ci` chỉ cần lần đầu hoặc khi
`package-lock.json` đổi.

**Muốn thử ZaloPay** thì chạy `npm run dev:https` thay cho `npm run dev`, rồi mở
`https://localhost:5173`. Trang kết quả của ZaloPay chỉ đưa khách về địa chỉ `https://`:
gặp `http://localhost` nó chặn và đứng yên ở trang "Thanh toán thành công", bấm "Về ngay"
cũng không đi. VNPay và MoMo không kiểm như vậy nên chạy `http` vẫn được.

- Chứng chỉ là tự ký: lần đầu trình duyệt cảnh báo, bấm *Nâng cao* → *Tiếp tục truy cập
  localhost*.
- `PAYMENT_RETURN_URL` của payment-service phải đổi thành
  `https://localhost:5173/payment/result` cho khớp — lệch giao thức thì cổng thanh toán đưa
  khách về một địa chỉ không có ai nghe.
- Gateway đã cho phép CORS từ `https://localhost:5173` và `https://127.0.0.1:5173`.

Không quay về được thì tiền vẫn không mất: IPN/callback không tới được máy local, nhưng
trang chi tiết đơn tự hỏi lại cổng thanh toán mỗi khi mở trang hoặc quay lại tab, đơn tự
chuyển sang *Đã thanh toán*.

### Cửa sổ 6 — admin-frontend (cổng 5174)

```
cd bloom-studio\admin-frontend
```
```
npm ci
```
```
npm run dev
```

Chạy được khi thấy `Local: http://localhost:5174/`. App này chỉ cho tài khoản ADMIN đăng nhập.

Hai frontend là hai ứng dụng riêng, **không dùng chung phiên đăng nhập**: localStorage tách
theo cổng, sang app kia phải đăng nhập lại.

Muốn dừng thành phần nào thì bấm `Ctrl + C` trong cửa sổ đó.

---

## 2. Kiểm tra nhanh từng cổng

Mở **cửa sổ Command Prompt thứ sáu** (đừng dùng lại 5 cửa sổ đang chạy):

| Lệnh | Kỳ vọng |
|---|---|
| `curl -i http://localhost:8082/products` | `200` kèm JSON danh sách hoa |
| `curl -i http://localhost:8083/orders/my` | `401` — service sống và đang chặn đúng |
| `curl -i http://localhost:8080/api/products` | `200`, JSON giống hệt cổng 8082 |

Dòng thứ ba là dòng quan trọng nhất: nó chứng minh Gateway định tuyến đúng.
Dòng thứ hai trả `401` là **đúng**, không phải lỗi — gọi API cần đăng nhập mà không có
token thì phải bị từ chối.

---

## 3. Tài khoản

| Username | Mật khẩu | Quyền | Nguồn |
|---|---|---|---|
| `admin` | `admin123` | ADMIN | DataSeeder tạo tự động |
| `john` | `john123` | CUSTOMER | DataSeeder, tài khoản test |
| `staff` | `staff123` | STAFF | DataSeeder, nhân viên: xử lý đơn, hoa; không tạo mã giảm giá, không vào Khoá API |
| `customer` | `bloom123` | CUSTOMER | chuyển từ CSDL cũ, có sẵn 2 đơn hàng |

---

## 4. Kịch bản test bằng Postman

> Bộ Postman dựng sẵn cho **toàn bộ** API (210 request, có test tự kiểm) nằm ở `docs/postman/` —
> import `Bloom-Studio.postman_collection.json` rồi *Run collection*, xem `docs/postman/README.md`.
> Phần dưới đây là các bước gõ tay để hiểu từng request.

Tạo Collection tên `Bloom Microservices`. **Mọi request đều gọi cổng 8080**, không gọi
thẳng 8081/8082/8083 nữa.

### 4.1 Lấy token

| | |
|---|---|
| Method | `POST` |
| URL | `http://localhost:8080/api/auth/login` |
| Headers | `Content-Type: application/json` |
| Body | raw → JSON |

```json
{ "username": "admin", "password": "admin123" }
```

Kỳ vọng `200`:

```json
{ "userId": 1, "token": "eyJhbGciOiJIUzI1NiJ9...", "username": "admin", "role": "ADMIN" }
```

Copy giá trị `token`. Dán vào [jwt.io](https://jwt.io) sẽ thấy ba claim `sub`, `userId`,
`role` bên trong — đây là chỗ minh hoạ trực quan nhất khi thuyết trình.

Làm thêm một lần nữa với `customer` / `bloom123` để có token CUSTOMER.

### 4.2 Bảng kịch bản

Cột **Token** ghi loại token đặt vào header `Authorization: Bearer <token>`.

| # | Method | URL (sau `http://localhost:8080`) | Token | Kỳ vọng |
|---|---|---|---|---|
| 1 | GET | `/api/products` | không | `200` — xem hoa không cần đăng nhập |
| 2 | GET | `/api/categories` | không | `200` |
| 3 | POST | `/api/products` | **không** | `401` — Gateway chặn sớm |
| 4 | POST | `/api/products` | CUSTOMER | `403` — product-service từ chối vì không phải ADMIN |
| 5 | POST | `/api/products` | ADMIN | `201` |
| 6 | GET | `/api/public/products` | không, **không** `X-API-KEY` | `401` |
| 7 | GET | `/api/public/products` | `X-API-KEY: sai-key` | `403` |
| 8 | GET | `/api/public/products` | `X-API-KEY: bloom-partner-key-2026` | `200` |
| 9 | GET | `/api/orders/my` | CUSTOMER | `200` — 2 đơn của `customer` |
| 10 | GET | `/api/orders` | CUSTOMER | `403` — chỉ ADMIN xem hết đơn |
| 11 | GET | `/api/orders` | ADMIN | `200` |
| 12 | POST | `/api/orders` | CUSTOMER | `201` — xem mục 4.3 |
| 13 | GET | `/api/orders/overview` | ADMIN | `200` — doanh thu, biểu đồ, top bán chạy |
| 14 | GET | `/api/products` | không | tồn kho món vừa đặt đã **giảm** |

Body cho **#5** (thêm sản phẩm):

```json
{
  "name": "Bó hồng đỏ Ecuador",
  "price": 45.0,
  "description": "Hoa nhập, 20 bông",
  "stockQuantity": 10,
  "category": { "id": 1 }
}
```

Bước 3, 4, 6, 7 chính là phần chứng minh **hai lớp bảo mật độc lập**: JWT cho người
dùng thật, API Key cho đối tác máy-gọi-máy. Có cái này không thay được cái kia.

### 4.3 Đặt hàng — đường đi qua cả 4 thành phần

| | |
|---|---|
| Method | `POST` |
| URL | `http://localhost:8080/api/orders` |
| Headers | `Content-Type: application/json` và `Authorization: Bearer <token CUSTOMER>` |

```json
{
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "address": "12 Nguyễn Huệ, Quận 1",
  "note": "Giao buổi sáng",
  "deliveryDate": "2026-12-25",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
```

Chú ý: **không gửi `userId`**. Chủ đơn lấy từ token, gửi lên cũng bị bỏ qua.

Đường đi thật sự của request này:

```
Postman → api-gateway(8080) → order-service(8083) → product-service(8082)
                                                     PATCH /internal/products/1/reserve-stock
```

Kiểm chứng sau khi đặt:
- `GET /api/products/1` → `stockQuantity` giảm đúng 2
- `GET /api/orders/my` → có đơn mới, `productName` và `unitPrice` đã được chụp lại

---

## 5. Ba kịch bản chứng minh kiến trúc

Đây là phần đáng quay màn hình để trình bày.

### 5.1 Hết hàng — lỗi lan truyền giữa hai service

Đặt số lượng lớn hơn tồn kho. Lưu ý mỗi dòng tối đa **99** — gửi `9999` sẽ bị
validation chặn ở `400` và **không** chạm tới bước kiểm tra tồn kho. Tồn kho mặc định
sau khi chuyển dữ liệu là 50, nên dùng `99`:

```json
{ "items": [ { "productId": 1, "quantity": 99 } ] }
```

Kỳ vọng `409` với thông báo *"không đủ hàng"*. Lỗi này do **product-service** phát hiện,
**order-service** chuyển tiếp, Postman nhận được — đi qua hai service mà vẫn ra thông
báo đọc được.

### 5.2 Bù trừ khi đặt nhiều món

Đặt 2 món trong một đơn, món thứ hai để số lượng vượt tồn kho:

```json
{
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 99 }
  ]
}
```

Kỳ vọng `409`, và quan trọng hơn: **tồn kho của sản phẩm 1 phải giữ nguyên**. Kiểm tra
bằng `GET /api/products/1` trước và sau.

Đây là cơ chế bù trừ trong `OrderService.createOrder` — món 1 đã bị trừ kho rồi, khi món
2 lỗi thì phải trả lại. `@Transactional` không làm được việc này vì nó chỉ quản được
bảng trong `bloom_order`, không rollback nổi thay đổi bên `product-service`.

### 5.3 Tắt một service — hệ thống không sập

1. Sang **cửa sổ 2** (`product-service`), bấm `Ctrl + C` để tắt hẳn.
2. Trên frontend, thử **đặt hàng** → hiện lỗi *"Không thể kết nối tới product-service"*,
   không treo, không trắng trang.
3. Vẫn trên frontend, thử **đăng nhập** → vẫn chạy bình thường, vì `auth-service` độc lập.
4. Bật lại cửa sổ 2, đặt hàng lại → chạy bình thường, **không cần khởi động lại**
   service nào khác.

Bước 3 là điểm mấu chốt: trong monolith, một lỗi làm chết cả ứng dụng. Ở đây chỉ tính
năng phụ thuộc service đã tắt là hỏng, phần còn lại vẫn phục vụ được.

---

## 6. Kịch bản test trên giao diện

Bước 1–7 ở `http://localhost:5173` (khách hàng), bước 8–10 ở `http://localhost:5174` (quản trị).

| # | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Vào thẳng `/tai-khoan` khi chưa đăng nhập | Bị đưa về trang đăng nhập |
| 2 | Đăng nhập sai mật khẩu | Báo *"Sai tên đăng nhập hoặc mật khẩu"* |
| 3 | Đăng nhập `customer` / `bloom123` | Vào trang sản phẩm, header hiện tên |
| 4 | **F5 lại trang** | **Vẫn giữ đăng nhập**, không bị đá ra |
| 5 | Đăng nhập `customer` ở app quản trị (5174) | Bị từ chối: *"Tài khoản này không có quyền quản trị"* |
| 6 | Vào *Đơn hàng của tôi* | Thấy 2 đơn cũ đã chuyển từ CSDL monolith |
| 7 | Thêm hoa vào giỏ, đặt hàng | Đặt thành công, tồn kho giảm |
| 8 | Ở 5174, đăng nhập `admin` / `admin123` | Vào *Tổng quan*, hiện menu quản trị |
| 9 | Vào *Tổng quan* | Hiện doanh thu, biểu đồ, top bán chạy |
| 10 | Mở DevTools → Network, bấm quanh trang | Mọi request đều đi tới `localhost:8080`, không có request nào tới 8081/8082/8083 |

Bước 4 đáng chú ý: nhiều bài mắc lỗi khôi phục phiên trong `useEffect` khiến F5 luôn bị
đăng xuất. `AuthContext` ở đây đọc localStorage ngay trong lazy initializer nên không
dính lỗi đó.

Bước 10 chứng minh Gateway là **điểm vào duy nhất** — frontend không hề biết có bao
nhiêu service phía sau.

---

## 7. Lỗi thường gặp

| Thông báo | Nguyên nhân | Xử lý |
|---|---|---|
| `release version 17 not supported` | `JAVA_HOME` vẫn trỏ JDK 11 | Đóng hẳn cửa sổ, mở lại. Kiểm tra bằng `echo %JAVA_HOME%` |
| `Access denied for user 'root'@'localhost'` | Thiếu hoặc sai `DB_PASSWORD` | `echo %DB_PASSWORD%` trong cửa sổ mới |
| `Unknown database 'bloom_xxx'` | Chưa tạo database | Chạy lại `CREATE DATABASE` trong Workbench |
| `Port 8080 already in use` | Còn tiến trình cũ giữ cổng | `netstat -ano \| findstr :8080` rồi `taskkill /PID <pid> /F` |
| Frontend báo lỗi CORS | Gateway chưa chạy, hoặc frontend không chạy đúng cổng 5173 / 5174 | Bật cửa sổ 4. CORS chỉ khai ở Gateway |
| Gọi `/api/...` ra `404` | Gateway chạy nhưng service đích chưa lên | Xem lại cửa sổ 1–3 |
| Đăng nhập ra `401` với mật khẩu đúng | Tài khoản trong DB còn mật khẩu plain text | Chạy `database/fix-user-mapping.sql` |
| `Invalid HTTP method: PATCH` | Thiếu `JdkClientHttpRequestFactory` | Đã xử lý sẵn trong `RestTemplateConfig` |

---

## 8. Thứ tự tắt

Không bắt buộc, nhưng tắt ngược thứ tự bật thì log gọn hơn: cửa sổ 5 → 4 → 3 → 2 → 1.
Mỗi cửa sổ bấm `Ctrl + C`.

## 9. Cách khác: chạy bằng Docker Compose

Thay cho 5 cửa sổ Command Prompt ở mục 1. Cần **Docker Desktop** đã cài và đang chạy, cấp
**RAM từ 6 GB** trở lên (Settings → Resources). Bản tóm tắt từng bước nằm ở README, mục
*Chạy bằng Docker*.

> ✅ **Đã chạy thật ngày 15/09/2026** trên nền hoàn toàn sạch. Biên bản:
> `docs/ket-qua-docker-2026-09-15.md`. Lần dựng đầu mất ~50 phút vì phải tải ảnh nền và
> thư viện Maven; các lần sau có cache nên nhanh hơn nhiều.

### Chuẩn bị

```bash
cp .env.example .env
```

Sửa `DB_PASSWORD` trong `.env`. File này **không** được commit.

### Chạy

```bash
docker compose up --build
```

Lần đầu lâu vì phải tải ảnh nền và thư viện Maven. Những lần sau, không sửa code thì chỉ cần
`docker compose up -d`. Đợi 1–2 phút rồi kiểm tra mọi container đều `running` / `healthy`:

```bash
docker compose ps
```

Sau đó bật hai frontend như cửa sổ 5 và 6 ở mục 1.

Trên CSDL trắng, `product-service` tự nạp 20 sản phẩm và 3 danh mục; `auth-service` tự tạo
`admin` / `john` cùng khoá đối tác demo. Không phải chạy script chuyển dữ liệu — script đó
đọc CSDL monolith `ptpmhdv`, thứ không có trong container.

### Khác gì so với chạy tay

| | Chạy tay | Docker Compose |
|---|---|---|
| MySQL | 1 server, 3 schema | 3 container riêng, mỗi service một cái |
| Địa chỉ giữa các service | `localhost:808x` | tên service: `http://product-service:8082` |
| Cổng lộ ra ngoài | cả 4 (8080–8083) | **chỉ 8080** — ba service kia không gọi được từ máy thật |
| Ảnh tải lên | `product-service/uploads/` | volume `product-uploads` |
| Frontend | `npm run dev` ở cổng 5173 và 5174 | không đóng gói, vẫn chạy tay |

Cổng chỉ lộ 8080 là điểm đáng nói khi bảo vệ: nó biến "Gateway là điểm vào duy nhất" từ
một quy ước thành điều kiện kỹ thuật thật.

### Lệnh hay dùng

Xem log một service:

```bash
docker compose logs -f api-gateway
```

Sửa code một service thì chỉ build lại service đó:

```bash
docker compose up -d --build order-service
```

Tắt, giữ nguyên dữ liệu:

```bash
docker compose stop
```

Xoá container, vẫn giữ dữ liệu:

```bash
docker compose down
```

`down -v` sẽ xoá luôn volume, tức là **mất sạch dữ liệu** trong ba CSDL — chỉ dùng khi
muốn làm lại từ đầu.
