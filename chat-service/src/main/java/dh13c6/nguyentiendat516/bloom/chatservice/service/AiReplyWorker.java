package dh13c6.nguyentiendat516.bloom.chatservice.service;

import dh13c6.nguyentiendat516.bloom.chatservice.ai.AssistantTools;
import dh13c6.nguyentiendat516.bloom.chatservice.ai.FloristAssistant;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.Conversation;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ConversationStatus;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.SenderType;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Soan cau tra loi cua AI o LUONG RIENG.
 *
 * Goi Claude (co cong cu) mat vai giay toi vai chuc giay - khong giu request cua khach cho
 * ngan ay. Khach gui tin -> luu -> tra ve ngay; worker soan xong thi luu tin AI, giao dien hoi
 * dinh ky se thay.
 *
 * Moi cuoc chat chi mot luong AI tai mot thoi diem. Khach nhan them trong luc AI dang soan thi
 * danh dau "con viec" - xong cau truoc, worker doc lai lich su (co ca tin moi) va tra loi tiep.
 */
@Component
public class AiReplyWorker {

    private static final Logger log = LoggerFactory.getLogger(AiReplyWorker.class);

    static final String AI_NAME = "Trợ lý AI";

    private final FloristAssistant assistant;
    private final ConversationStore store;
    private final int maxReplies;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<Long, AssistantTools.Context> pending = new ConcurrentHashMap<>();

    public AiReplyWorker(FloristAssistant assistant, ConversationStore store,
                         @Value("${chat.ai-max-replies:30}") int maxReplies) {
        this.assistant = assistant;
        this.store = store;
        this.maxReplies = maxReplies;
    }

    /** Xin AI tra loi cuoc chat. ctx mang JWT cua khach de AI xem don cua chinh ho. */
    public void trigger(Long conversationId, AssistantTools.Context ctx) {
        pending.put(conversationId, ctx);
        if (running.add(conversationId)) {
            executor.execute(() -> drain(conversationId));
        }
    }

    private void drain(Long id) {
        try {
            AssistantTools.Context ctx;
            while ((ctx = pending.remove(id)) != null) {
                replyOnce(id, ctx);
            }
        } finally {
            running.remove(id);
            // Tin moi den dung luc vua thoat vong lap
            if (pending.containsKey(id) && running.add(id)) {
                executor.execute(() -> drain(id));
            }
        }
    }

    private void replyOnce(Long id, AssistantTools.Context ctx) {
        Conversation c = store.get(id);
        if (c.getStatus() != ConversationStatus.AI) {
            return;
        }
        store.update(id, conv -> conv.setAiPending(true));
        try {
            if (c.getAiReplyCount() >= maxReplies) {
                toStaff(id, "Cuộc trò chuyện đã khá dài, mình chuyển cho nhân viên để hỗ trợ bạn tiếp nhé.");
                return;
            }
            List<ChatMessage> history = store.recent(id, FloristAssistant.HISTORY_LIMIT);
            if (history.isEmpty() || history.get(history.size() - 1).getSenderType() != SenderType.CUSTOMER) {
                return;
            }

            FloristAssistant.Reply reply = assistant.reply(history, ctx);

            // Trong luc AI soan, nhan vien co the da nhan cuoc chat - bo cau tra loi cua AI
            if (store.get(id).getStatus() != ConversationStatus.AI) {
                return;
            }
            if (reply.text() != null && !reply.text().isBlank()) {
                store.append(id, SenderType.AI, AI_NAME, reply.text());
            }
            if (reply.handoff()) {
                log.info("AI chuyển cuộc chat {} cho nhân viên: {}", id, reply.handoffReason());
                toStaff(id, reply.text() == null || reply.text().isBlank()
                        ? "Mình đã chuyển câu hỏi cho nhân viên, bạn chờ chút nhé."
                        : null);
            }
        } catch (RuntimeException e) {
            // Claude API loi / het han muc / mat mang: khong de khach cho vo han
            log.error("Trợ lý AI lỗi ở cuộc chat {}: {}", id, e.toString());
            toStaff(id, "Trợ lý AI đang gặp sự cố, mình đã chuyển cho nhân viên trả lời bạn.");
        } finally {
            store.update(id, conv -> conv.setAiPending(false));
        }
    }

    /** Chuyen cuoc chat sang hang cho nhan vien, kem tin he thong (neu co). */
    private void toStaff(Long id, String systemMessage) {
        store.update(id, conv -> {
            if (conv.getStatus() == ConversationStatus.AI) {
                conv.setStatus(ConversationStatus.WAITING_STAFF);
                // Nhan vien can doc tu dau cuoc chat: danh dau co tin chua doc
                conv.setUnreadForStaff(Math.max(1, conv.getUnreadForStaff()));
            }
        });
        if (systemMessage != null) {
            store.append(id, SenderType.SYSTEM, null, systemMessage);
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
