# chat-service — Chat khách với studio, trợ lý tự động trả lời trước

Cổng **8086** · CSDL `bloom_chat` (tự tạo)

Khách chat ở góc phải mọi trang của cửa hàng. **Trợ lý tự động** trả lời trước, gồm hai phần:

- **Bot kịch bản** (`bot/ScriptedBot`) — luôn có, miễn phí: nút bấm *Tìm hoa theo dịp → chọn dịp →
  chọn ngân sách → 3 thẻ bó hoa còn hàng*, *Hôm nay còn giao kịp?*, *Đơn của tôi*, *Câu hỏi thường
  gặp*, *Gặp nhân viên*; khách gõ tay thì bắt từ khoá (dịp, ngân sách "500k / 1tr5 / 2 củ", hoàn
  tiền, huỷ đơn…). Mọi con số lấy qua API thật, không gõ cứng.
- **Claude API** (`ai/FloristAssistant`) — chỉ khi có `ANTHROPIC_API_KEY`: câu gõ tay đi qua AI để
  hiểu câu hỏi tự do tốt hơn; nút bấm vẫn do bot xử lý.

Trợ lý AI (khi bật) tìm bó hoa
theo dịp và ngân sách, báo giờ chốt đơn, vùng giao, tình trạng đơn của chính khách — bằng dữ liệu
thật lấy qua API của `product-service` và `order-service`. Khách bấm **Gặp nhân viên**, hoặc AI
gặp câu không chắc (khiếu nại, hoàn tiền, sửa đơn…), thì cuộc chat vào **Hộp thư chat** của trang
quản trị để nhân viên trả lời.

## Chạy

```bat
set ANTHROPIC_API_KEY=<khoá của bạn>
cd chat-service
.\mvnw.cmd spring-boot:run
```

Không đặt `ANTHROPIC_API_KEY` thì service vẫn chạy đầy đủ với bot kịch bản — không tốn phí.
Chạy bằng Docker thì ghi khoá vào `.env` cạnh `docker-compose.yml` (xem `.env.example`).
**Không commit khoá.**

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `ANTHROPIC_API_KEY` | (trống) | Trống = tắt trợ lý AI |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Rẻ hơn: `claude-sonnet-5-5`, `claude-haiku-4-5` |
| `ANTHROPIC_EFFORT` | `low` | Tăng `medium` nếu tư vấn chưa đủ kỹ (bị bỏ qua với Haiku 4.5) |
| `CHAT_AI_MAX_REPLIES` | `30` | Quá số câu này trong một cuộc chat thì chuyển nhân viên (chặn chi phí khi bị spam) |
| `PRODUCT_SERVICE_URL` / `ORDER_SERVICE_URL` | `http://localhost:8082` / `:8083` | |

## Vì sao làm thế này

- **AI chỉ có công cụ đọc.** Không có công cụ đặt hàng, sửa đơn, áp mã giảm giá — những việc đó vẫn
  đi qua giao diện và nghiệp vụ có sẵn. Không mở thêm cửa nào cho việc "nói khéo" với AI.
- **Đơn hàng của khách lấy bằng chính JWT của khách** (chuyển tiếp sang `GET /orders/my`). AI không
  thể đọc đơn của người khác vì chat-service không tự đặt `userId`.
- **Soạn trả lời ở luồng riêng** (`AiReplyWorker`): gọi Claude kèm công cụ mất vài giây, request
  gửi tin trả về ngay; giao diện hỏi định kỳ `GET /api/chat/me?afterId=…` (2,5 giây khi đang mở).
  Không cần WebSocket, đi qua Gateway như mọi API khác.
- **Claude API lỗi / từ chối trả lời / cần quá nhiều bước** → tự chuyển nhân viên kèm tin hệ thống,
  không để khách chờ vô hạn.
- **Link trong tin nhắn:** giao diện chỉ biến link nội bộ `[tên](/products/5)` thành link bấm được;
  link ra ngoài hiện nguyên văn.

## Kiểm thử

```bat
.\mvnw.cmd test
```

`AssistantToolsLiveTests` chạy các công cụ của AI với dữ liệu thật qua Gateway, không cần khoá
Claude — chỉ chạy khi đặt `BLOOM_GATEWAY_URL` và hệ thống đang chạy:

```bat
set BLOOM_GATEWAY_URL=http://localhost:8080
.\mvnw.cmd test -Dtest=AssistantToolsLiveTests
```
