package dh13c6.nguyentiendat516.bloom.chatservice.service;

import dh13c6.nguyentiendat516.bloom.chatservice.ai.AssistantTools;
import dh13c6.nguyentiendat516.bloom.chatservice.ai.FloristAssistant;
import dh13c6.nguyentiendat516.bloom.chatservice.bot.ScriptedBot;
import dh13c6.nguyentiendat516.bloom.chatservice.dto.ChatDtos;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.Conversation;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ConversationStatus;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.SenderType;
import dh13c6.nguyentiendat516.bloom.chatservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.chatservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.chatservice.repository.ConversationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

/**
 * Nghiep vu chat. Khach chi thay cuoc chat cua chinh minh (userId tu JWT); nhan vien thay
 * moi cuoc chat qua hop thu.
 */
@Service
public class ChatService {

    /** Lan dau mo khung chat: tai toi da ngan nay tin gan nhat. */
    private static final int FIRST_LOAD = 50;

    private final ConversationRepository conversations;
    private final ConversationStore store;
    private final AiReplyWorker worker;
    private final FloristAssistant assistant;
    private final ScriptedBot bot;

    public ChatService(ConversationRepository conversations, ConversationStore store, AiReplyWorker worker,
                       FloristAssistant assistant, ScriptedBot bot) {
        this.conversations = conversations;
        this.store = store;
        this.worker = worker;
        this.assistant = assistant;
        this.bot = bot;
    }

    // ===================== KHACH =====================

    /**
     * Cuoc chat moi nhat cua khach + tin moi sau afterId (null = tai lan dau).
     * Doc xong thi xoa bo dem chua doc cua khach.
     */
    public ChatDtos.ChatSnapshot mine(Long userId, Long afterId) {
        Conversation c = conversations.findFirstByUserIdOrderByIdDesc(userId).orElse(null);
        if (c == null) {
            return new ChatDtos.ChatSnapshot(null, List.of(), assistant.enabled());
        }
        List<ChatMessage> list = afterId == null ? store.recent(c.getId(), FIRST_LOAD) : store.after(c.getId(), afterId);
        if (c.getUnreadForCustomer() > 0) {
            c = store.update(c.getId(), conv -> conv.setUnreadForCustomer(0));
        }
        return snapshot(c, list);
    }

    /**
     * Khach gui tin (go tay, hoac bam nut tra loi nhanh - khi do action la ma lenh cua nut).
     * Chua co cuoc chat mo thi tao moi, bat dau voi tro ly tu dong.
     *
     * Khi tro ly tu dong dang phu trach:
     * - bam nut -> bot kich ban tra loi NGAY trong request nay (chi goi API noi bo, rat nhanh);
     * - go tay + co Claude API -> AI soan o luong rieng, cau tra loi den qua lan hoi tiep theo;
     * - go tay + khong co Claude API -> bot bat tu khoa, tra loi ngay.
     * Nhan vien dang phu trach thi chi luu tin, bot khong chen vao.
     */
    public ChatDtos.ChatSnapshot send(Long userId, String username, String bearerToken, String content, String action) {
        String text = content.trim();
        if (text.isEmpty()) {
            throw new BadRequestException("Tin nhắn trống");
        }
        Conversation c = conversations.findFirstByUserIdAndStatusNotOrderByIdDesc(userId, ConversationStatus.CLOSED)
                .orElse(null);
        if (c == null) {
            c = store.create(userId, username, ConversationStatus.AI);
        }
        ChatMessage saved = store.append(c.getId(), SenderType.CUSTOMER, username, text);
        List<ChatMessage> out = new ArrayList<>(List.of(saved));

        if (c.getStatus() == ConversationStatus.AI) {
            if (action == null && assistant.enabled()) {
                // Bat co "dang soan" ngay de giao dien hien, khong doi toi luc worker chay
                store.update(c.getId(), conv -> conv.setAiPending(true));
                worker.trigger(c.getId(), new AssistantTools.Context(userId, username, bearerToken));
            } else {
                ScriptedBot.Reply reply = action != null
                        ? bot.handleAction(action, bearerToken)
                        : bot.handleText(text, bearerToken);
                out.add(store.append(c.getId(), SenderType.AI, ScriptedBot.NAME, reply.text(),
                        reply.payload() == null ? null : reply.payload().toJson()));
                if (reply.handoff()) {
                    toStaffQueue(c.getId());
                }
            }
        }
        return snapshot(store.get(c.getId()), out);
    }

    private void toStaffQueue(Long id) {
        store.update(id, conv -> {
            if (conv.getStatus() == ConversationStatus.AI) {
                conv.setStatus(ConversationStatus.WAITING_STAFF);
                conv.setUnreadForStaff(Math.max(1, conv.getUnreadForStaff()));
            }
        });
    }

    /** Khach bam "Gap nhan vien". */
    public ChatDtos.ChatSnapshot requestStaff(Long userId) {
        Conversation c = conversations.findFirstByUserIdAndStatusNotOrderByIdDesc(userId, ConversationStatus.CLOSED)
                .orElseThrow(() -> new ConflictException("Bạn chưa có cuộc trò chuyện nào đang mở"));
        if (c.getStatus() == ConversationStatus.AI) {
            store.update(c.getId(), conv -> {
                conv.setStatus(ConversationStatus.WAITING_STAFF);
                conv.setUnreadForStaff(Math.max(1, conv.getUnreadForStaff()));
            });
            store.append(c.getId(), SenderType.SYSTEM, null,
                    "Bạn đã yêu cầu gặp nhân viên. Nhân viên Bloom Studio sẽ trả lời ngay tại đây.");
        }
        return snapshot(store.get(c.getId()), List.of());
    }

    // ===================== NHAN VIEN =====================

    public Page<Conversation> inbox(ConversationStatus status, Pageable pageable) {
        EnumSet<ConversationStatus> statuses = status == null
                ? EnumSet.of(ConversationStatus.AI, ConversationStatus.WAITING_STAFF, ConversationStatus.WITH_STAFF)
                : EnumSet.of(status);
        return conversations.findByStatusInOrderByLastMessageAtDesc(statuses, pageable);
    }

    public ChatDtos.InboxSummary summary() {
        return new ChatDtos.InboxSummary(
                conversations.countByStatus(ConversationStatus.AI),
                conversations.countByStatus(ConversationStatus.WAITING_STAFF),
                conversations.countByStatus(ConversationStatus.WITH_STAFF),
                conversations.countByStatus(ConversationStatus.CLOSED));
    }

    /** Nhan vien mo cuoc chat: tin moi sau afterId, xoa bo dem chua doc cua nhan vien. */
    public ChatDtos.ChatSnapshot staffView(Long id, Long afterId) {
        Conversation c = store.get(id);
        List<ChatMessage> list = afterId == null ? store.recent(id, FIRST_LOAD) : store.after(id, afterId);
        if (c.getUnreadForStaff() > 0) {
            c = store.update(id, conv -> conv.setUnreadForStaff(0));
        }
        return snapshot(c, list);
    }

    /** Nhan vien tra loi: cuoc chat chuyen sang tay nhan vien, AI dung lai. */
    public ChatDtos.ChatSnapshot staffSend(Long id, String staff, String content) {
        String text = content.trim();
        if (text.isEmpty()) {
            throw new BadRequestException("Tin nhắn trống");
        }
        Conversation c = store.get(id);
        if (c.getStatus() == ConversationStatus.CLOSED) {
            throw new ConflictException("Cuộc chat đã kết thúc, khách nhắn lại sẽ mở cuộc mới");
        }
        store.update(id, conv -> {
            conv.setStatus(ConversationStatus.WITH_STAFF);
            conv.setAssignedStaff(staff);
            conv.setUnreadForStaff(0);
        });
        ChatMessage saved = store.append(id, SenderType.STAFF, staff, text);
        return snapshot(store.get(id), List.of(saved));
    }

    public ChatDtos.ChatSnapshot close(Long id, String staff) {
        Conversation c = store.get(id);
        if (c.getStatus() == ConversationStatus.CLOSED) {
            return snapshot(c, List.of());
        }
        store.update(id, conv -> {
            conv.setStatus(ConversationStatus.CLOSED);
            conv.setClosedAt(Instant.now());
            conv.setAiPending(false);
            conv.setUnreadForStaff(0);
        });
        store.append(id, SenderType.SYSTEM, null,
                "Cuộc trò chuyện đã kết thúc. Bạn nhắn tiếp sẽ bắt đầu cuộc trò chuyện mới.");
        return snapshot(store.get(id), List.of());
    }

    /** Tra cuoc chat ve cho tro ly tu dong (vd. nhan vien da giai quyet xong phan can nguoi). */
    public ChatDtos.ChatSnapshot returnToAi(Long id) {
        Conversation c = store.get(id);
        if (c.getStatus() == ConversationStatus.CLOSED) {
            throw new ConflictException("Cuộc chat đã kết thúc");
        }
        store.update(id, conv -> {
            conv.setStatus(ConversationStatus.AI);
            conv.setAssignedStaff(null);
            conv.setUnreadForStaff(0);
        });
        store.append(id, SenderType.SYSTEM, null,
                "Trợ lý tự động tiếp tục hỗ trợ bạn. Cần gặp nhân viên thì bấm nút phía trên.");
        return snapshot(store.get(id), List.of());
    }

    private ChatDtos.ChatSnapshot snapshot(Conversation c, List<ChatMessage> list) {
        return new ChatDtos.ChatSnapshot(ChatDtos.ConversationResponse.from(c),
                list.stream().map(ChatDtos.MessageResponse::from).toList(), assistant.enabled());
    }
}
