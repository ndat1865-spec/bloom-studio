package dh13c6.nguyentiendat516.bloom.chatservice.ai;

import com.anthropic.models.messages.MessageParam;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.SenderType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Doi lich su chat sang tin nhan Claude API: Claude bat buoc tin dau la cua user, va khong
 * duoc thay tin he thong noi bo.
 */
class FloristAssistantTests {

    private static ChatMessage msg(SenderType type, String name, String content) {
        return new ChatMessage(1L, type, name, content);
    }

    @Test
    void dropsSystemAndLeadingAssistantMessages() {
        List<MessageParam> params = FloristAssistant.toParams(List.of(
                msg(SenderType.SYSTEM, null, "Trợ lý AI tiếp tục hỗ trợ bạn"),
                msg(SenderType.AI, "Trợ lý AI", "Chào bạn"),
                msg(SenderType.CUSTOMER, "john", "Mai sinh nhật mẹ, tầm 500k"),
                msg(SenderType.AI, "Trợ lý AI", "Mình gợi ý..."),
                msg(SenderType.STAFF, "staff", "Studio còn bó hồng kem"),
                msg(SenderType.CUSTOMER, "john", "Lấy bó đó")));

        assertEquals(4, params.size());
        assertEquals(MessageParam.Role.USER, params.get(0).role());
        assertEquals(MessageParam.Role.ASSISTANT, params.get(1).role());
        assertEquals(MessageParam.Role.ASSISTANT, params.get(2).role());
        assertEquals(MessageParam.Role.USER, params.get(3).role());
        assertTrue(params.get(2).content().string().orElseThrow().startsWith("[Nhân viên staff] "));
    }

    @Test
    void emptyWhenNoCustomerMessage() {
        assertTrue(FloristAssistant.toParams(List.of(msg(SenderType.SYSTEM, null, "x"),
                msg(SenderType.STAFF, "staff", "y"))).isEmpty());
    }

    @Test
    void systemPromptHasNoVolatileContent() {
        // Prompt caching: phan dau request phai giong het giua cac lan goi - khong chen ngay gio
        assertTrue(!FloristAssistant.SYSTEM_PROMPT.matches("(?s).*\\d{4}-\\d{2}-\\d{2}.*"));
    }
}
