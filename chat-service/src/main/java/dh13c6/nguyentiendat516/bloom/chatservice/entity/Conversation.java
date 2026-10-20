package dh13c6.nguyentiendat516.bloom.chatservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Mot cuoc chat cua mot khach. Moi khach toi da mot cuoc chat chua dong; dong roi thi tin
 * nhan tiep theo mo cuoc moi.
 *
 * Chi luu userId + username lay tu JWT - khong doc bang users cua auth-service.
 */
@Entity
@Table(name = "conversations", indexes = {
        @Index(name = "idx_conversation_user", columnList = "user_id"),
        @Index(name = "idx_conversation_status", columnList = "status")
})
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "username", length = 50)
    private String username;

    /** VARCHAR chu khong de Hibernate tao ENUM cua MySQL (them trang thai khong phai sua CSDL). */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "varchar(20) not null")
    private ConversationStatus status = ConversationStatus.AI;

    /** Nhan vien dang phu trach (username), null khi AI dang tra loi. */
    @Column(name = "assigned_staff", length = 50)
    private String assignedStaff;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt = Instant.now();

    @Column(name = "last_message_preview", length = 200)
    private String lastMessagePreview;

    @Column(name = "unread_for_staff", nullable = false)
    private int unreadForStaff;

    @Column(name = "unread_for_customer", nullable = false)
    private int unreadForCustomer;

    /** AI dang soan tra loi - giao dien hien dong "dang soan". */
    @Column(name = "ai_pending", nullable = false)
    private boolean aiPending;

    /** So cau AI da tra loi trong cuoc chat - chan chi phi Claude API khi bi spam. */
    @Column(name = "ai_reply_count", nullable = false)
    private int aiReplyCount;

    @Column(name = "closed_at")
    private Instant closedAt;

    public Conversation() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public ConversationStatus getStatus() {
        return status;
    }

    public void setStatus(ConversationStatus status) {
        this.status = status;
    }

    public String getAssignedStaff() {
        return assignedStaff;
    }

    public void setAssignedStaff(String assignedStaff) {
        this.assignedStaff = assignedStaff;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public int getUnreadForStaff() {
        return unreadForStaff;
    }

    public void setUnreadForStaff(int unreadForStaff) {
        this.unreadForStaff = unreadForStaff;
    }

    public int getUnreadForCustomer() {
        return unreadForCustomer;
    }

    public void setUnreadForCustomer(int unreadForCustomer) {
        this.unreadForCustomer = unreadForCustomer;
    }

    public boolean isAiPending() {
        return aiPending;
    }

    public void setAiPending(boolean aiPending) {
        this.aiPending = aiPending;
    }

    public int getAiReplyCount() {
        return aiReplyCount;
    }

    public void setAiReplyCount(int aiReplyCount) {
        this.aiReplyCount = aiReplyCount;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }
}
