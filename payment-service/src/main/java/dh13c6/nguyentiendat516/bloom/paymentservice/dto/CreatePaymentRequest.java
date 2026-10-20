package dh13c6.nguyentiendat516.bloom.paymentservice.dto;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import jakarta.validation.constraints.NotNull;

/**
 * Body cua POST /api/payments. CHI co ma don va cong muon dung.
 *
 * Khong co amount: so tien lay tu order-service. De amount o day thi khach sua mot so
 * trong body la tra 1.000d cho don 1.000.000d.
 */
public record CreatePaymentRequest(
        @NotNull(message = "Thiếu mã đơn hàng")
        Long orderId,

        @NotNull(message = "Chọn cổng thanh toán")
        PaymentProvider provider
) {
}
