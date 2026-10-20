package dh13c6.nguyentiendat516.bloom.paymentservice.client;

/**
 * Nhung gi payment-service can biet ve mot don, lay tu GET /internal/orders/{id}
 * cua order-service. total la so tien THAT - khong bao gio lay so tien tu client.
 */
public record OrderSnapshot(
        Long id,
        String code,
        Long userId,
        Double total,
        String status,
        String paymentMethod,
        String paymentStatus
) {
}
