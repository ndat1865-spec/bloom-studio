package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/**
 * Qua kem theo bo hoa.
 *
 * Gia khai o server, client chi gui MA qua + so luong - giong nguyen tac voi san pham:
 * khong bao gio tin gia client gui len. Danh sach ngan va it doi nen de o enum,
 * chua can mot bang + trang quan tri rieng.
 */
public enum GiftAddon {
    CHOCOLATE("Hộp socola thủ công", "Socola đen 70%, hộp 12 viên", 120_000),
    TEDDY("Gấu bông nhỏ", "Gấu bông lông mịn cao 25cm", 180_000),
    VASE("Bình thuỷ tinh", "Cắm hoa ngay khi nhận, không cần tìm bình", 150_000),
    BALLOON("Bóng bay chúc mừng", "Bóng bay tráng nhũ kèm dây ruy băng", 60_000);

    private final String label;
    private final String description;
    private final double price;

    GiftAddon(String label, String description, double price) {
        this.label = label;
        this.description = description;
        this.price = price;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    public double getPrice() {
        return price;
    }
}
