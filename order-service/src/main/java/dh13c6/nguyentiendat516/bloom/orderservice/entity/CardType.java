package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/** Loai thiep kem hoa. Loi chuc in len thiep nam o Order.cardMessage. */
public enum CardType {
    NONE("Không kèm thiệp", 0.0),
    STANDARD("Thiệp giấy kraft", 0.0),
    PREMIUM("Thiệp in nhũ vàng", 35_000);

    private final String label;
    private final double price;

    CardType(String label, double price) {
        this.label = label;
        this.price = price;
    }

    public String getLabel() {
        return label;
    }

    public double getPrice() {
        return price;
    }
}
