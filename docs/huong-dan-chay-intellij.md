# Chạy hệ thống bằng IntelliJ IDEA

Dành cho IntelliJ IDEA 2026.2. Chạy được cả 5 thành phần trong **một cửa sổ duy nhất**,
kèm nút Restart từng service — tiện hơn hẳn 5 cửa sổ Command Prompt.

Bản Community dùng được, nhưng thiếu hai thứ tiện: run configuration kiểu Spring Boot
và cửa sổ Endpoints. Với Community thì chạy bằng Maven run configuration (mục 3.2).

---

## 1. Mở project

Dự án gồm **4 project Maven độc lập**, không có pom cha — đúng tinh thần microservices:
mỗi service tự quản lý dependency của mình, không service nào ép phiên bản lên service khác.

### Cách mở (một cửa sổ cho tất cả)

1. **File → Open…**
2. Chọn thư mục gốc của repo `bloom-studio`, bấm **OK**
3. IntelliJ sẽ hỏi *"Maven projects found"* hoặc hiện thông báo **Load Maven Project** ở
   góc dưới bên phải → bấm **Load**
4. Nếu không thấy thông báo: mở cửa sổ **Maven** (bên phải), bấm dấu **＋**, rồi lần lượt
   chọn 4 file:

```
auth-service\pom.xml
product-service\pom.xml
order-service\pom.xml
api-gateway\pom.xml
```

Xong thì cửa sổ Maven phải liệt kê đủ 4 project.

> Đừng mở bằng **File → New → Project from Existing Sources**, nó hay gom nhầm thành một
> module duy nhất rồi báo lỗi trùng package.

---

## 2. Kiểm tra JDK và biến môi trường

### 2.1 JDK phải là 17

**File → Project Structure… → Project**

| Ô | Giá trị |
|---|---|
| SDK | `17` (Eclipse Adoptium / Temurin 17.0.20) |
| Language level | `17` |

Nếu danh sách SDK không có 17: bấm **Add SDK → JDK…** rồi trỏ tới
`C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot`.

Kiểm tra thêm ở **Settings → Build, Execution, Deployment → Build Tools → Maven →
Importing → JDK for importer** — cũng để 17.

### 2.2 DB_PASSWORD

IntelliJ đọc biến môi trường **lúc khởi động**. Nếu bạn đặt biến `DB_PASSWORD` sau khi
IntelliJ đã mở thì nó không thấy — phải **đóng hẳn IntelliJ rồi mở lại** (không chỉ đóng
project).

Kiểm tra nhanh: mở **Terminal** trong IntelliJ (`Alt + F12`), gõ:

```
echo %DB_PASSWORD%
```

Ra đúng mật khẩu là được. Ra `%DB_PASSWORD%` thì đóng hẳn IntelliJ, mở lại.

**Nếu không muốn phụ thuộc biến hệ thống**, đặt riêng cho từng run configuration:
Run → Edit Configurations… → chọn service → ô **Environment variables** → điền
`DB_PASSWORD=matkhaucuaban`. Cách này tiện khi chạy trên nhiều máy có mật khẩu
MySQL khác nhau.

---

## 3. Tạo run configuration

### 3.1 Bản Ultimate — Spring Boot

Cách nhanh nhất: mở từng class `main` rồi bấm mũi tên xanh ▶ bên trái dòng
`public static void main`. IntelliJ tự tạo run configuration và nhớ lại.

Bốn class cần chạy:

| Service | Class |
|---|---|
| auth-service | `dh13c6.nguyentiendat516.bloom.authservice.AuthServiceApplication` |
| product-service | `dh13c6.nguyentiendat516.bloom.productservice.ProductServiceApplication` |
| order-service | `dh13c6.nguyentiendat516.bloom.orderservice.OrderServiceApplication` |
| api-gateway | `dh13c6.nguyentiendat516.bloom.apigateway.ApiGatewayApplication` |

Mẹo tìm nhanh: `Ctrl + N` rồi gõ `AuthServiceApplication`.

### 3.2 Bản Community — Maven

**Run → Edit Configurations… → ＋ → Maven**, tạo 4 cấu hình:

| Ô | Giá trị |
|---|---|
| Name | `auth-service` |
| Working directory | `$PROJECT_DIR$\auth-service` |
| Run | `spring-boot:run` |

Làm tương tự cho 3 service còn lại, chỉ đổi `Name` và `Working directory`.

### 3.3 Frontend

**Run → Edit Configurations… → ＋ → npm**

| Ô | Giá trị |
|---|---|
| Name | `customer-frontend` |
| package.json | `customer-frontend\package.json` |
| Command | `run` |
| Scripts | `dev` |

Làm thêm một configuration `admin-frontend` giống hệt, chỉ đổi `package.json` thành
`admin-frontend\package.json`.

Nếu ô **Node interpreter** trống, chọn `Project` hoặc trỏ tới bản Node đã cài.

Không thấy loại **npm** trong danh sách: vào Settings → Plugins, bật plugin
**JavaScript and TypeScript** (Community cần bật thêm **Node.js**).

---

## 4. Chạy cả 4 service bằng một nút

### 4.1 Tạo Compound

**Run → Edit Configurations… → ＋ → Compound**

| Ô | Giá trị |
|---|---|
| Name | `Bloom - tất cả` |

Bấm ＋ trong ô danh sách, thêm lần lượt 4 configuration đã tạo ở mục 3, rồi **OK**.

Từ giờ chọn `Bloom - tất cả` trên thanh công cụ rồi bấm ▶ là cả 4 service cùng lên.

> **Compound chạy đồng thời, không theo thứ tự.** Với hệ này không sao: các service
> không cần nhau lúc khởi động. `order-service` chỉ gọi `product-service` khi có người
> đặt hàng, `api-gateway` chỉ chuyển tiếp khi có request. Khác với lúc chạy tay, ở đây
> không cần chờ service nào lên trước.

### 4.2 Cửa sổ Services

Sau khi bấm ▶, mở cửa sổ **Services** (`Alt + 8`). Đây là chỗ đáng dùng nhất của IntelliJ
với dự án microservices:

- Cả 4 service nằm cùng một cây, mỗi cái một tab log riêng
- **Restart** lại một service mà không đụng ba cái kia — rất hợp để test kịch bản tắt
  `product-service` ở mục 5.3 của `huong-dan-chay.md`
- Cột **Port** hiện rõ 8080 / 8081 / 8082 / 8083, thấy ngay cái nào chưa lên
- Bản Ultimate có thêm mục **Endpoints**, liệt kê toàn bộ URL mà service đang phục vụ

Frontend chạy riêng bằng hai configuration `customer-frontend` / `admin-frontend`, hoặc mở
Terminal (`Alt + F12`) rồi:

```
cd customer-frontend
npm run dev
```

và một Terminal khác cho `admin-frontend`.

---

## 5. Gọi thử API ngay trong IntelliJ

Bản Ultimate có HTTP Client, khỏi cần mở Postman. Tạo file `requests.http` bất kỳ trong
project rồi gõ:

```http
### Đăng nhập lấy token
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }

> {% client.global.set("token", response.body.token); %}

### Xem sản phẩm (không cần đăng nhập)
GET http://localhost:8080/api/products

### Thêm sản phẩm (cần quyền ADMIN)
POST http://localhost:8080/api/products
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "Bó hồng đỏ Ecuador",
  "price": 45.0,
  "description": "Hoa nhập, 20 bông",
  "stockQuantity": 10,
  "category": { "id": 1 }
}

### Route đối tác - dùng API Key thay cho JWT
GET http://localhost:8080/api/public/products
X-API-KEY: bloom-partner-key-2026
```

Dòng `client.global.set` lưu token lại, các request sau dùng `{{token}}` là xong — không
phải copy dán thủ công như Postman.

> **Lưu ý khi nộp bài:** nếu môn học yêu cầu ảnh chụp Postman có tên tài khoản ở góc phải
> thì vẫn phải dùng Postman. HTTP Client chỉ tiện lúc làm.

---

## 6. Lỗi hay gặp riêng với IntelliJ

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `release version 17 not supported` | Project SDK vẫn là 11 | Mục 2.1, và kiểm tra cả *JDK for importer* |
| `Access denied for user 'root'` dù `echo` trong Command Prompt ra đúng | IntelliJ mở từ trước lúc đặt biến | Đóng **hẳn** IntelliJ rồi mở lại, hoặc đặt biến ngay trong run configuration (mục 2.2) |
| Báo đỏ toàn bộ code, không nhận package | Chưa Load Maven project | Cửa sổ Maven → nút ⟳ **Reload All Maven Projects** |
| Lombok không sinh getter/setter | Không liên quan — dự án này **không dùng Lombok**, getter/setter viết tay | Bỏ qua |
| Chạy ▶ nhưng không thấy service nào lên | Đang chạy nhầm cấu hình của module khác | Xem lại tên trên thanh công cụ |
| `Port 8080 already in use` | Còn tiến trình cũ từ lần chạy trước | Cửa sổ Services → chuột phải → **Stop**, hoặc `netstat -ano \| findstr :8080` |
| Sửa code Java xong không thấy đổi | Spring Boot không tự nạp lại | Bấm **Restart** service đó trong cửa sổ Services |
| Sửa code React xong không thấy đổi | Vite tự nạp lại rất nhanh | `Ctrl + Shift + R` trên trình duyệt để bỏ cache |

---

## 7. Khuyến nghị

- **Không commit thư mục `.idea/`** — đã nằm trong `.gitignore` rồi. Mỗi máy có SDK và
  đường dẫn khác nhau, commit vào sẽ đá nhau liên tục.
- **Đặt `DB_PASSWORD` trong run configuration** thay vì biến hệ thống, nếu mật khẩu MySQL
  mỗi máy một khác.
- Chỉ cần chạy service đang sửa, cộng thêm những service nó gọi tới. Ví dụ
  làm frontend thì cần đủ 4 service; làm `product-service` thì chỉ cần một mình nó là
  test được bằng HTTP Client ở cổng 8082.
