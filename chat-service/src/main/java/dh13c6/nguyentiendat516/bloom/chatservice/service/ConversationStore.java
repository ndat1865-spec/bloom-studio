package dh13c6.nguyentiendat516.bloom.chatservice.service;

import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.Conversation;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ConversationStatus;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.SenderType;
import dh13c6.nguyentiendat516.bloom.chatservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.chatservice.repository.ChatMessageRepository;
import dh13c6.nguyentiendat516.bloom.chatservice.repository.ConversationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Moi thay doi tren mot cuoc chat di qua day, duoi KHOA RIENG cua cuoc chat do.
 *
 * Ly do: request cua khach, request cua nhan vien va luong AI chay nen cung sua mot dong
 * conversations (bo dem chua doc, trang thai, co "AI dang soan"). Doc - sua - ghi khong khoa
 * thi ben ghi sau de mat thay doi cua ben ghi truoc. Service chay mot ban nen khoa trong bo
 * nho la du; chay nhieu ban thi phai doi sang khoa CSDL (SELECT ... FOR UPDATE).
 */
@Component
public class ConversationStore {

    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final ConcurrentHashMap<Long, Object> locks = new ConcurrentHashMap<>();

    public ConversationStore(ConversationRepository conversations, ChatMessageRepository messages) {
        this.conversations = conversations;
        this.messages = messages;
    }

    public Conversation get(Long id) {
        return conversations.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc chat id = " + id));
    }

    public Conversation create(Long userId, String username, ConversationStatus status) {
        Conversation c = new Conversation();
        c.setUserId(userId);
        c.setUsername(username);
        c.setStatus(status);
        c.setCreatedAt(Instant.now());
        c.setLastMessageAt(Instant.now());
        return conversations.save(c);
    }

    /** Doc moi nhat, sua, luu - trong khoa cua cuoc chat. */
    public Conversation update(Long id, Consumer<Conversation> change) {
        synchronized (lockOf(id)) {
            Conversation c = get(id);
            change.accept(c);
            return conversations.save(c);
        }
    }

    /**
     * Them mot tin va cap nhat tom tat cuoc chat. Bo dem chua doc:
     * - tin cua khach tinh cho nhan vien khi cuoc chat dang o tay nhan vien (luc AI tra loi thi
     *   nhan vien khong can doc tung tin);
     * - tin cua AI / nhan vien / he thong tinh cho khach.
     */
    public ChatMessage append(Long id, SenderType type, String senderName, String content) {
        return append(id, type, senderName, content, null);
    }

    /** Nhu tren, kem nut tra loi nhanh / the bo hoa (tin cua tro ly tu dong). */
    public ChatMessage append(Long id, SenderType type, String senderName, String content, String payload) {
        synchronized (lockOf(id)) {
            ChatMessage message = new ChatMessage(id, type, senderName, content);
            message.setPayload(payload);
            ChatMessage saved = messages.save(message);
            Conversation c = get(id);
            c.setLastMessageAt(saved.getCreatedAt());
            c.setLastMessagePreview(preview(type, content));
            if (type == SenderType.CUSTOMER) {
                if (c.getStatus() == ConversationStatus.WAITING_STAFF || c.getStatus() == ConversationStatus.WITH_STAFF) {
                    c.setUnreadForStaff(c.getUnreadForStaff() + 1);
                }
            } else {
                c.setUnreadForCustomer(c.getUnreadForCustomer() + 1);
            }
            if (type == SenderType.AI) {
                c.setAiReplyCount(c.getAiReplyCount() + 1);
            }
            conversations.save(c);
            return saved;
        }
    }

    /** N tin gan nhat, cu nhat truoc. */
    public List<ChatMessage> recent(Long id, int limit) {
        List<ChatMessage> list = new ArrayList<>(messages.findByConversationIdOrderByIdDesc(id, PageRequest.of(0, limit)));
        Collections.reverse(list);
        return list;
    }

    public List<ChatMessage> after(Long id, Long afterId) {
        return messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(id, afterId);
    }

    private Object lockOf(Long id) {
        return locks.computeIfAbsent(id, k -> new Object());
    }

    private static String preview(SenderType type, String content) {
        String prefix = switch (type) {
            case AI -> "AI: ";
            case STAFF -> "Studio: ";
            case SYSTEM -> "· ";
            default -> "";
        };
        String text = (prefix + content).replaceAll("\\s+", " ").trim();
        return text.length() > 200 ? text.substring(0, 197) + "..." : text;
    }
}
