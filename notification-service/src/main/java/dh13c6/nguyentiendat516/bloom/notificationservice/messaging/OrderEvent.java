package dh13c6.nguyentiendat516.bloom.notificationservice.messaging;

import java.time.Instant;

/**
 * Su kien don hang nhan tu RabbitMQ. Khai LAI o day chu khong dung chung thu vien voi
 * order-service - hai service chi thong nhat HOP DONG JSON, khong chia se ma nguon.
 * Truong la (order-service them sau nay) bi bo qua, khong lam hong viec doc.
 */
public record OrderEvent(
        String eventId,
        String type,
        Instant occurredAt,
        Long orderId,
        String orderCode,
        Long userId,
        String customerName,
        String address,
        String itemsSummary,
        Double total,
        String status,
        String paymentMethod,
        String paymentMethodLabel,
        String paymentStatusLabel,
        String ghnOrderCode,
        Instant expectedDeliveryAt,
        /** Duong dan web anh bo hoa thanh pham ("order-media/..."); su kien cu khong co. */
        String photoUrl
) {
}
