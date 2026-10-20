package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.CardType;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.DeliverySlot;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderAddon;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentMethod;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.shipping.ShippingService;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Don hang tra ve cho client. Khong lo thong tin tai khoan ngoai username.
 *
 * Kem san nhan tieng Viet (cardTypeLabel, timeSlotLabel) de trang don hang hien ngay,
 * khong phai tai them danh sach tuy chon chi de dich ma.
 */
public record OrderResponse(
        Long id,
        String code,
        String customerName,
        String phone,
        String address,
        String note,
        LocalDate deliveryDate,
        Double subtotal,
        Double deliveryFee,
        Double total,
        String status,
        String statusLabel,
        Instant createdAt,
        String username,
        List<OrderItemResponse> items,
        // ---------- qua tang ----------
        String senderName,
        String senderPhone,
        boolean anonymousSender,
        String cardType,
        String cardTypeLabel,
        String cardMessage,
        String timeSlot,
        String timeSlotLabel,
        /** Khung giao 1 tieng: gio bat dau + nhan "10:00 – 11:00"; null = ca buoi / ca ngay. */
        Integer deliveryHour,
        String deliveryTimeLabel,
        List<AddonResponse> addons,
        // ---------- tien ----------
        double extrasTotal,
        double discount,
        String voucherCode,
        // ---------- thanh toan ----------
        String paymentMethod,
        String paymentMethodLabel,
        String paymentStatus,
        String paymentStatusLabel,
        Instant paidAt,
        // ---------- giao hang GHN ----------
        Integer provinceId,
        Integer districtId,
        String wardCode,
        String ghnOrderCode,
        String shippingStatus,
        String shippingStatusLabel,
        Instant expectedDeliveryAt,
        Instant shippingUpdatedAt,
        Double ghnFee,
        Long codAmount,
        Integer shippingWeight,
        List<ShippingEventResponse> shippingEvents,
        // ---------- moc thoi gian cua tung trang thai (don cu co the null) ----------
        Instant confirmedAt,
        Instant preparingAt,
        Instant shippingAt,
        Instant deliveredAt,
        Instant cancelledAt,
        // ---------- anh bo hoa thanh pham ----------
        String arrangementPhotoUrl,
        Instant arrangementPhotoAt
) {
    /** Mot moc trong hanh trinh van don GHN, kem nhan tieng Viet. */
    public record ShippingEventResponse(String status, String label, Instant at) {
    }

    public record AddonResponse(String code, String name, Double unitPrice, Integer quantity, Double lineTotal) {
        static AddonResponse from(OrderAddon a) {
            return new AddonResponse(a.getCode().name(), a.getName(), a.getUnitPrice(), a.getQuantity(),
                    a.getLineTotal());
        }
    }

    public static OrderResponse from(Order order) {
        CardType card = order.getCardType() == null ? CardType.NONE : order.getCardType();
        PaymentMethod method = order.effectivePaymentMethod();
        PaymentStatus paid = order.effectivePaymentStatus();
        return new OrderResponse(
                order.getId(),
                order.getCode(),
                order.getCustomerName(),
                order.getPhone(),
                order.getAddress(),
                order.getNote(),
                order.getDeliveryDate(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getTotal(),
                order.getStatus().name(),
                order.getStatus().getLabel(),
                order.getCreatedAt(),
                order.getUsername(),
                order.getItems().stream().map(OrderItemResponse::from).toList(),
                order.getSenderName(),
                order.getSenderPhone(),
                order.isAnonymousSender(),
                card.name(),
                card.getLabel(),
                order.getCardMessage(),
                order.getTimeSlot() == null ? null : order.getTimeSlot().name(),
                order.getTimeSlot() == null ? null : order.getTimeSlot().getLabel(),
                order.getDeliveryHour(),
                order.getDeliveryHour() == null ? null : DeliverySlot.hourLabel(order.getDeliveryHour()),
                order.getAddons().stream().map(AddonResponse::from).toList(),
                // Don cu truoc khi co tinh nang: cot null -> 0
                order.getExtrasTotal() == null ? 0.0 : order.getExtrasTotal(),
                order.getDiscount() == null ? 0.0 : order.getDiscount(),
                order.getVoucherCode(),
                method.name(),
                method.getLabel(),
                paid.name(),
                paid.getLabel(),
                order.getPaidAt(),
                order.getToProvinceId(),
                order.getToDistrictId(),
                order.getToWardCode(),
                order.getGhnOrderCode(),
                order.getShippingStatus(),
                ShippingService.label(order.getShippingStatus()),
                order.getExpectedDeliveryAt(),
                order.getShippingUpdatedAt(),
                order.getGhnFee(),
                order.getCodAmount(),
                order.getShippingWeight(),
                ShippingService.decodeLog(order.getShippingLog()).stream()
                        .map(e -> new ShippingEventResponse(e.status(), ShippingService.label(e.status()), e.at()))
                        .toList(),
                order.getConfirmedAt(),
                order.getPreparingAt(),
                order.getShippingAt(),
                order.getDeliveredAt(),
                order.getCancelledAt(),
                order.getArrangementPhotoUrl(),
                order.getArrangementPhotoAt());
    }
}
