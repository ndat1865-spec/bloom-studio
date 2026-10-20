package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/**
 * Cach khach tra tien cho don.
 *
 * COD do order-service tu quan ly. Ba cong con lai do payment-service xu ly; order-service
 * chi nhan ket qua "da thanh toan" qua API noi bo /internal/orders/{id}/paid.
 */
public enum PaymentMethod {
    COD("Thanh toán khi nhận hàng"),
    VNPAY("VNPay"),
    MOMO("Ví MoMo"),
    ZALOPAY("ZaloPay");

    private final String label;

    PaymentMethod(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public boolean isOnline() {
        return this != COD;
    }
}
