package dh13c6.nguyentiendat516.bloom.notificationservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Nhat ky mot thong bao da xu ly: gui cho ai, ve su kien nao, thanh cong hay khong.
 *
 * (event_id, audience) duy nhat: RabbitMQ giao tin it nhat mot lan, co the lap. Tin lap
 * gap rang buoc nay thi bo qua - khach khong nhan hai thu giong nhau.
 */
@Entity
@Table(name = "notifications",
        uniqueConstraints = @UniqueConstraint(name = "uk_notification_event_audience",
                columnNames = {"event_id", "audience"}),
        indexes = @Index(name = "idx_notification_order", columnList = "order_id"))
public class Notification {

    public enum Audience { CUSTOMER, SHOP }

    public enum Status {
        SENT,
        /** Gui loi (SMTP chet...). */
        FAILED,
        /** Khong can gui: khach chua co email, khach vang lai... */
        SKIPPED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 40)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 20)
    private String eventType;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "order_code", length = 32)
    private String orderCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "audience", nullable = false, length = 10)
    private Audience audience;

    @Column(name = "recipient", length = 150)
    private String recipient;

    @Column(name = "subject", length = 200)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private Status status;

    @Column(name = "detail", length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Notification() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public Audience getAudience() {
        return audience;
    }

    public void setAudience(Audience audience) {
        this.audience = audience;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
