package dh13c6.nguyentiendat516.bloom.chatservice.dto;

import dh13c6.nguyentiendat516.bloom.chatservice.bot.BotPayload;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.Conversation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** DTO cua chat-service. */
public final class ChatDtos {

    private ChatDtos() {
    }

    /**
     * Tin nhan client gui len. KHONG co nguoi gui - lay tu JWT.
     * action: ma lenh cua nut tra loi nhanh khach vua bam (vd. "occ:BIRTHDAY"); go tay thi bo trong.
     */
    public record SendMessageRequest(
            @NotBlank(message = "Tin nhắn trống")
            @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự")
            String content,

            @Size(max = 80, message = "Lệnh không hợp lệ")
            @Pattern(regexp = "^[a-z]+(:[A-Za-z0-9_-]*)*$", message = "Lệnh không hợp lệ")
            String action
    ) {
    }

    public record MessageResponse(Long id, String senderType, String senderName, String content, Instant createdAt,
                                  List<BotPayload.QuickReply> quickReplies, List<BotPayload.ProductCard> cards) {
        public static MessageResponse from(ChatMessage m) {
            BotPayload payload = BotPayload.fromJson(m.getPayload());
            return new MessageResponse(m.getId(), m.getSenderType().name(), m.getSenderName(), m.getContent(),
                    m.getCreatedAt(),
                    payload == null || payload.quickReplies() == null ? List.of() : payload.quickReplies(),
                    payload == null || payload.cards() == null ? List.of() : payload.cards());
        }
    }

    public record ConversationResponse(
            Long id,
            Long userId,
            String username,
            String status,
            String statusLabel,
            String assignedStaff,
            Instant createdAt,
            Instant lastMessageAt,
            String lastMessagePreview,
            int unreadForStaff,
            int unreadForCustomer,
            boolean aiPending
    ) {
        public static ConversationResponse from(Conversation c) {
            return new ConversationResponse(c.getId(), c.getUserId(), c.getUsername(), c.getStatus().name(),
                    c.getStatus().getLabel(), c.getAssignedStaff(), c.getCreatedAt(), c.getLastMessageAt(),
                    c.getLastMessagePreview(), c.getUnreadForStaff(), c.getUnreadForCustomer(), c.isAiPending());
        }
    }

    /**
     * Mot lan hoi cua client: trang thai cuoc chat + cac tin moi.
     * conversation null = khach chua tung chat. aiEnabled: da cau hinh Claude API chua.
     */
    public record ChatSnapshot(ConversationResponse conversation, List<MessageResponse> messages, boolean aiEnabled) {
    }

    /** So cuoc chat theo trang thai - cho tab loc o hop thu cua nhan vien. */
    public record InboxSummary(long ai, long waitingStaff, long withStaff, long closed) {
    }
}
