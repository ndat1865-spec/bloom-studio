package dh13c6.nguyentiendat516.bloom.paymentservice.dto;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentStatus;

import java.time.Instant;

/** Mot giao dich tra ve cho client. payUrl chi co khi giao dich con cho thanh toan. */
public record PaymentResponse(
        Long id,
        Long orderId,
        String orderCode,
        String provider,
        String providerLabel,
        Long amount,
        String status,
        String txnRef,
        String providerTxnId,
        String message,
        String payUrl,
        boolean refundRequired,
        Instant createdAt,
        Instant paidAt,
        String refundTxnId,
        Instant refundedAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(p.getId(), p.getOrderId(), p.getOrderCode(), p.getProvider().name(),
                p.getProvider().getLabel(), p.getAmount(), p.getStatus().name(), p.getTxnRef(),
                p.getProviderTxnId(), p.getMessage(),
                p.getStatus() == PaymentStatus.PENDING ? p.getPayUrl() : null,
                p.isRefundRequired(), p.getCreatedAt(), p.getPaidAt(), p.getRefundTxnId(), p.getRefundedAt());
    }
}
