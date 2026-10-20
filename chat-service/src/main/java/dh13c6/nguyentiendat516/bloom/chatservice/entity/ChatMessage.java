package dh13c6.nguyentiendat516.bloom.chatservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/** Mot tin nhan trong cuoc chat. id tang dan -> client hoi "tin moi sau id X". */
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_message_conversation", columnList = "conversation_id, id")
})
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, columnDefinition = "varchar(20) not null")
    private SenderType senderType;

    /** Ten hien thi: username cua khach / nhan vien, ten tro ly AI; null voi SYSTEM. */
    @Column(name = "sender_name", length = 50)
    private String senderName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /** JSON nut tra loi nhanh + the bo hoa cua tin tu dong (xem BotPayload); tin thuong null. */
    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    public ChatMessage() {
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public ChatMessage(Long conversationId, SenderType senderType, String senderName, String content) {
        this.conversationId = conversationId;
        this.senderType = senderType;
        this.senderName = senderName;
        this.content = content;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public SenderType getSenderType() {
        return senderType;
    }

    public void setSenderType(SenderType senderType) {
        this.senderType = senderType;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
