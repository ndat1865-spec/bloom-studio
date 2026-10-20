package dh13c6.nguyentiendat516.bloom.orderservice.events;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Su kien vong doi don hang gui len RabbitMQ (exchange "bloom.events").
 *
 * Chup lai du thong tin de ben nhan KHONG phai goi nguoc order-service: thu gui cho khach
 * can ma don, tong tien, danh sach hoa... deu co san trong su kien. Khong co email - email
 * la du lieu cua auth-service, notification-service tu hoi qua userId.
 *
 * eventId duy nhat: RabbitMQ co the giao mot tin hai lan (at-least-once), ben nhan dung
 * eventId de khong gui trung thu.
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
        /** Duong dan web anh bo hoa thanh pham ("order-media/..."), null khi chua co. */
        String photoUrl
) {

    /** Cac loai su kien. Routing key tuong ung: "order." + ten viet thuong (order.placed...). */
    public enum Type {
        /** ARRANGED: cua hang da tai anh bo hoa thanh pham. */
        PLACED, PAID, ARRANGED, SHIPPED, DELIVERED, CANCELLED, REFUNDED;

        public String routingKey() {
            return "order." + name().toLowerCase();
        }
    }

    public static OrderEvent of(Type type, Order o) {
        String items = o.getItems().stream()
                .map(i -> i.getProductName() + (i.getSizeLabel() == null ? "" : " (" + i.getSizeLabel() + ")")
                        + " × " + i.getQuantity())
                .collect(Collectors.joining(", "));
        return new OrderEvent(UUID.randomUUID().toString(), type.name(), Instant.now(), o.getId(), o.getCode(),
                o.getUserId(), o.getCustomerName(), o.getAddress(), items, o.getTotal(), o.getStatus().name(),
                o.effectivePaymentMethod().name(), o.effectivePaymentMethod().getLabel(),
                o.effectivePaymentStatus().getLabel(), o.getGhnOrderCode(), o.getExpectedDeliveryAt(),
                o.getArrangementPhotoUrl());
    }
}
