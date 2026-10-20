# auth-service — Xác thực và người dùng

Cổng **8081** · CSDL `bloom_auth`

Giữ tài khoản người dùng, băm mật khẩu bằng BCrypt, ký JWT, và quản lý API Key của đối tác.
Hai service nghiệp vụ còn lại **không gọi sang đây** để kiểm tra token: chúng dùng chung
`jwt.secret` và tự xác thực chữ ký.

## Chạy

```bat
cd auth-service
.\mvnw.cmd spring-boot:run
```

Cần MySQL đang chạy, CSDL `bloom_auth` đã tạo và biến `DB_PASSWORD`. Lần đầu `DataSeeder`
tạo `admin`/`admin123` (ADMIN), `john`/`john123` (CUSTOMER), `staff`/`staff123` (STAFF) và khoá đối tác demo.

## Endpoint (qua Gateway thêm tiền tố `/api`)

| Method | Đường dẫn | Quyền |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Công khai |
| GET | `/auth/me` | Đã đăng nhập |
| PUT | `/auth/me/profile` | Đã đăng nhập |
| GET, PUT, DELETE | `/users`, `/users/{id}` | ADMIN |
| GET, POST | `/api-keys` | ADMIN |
| POST, DELETE | `/api-keys/{id}/revoke`, `/api-keys/{id}` | ADMIN |
| POST | `/internal/api-keys/validate` | Chỉ Gateway gọi |

Danh sách đầy đủ: [docs/blueprint-api.md](../docs/blueprint-api.md).

## File đáng đọc

- `security/JwtUtil.java`, `security/JwtAuthFilter.java` — ký và đọc JWT (JJWT **0.12.6**)
- `config/SecurityConfig.java` — phân quyền theo đường dẫn
- `service/ApiKeyService.java` — khoá gốc chỉ hiện một lần, CSDL chỉ lưu SHA-256

## Kiểm thử

```bat
.\mvnw.cmd test
```

`AuthLoginTests` (sai mật khẩu phải ra 401, không phải 500) và `ApiKeyTests` (danh sách
không bao giờ lộ khoá gốc).

## Lưu ý

- `SecurityConfig` phải giữ `.dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()`
  và `authenticationEntryPoint` trả 401. Thiếu một trong hai thì mọi lỗi 404/400/500 hiện
  thành 401, hoặc thiếu token lại ra 403 làm frontend không tự đăng xuất.
- `jwt.secret` phải **giống hệt** ở `auth-service`, `product-service`, `order-service`.

[Quay lại README chung](../README.md)
