package dh13c6.nguyentiendat516.bloom.productservice.entity;

/**
 * Dip tang hoa. Mot san pham co the hop nhieu dip (vi du vua sinh nhat vua tinh yeu).
 * Luu bang ten hang (EnumType.STRING) nen doi thu tu khai bao khong lam hong du lieu cu.
 */
public enum Occasion {
    BIRTHDAY("Sinh nhật"),
    LOVE("Tình yêu"),
    OPENING("Khai trương"),
    WEDDING("Cưới hỏi"),
    SYMPATHY("Chia buồn"),
    THANKS("Cảm ơn"),
    CONGRATS("Chúc mừng");

    private final String label;

    Occasion(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
