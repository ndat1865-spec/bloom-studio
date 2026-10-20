package dh13c6.nguyentiendat516.bloom.notificationservice.dto;

import dh13c6.nguyentiendat516.bloom.notificationservice.entity.Notification;

import java.time.Instant;

public record NotificationResponse(Long id, String eventType, Long orderId, String orderCode, String audience,
                                   String recipient, String subject, String status, String detail,
                                   Instant createdAt) {

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getEventType(), n.getOrderId(), n.getOrderCode(),
                n.getAudience().name(), n.getRecipient(), n.getSubject(), n.getStatus().name(), n.getDetail(),
                n.getCreatedAt());
    }
}
