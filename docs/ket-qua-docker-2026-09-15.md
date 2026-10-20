# Kết quả chạy Docker Compose — 15/09/2026

Máy: Windows 11, Docker Desktop 29.8.0, Compose v5.5.1,
Docker được cấp 12 CPU / 3.8 GiB RAM.

Lượt đo cuối chạy trên **nền hoàn toàn sạch**: `docker compose down -v` xoá cả ba volume
CSDL lẫn volume ảnh, rồi `docker compose up -d` dựng lại từ đầu.

## Kết quả: đạt

### Dựng hệ thống

| Việc | Kết quả |
|---|---|
| `docker compose up --build` | 7 container lên, 3 MySQL đều `healthy` |
| Ảnh sau khi xây | mysql 1.12 GB · 4 ảnh service 542–567 MB |
| `sh ./mvnw` trong container | chạy được, **không** lỗi *permission denied* |
| Thời gian lần đầu | ~50 phút, gần hết là tải ảnh nền và thư viện Maven trên mạng chậm |

### Dữ liệu tự nạp trên CSDL trắng

| Kiểm tra | Kết quả |
|---|---|
| Sản phẩm | 20 |
| Danh mục | Bespoke Arrangements 8 · Event Florals 6 · Wedding Flowers 6 |
| Tài khoản | `admin`, `john` |
| Khoá API | `Doi tac demo` — `ACTIVE` |

### Ma trận quyền qua `localhost:8080`

| Tình huống | Mong đợi | Quan sát |
|---|---|---|
| `GET /api/products` (khách) | 200 | 200 |
| `GET /uploads/seed/noir-dahlia.jpg` | 200 | 200 |
| `GET /api/orders/my` thiếu token | 401 | 401 |
| `GET /api/users` bằng ADMIN | 200 | 200 |
| `GET /api/users` bằng CUSTOMER | 403 | 403 |
| `GET /api/api-keys` bằng CUSTOMER | 403 | 403 |
| `/api/public/products` khoá demo | 200 | 200 |
| `/api/public/products` khoá sai | 403 | 403 |
| `/api/public/products` thiếu khoá | 401 | 401 |

### Điều chỉ Docker mới chứng minh được

| Kiểm tra | Kết quả |
|---|---|
| Gọi `localhost:8081` / `8082` / `8083` từ máy thật | **không kết nối được** — chỉ 8080 lộ ra |
| `order-service` gọi `product-service` bằng **tên service** | đặt hàng 201, tồn kho 50 → 48 |
| Bù trừ khi hết hàng | 409, tồn kho giữ nguyên 48 |
| Tải ảnh lên volume | 200, `imageUrl` = `uploads/<uuid>_<tên>` |
| Đọc lại ảnh vừa tải qua Gateway | 200 |
| Xoá hẳn container rồi tạo lại | ảnh cũ **vẫn còn** — volume đúng việc |

Cổng chỉ lộ 8080 là điểm đáng nói khi bảo vệ: khi chạy tay trên máy, "Gateway là điểm vào
duy nhất" chỉ là quy ước — ai cũng gọi thẳng 8082 được. Chạy bằng Compose thì nó thành
điều kiện kỹ thuật, không lách được.

## Ba lỗi phát hiện khi chạy thật

Cả ba đều **không thể thấy** khi chạy tay trên máy.

### 1. Cửa hàng rỗng không trên CSDL mới

20 sản phẩm trên máy làm đồ án đến từ `database/migrate-from-monolith.sql`, mà script đó
đọc từ CSDL monolith `ptpmhdv` — thứ không tồn tại trong container. Không riêng Docker:
**bất kỳ ai clone repo về chạy trên MySQL mới cũng gặp**.

Đã thêm `DataSeeder` cho `product-service`, đọc `resources/seed/danh-muc-hoa.txt` và chỉ
chạy khi bảng `products` còn rỗng, nên máy đã có dữ liệu thật thì không bị đụng tới.
`SeedCatalogueTests` kiểm 20 dòng seed đều trỏ tới ảnh có thật trong classpath.

### 2. Tải ảnh trả 500 — `AccessDeniedException`

Docker tạo named volume rỗng với chủ sở hữu **root**, còn container chạy bằng tài khoản
thường `bloom` nên không ghi được. Sửa bằng cách tạo sẵn `/var/bloom/uploads` và `chown`
trong Dockerfile **trước** khi volume được gắn vào — Docker chép luôn quyền sở hữu của
điểm gắn sang volume mới.

### 3. `imageUrl` trả về đường dẫn ổ đĩa

`FileStorageService` ghép `imageUrl` từ `app.upload.dir`, tức là đường dẫn **trên đĩa**.
Chạy tay thì giá trị đó là `uploads` (tương đối) nên tình cờ trùng với đường dẫn web và
không ai thấy sai. Trong Docker, `UPLOAD_DIR=/var/bloom/uploads` là tuyệt đối nên
`imageUrl` thành `/var/bloom/uploads/...` và trình duyệt trả 404 — ảnh lưu đúng nhưng
không xem được.

Tách hẳn tiền tố web ra khỏi thư mục đĩa. `FileStorageServiceTests` dùng thư mục **tuyệt
đối** đúng như Docker; đã kiểm chứng ngược, đưa lỗi trở lại thì test thất bại.

## Lệnh hay dùng

```bash
docker compose logs -f api-gateway
```

```bash
docker compose down
```

`down -v` xoá luôn volume, tức là **mất sạch** cả ba CSDL và toàn bộ ảnh đã tải. Lần dựng
sau `DataSeeder` sẽ nạp lại 20 sản phẩm, nhưng đơn hàng và tài khoản tạo thêm thì mất.
