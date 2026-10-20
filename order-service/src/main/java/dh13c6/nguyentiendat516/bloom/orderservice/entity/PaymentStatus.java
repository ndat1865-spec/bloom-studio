package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/** Tinh trang tien cua don - tach rieng voi OrderStatus (tinh trang giao hang). */
public enum PaymentStatus {
    UNPAID("Chưa thanh toán"),
    PAID("Đã thanh toán"),
    /** Da tra tien truc tuyen roi don bi huy -> cua hang phai hoan tien. */
    REFUND_PENDING("Chờ hoàn tiền"),
    /** payment-service da hoan tien qua API cua cong thanh toan. */
    REFUNDED("Đã hoàn tiền");

    private final String label;

    PaymentStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
