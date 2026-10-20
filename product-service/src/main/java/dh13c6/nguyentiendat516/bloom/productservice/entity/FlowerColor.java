package dh13c6.nguyentiendat516.bloom.productservice.entity;

/** Tong mau chu dao cua bo hoa - dung cho bo loc theo mau o trang cua hang. */
public enum FlowerColor {
    RED("Đỏ"),
    PINK("Hồng"),
    WHITE("Trắng"),
    YELLOW("Vàng / cam"),
    PURPLE("Tím"),
    GREEN("Xanh lá"),
    MIXED("Nhiều màu");

    private final String label;

    FlowerColor(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
