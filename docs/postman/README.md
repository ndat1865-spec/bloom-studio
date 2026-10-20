# Bộ Postman — Bloom Studio

| File | Là gì |
|---|---|
| `Bloom-Studio.postman_collection.json` | Collection v2.1: 210 request, 18 thư mục, mỗi request có test tự kiểm mã trạng thái và dữ liệu trả về |
| `anh-mau.jpg` | Ảnh dùng cho 5 request upload (ảnh hoa, ảnh bó thành phẩm, ảnh mẫu đặt hoa theo yêu cầu) |

Mọi request gọi **Gateway `http://localhost:8080`** (biến `{{baseUrl}}`), không request nào gọi
thẳng 8081–8086.

## Chạy bằng Postman

1. Bật backend: `docker compose up -d` ở gốc repo, đợi `docker compose ps` báo đủ service.
2. Postman → **File → Import** (hoặc kéo thả) → chọn `Bloom-Studio.postman_collection.json`.
3. Chép `anh-mau.jpg` vào thư mục làm việc của Postman (mặc định `C:Users<tên>Postmaniles`,
   xem ở Settings → General → *Working directory*) để 5 request upload tìm thấy file.
4. Chuột phải collection → **Run** → **Start run**.

**Postman 12 xáo thứ tự thư mục và request khi import.** Collection tự dẫn đường: script cấp
collection gọi `pm.execution.setNextRequest` theo một danh sách cố định, nên Runner vẫn chạy đúng
thứ tự dù thanh bên hiển thị lộn xộn. Request cuối xoá token, để lần Runner sau luôn bắt đầu lại
từ *Đăng nhập ADMIN*.

**Gửi lẻ một request:** khi chưa có token (mới import, hoặc vừa chạy hết bộ), mọi request trừ
*Đăng nhập ADMIN* đều bị bỏ qua kèm lời nhắc ở Console. Gửi *Đăng nhập ADMIN* trước, rồi các
request chuẩn bị mà request cần dùng (đăng nhập khách, chọn bó hoa, tạo danh mục...). Giá trị biến
lấy được trong Runner không giữ lại cho lần gửi lẻ.

## Chạy bằng dòng lệnh (Newman)

Ở gốc repo:

```bash
npx newman run docs/postman/Bloom-Studio.postman_collection.json --working-dir docs/postman
```

Cuối lần chạy Newman in bảng tổng: số request, số kiểm tra đạt / hỏng.

## Các thư mục

| # | Thư mục | Nội dung chính |
|---|---|---|
| 0 | Chuẩn bị | Đăng nhập ADMIN / STAFF / john, sai mật khẩu 401, đăng ký khách mới, tự khai `role: ADMIN` vẫn ra CUSTOMER |
| 1 | auth-service | Hồ sơ của tôi, token giả 401, đăng nhập Google bằng token giả 400, quản lý tài khoản (ADMIN), không tự hạ quyền / tự xoá mình |
| 2 | product-service | Lọc / tìm / phân trang, giá theo cỡ bó, CRUD danh mục và hoa (401 / 403 / 400 / 201), upload và xem ảnh, endpoint giữ cho SOS07/09, đánh giá |
| 2b | product-service | Endpoint giữ cho SOS07 / SOS09 (thêm hoa vào danh mục, upload độc lập, thay ảnh) |
| 3 | Đối tác — API Key | Thiếu khoá 401, khoá sai 403, JWT không thay được API Key, cấp khoá (chỉ hiện một lần), hạn mức 2/phút → 429, khoá đã thu hồi 403, thiếu scope 403 |
| 4 | Giao hàng, mã giảm giá | Quy tắc giao hoa, địa giới + phí GHN, tạo / kiểm / tắt / xoá mã giảm giá, nhân viên chỉ xem mã |
| 5 | Đặt hoa & vòng đời đơn | Đặt hàng (chủ đơn lấy từ JWT, giá lấy từ product-service), chống IDOR, PENDING → … → DELIVERED, ảnh thành phẩm, đánh giá sau khi nhận |
| 5b | Kịch bản kiến trúc | **Hết hàng 409 và bù trừ tồn kho** (tồn kho trước / sau) |
| 5c | Kiểm tra đầu vào & huỷ đơn | Giỏ trống, ngày đã qua, cỡ sai → 400; huỷ đơn hoàn kho |
| 6 | payment-service | Tạo giao dịch lấy `payUrl`, đơn trực tuyến chưa trả dừng ở CONFIRMED, hoàn tiền 409 |
| 6b | Callback từ cổng | VNPay / MoMo / ZaloPay gửi chữ ký giả bị từ chối |
| 7 | GHN | Tạo / cập nhật / huỷ vận đơn, webhook giả không đổi được đơn |
| 7b | Giả lập shipper | Lấy hàng → đang giao → đã giao (chỉ môi trường thử GHN) |
| 8 | Đặt hoa theo yêu cầu | Gửi yêu cầu + ảnh mẫu, báo giá, đặt theo báo giá, huỷ đơn thì yêu cầu về QUOTED, từ chối |
| 9 | chat-service | Bot kịch bản (nút, gợi ý thẻ hoa), gặp nhân viên, hộp thư nhân viên, trả lại trợ lý, đóng cuộc chat |
| 10 | notification-service | Nhật ký email, email của một đơn |
| 11 | api-gateway | `/internal/**` không lộ ra ngoài (404 kể cả token ADMIN), CORS cho 5173 / 5174, chặn origin lạ |
| 12 | Dọn dữ liệu | Xoá hoa tạm, danh mục tạm, tài khoản thử role |

## Dữ liệu sau mỗi lần chạy

Mỗi lần chạy đăng ký một khách mới `khach_pm_<thời điểm>` (mật khẩu `postman123`). Đơn hàng,
đánh giá, yêu cầu đặt hoa, chat đều dùng khách này nên không đụng vào `john`. Hoa tạm, danh mục
tạm, mã giảm giá, API Key, tài khoản nhân viên thử đều bị xoá ngay trong lần chạy. Còn lại:

- khách `khach_pm_*` với vài đơn: 2 đơn **DELIVERED** (một giao tay, một qua GHN giả lập — có ảnh
  thành phẩm, hành trình, email trong Mailpit), các đơn còn lại đã huỷ;
- tồn kho bó được chọn giảm 2 cành (hai đơn đã giao);
- một cuộc chat đã đóng.

Doanh thu trên trang Tổng quan vì vậy tăng theo số lần chạy.

## Tính năng phụ thuộc `.env`

| Phần | Cần | Thiếu thì |
|---|---|---|
| Thư mục 4 (địa giới, phí GHN), thư mục 7 | `GHN_TOKEN`, `GHN_SHOP_ID` | Tự bỏ qua (skip) |
| Thư mục 7b (giả lập shipper) | GHN môi trường thử | Tự bỏ qua |
| Thư mục 6 (phần cần cổng) | Khoá VNPay, MoMo hoặc ZaloPay | Tự bỏ qua; ưu tiên VNPay → MoMo → ZaloPay |

Địa chỉ giao mặc định: Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội (`districtId` 1485, `wardCode`
1A0601). Môi trường thử của GHN báo *"Lỗi hệ thống"* khi tạo vận đơn tới Phường Hàng Bài, Quận
Hoàn Kiếm (phí giao vẫn tính được) — Cầu Giấy và Hà Đông tạo vận đơn bình thường.

## Đã chạy thử (06/10/2026)

Docker Compose dựng lại từ mã nguồn hiện tại, `.env` đủ khoá GHN / VNPay / MoMo / ZaloPay,
chưa có `ANTHROPIC_API_KEY`. Newman 6.2.2, nhiều lần liên tiếp: **210/210 request, 331/331 kiểm tra
đạt**, mỗi lần khoảng 10–18 giây; bản bị xáo trộn ngẫu nhiên toàn bộ thứ tự cũng đạt 331/331. Postman
desktop 12.26 (Runner): **331/331 đạt**. Chạy riêng thư mục 6 và 7 với GHN / cổng thanh toán coi như
chưa khai: các request cần chúng đều được bỏ qua, không gửi đi.
