package dh13c6.nguyentiendat516.bloom.paymentservice.entity;

/** Cac cong thanh toan truc tuyen. COD khong nam o day vi khong di qua service nay. */
public enum PaymentProvider {
    VNPAY("VNPay", "Thẻ ATM nội địa, thẻ quốc tế, QR ngân hàng"),
    MOMO("Ví MoMo", "Ví MoMo, thẻ ATM, thẻ quốc tế"),
    ZALOPAY("ZaloPay", "Ví ZaloPay, thẻ ATM, QR");

    private final String label;
    private final String description;

    PaymentProvider(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
