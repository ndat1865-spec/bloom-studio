package dh13c6.nguyentiendat516.bloom.productservice.entity;

/**
 * Co bo hoa. Tiem hoa ban MOT mau bo o nhieu co: cung cach phoi, khac so bong va gia.
 *
 * Gia va so bong cua tung co TINH tu gia / so bong cua co Tieu chuan (Product.price,
 * Product.stemCount) theo he so, lam tron gia toi 10.000d - ADMIN chi nhap mot gia,
 * khong phai giu ba gia cho khop nhau. order-service lay gia tung co tu day
 * (ProductResponse.sizes), khong tu tinh.
 */
public enum BouquetSize {
    SMALL("Nhỏ", 0.7, 0.75),
    STANDARD("Tiêu chuẩn", 1.0, 1.0),
    LARGE("Lớn", 1.5, 1.4);

    private final String label;
    private final double stemFactor;
    private final double priceFactor;

    BouquetSize(String label, double stemFactor, double priceFactor) {
        this.label = label;
        this.stemFactor = stemFactor;
        this.priceFactor = priceFactor;
    }

    public String getLabel() {
        return label;
    }

    public double getPriceFactor() {
        return priceFactor;
    }

    /** Co re nhat - gia "Tu ..." hien tren the san pham co nhieu co. */
    public static BouquetSize cheapest() {
        BouquetSize best = STANDARD;
        for (BouquetSize s : values()) {
            if (s.priceFactor < best.priceFactor) {
                best = s;
            }
        }
        return best;
    }

    /** Gia cua co nay, lam tron toi 10.000d. Co Tieu chuan giu nguyen gia goc. */
    public double priceOf(Double basePrice) {
        double base = basePrice == null ? 0.0 : basePrice;
        if (this == STANDARD) {
            return base;
        }
        return Math.round(base * priceFactor / 10_000.0) * 10_000.0;
    }

    /** So bong cua co nay; null khi san pham khong ghi so bong. */
    public Integer stemsOf(Integer baseStems) {
        if (baseStems == null) {
            return null;
        }
        return Math.max(1, (int) Math.round(baseStems * stemFactor));
    }
}
