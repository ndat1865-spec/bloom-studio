package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/**
 * Vong doi cua mot don hang (phan mo rong ngoai SOS01-SOS10).
 *
 * Thu tu khai bao la thu tu tien trinh: PENDING -> CONFIRMED -> PREPARING -> SHIPPING ->
 * DELIVERED. Don chi di toi, khong lui (xem OrderService.updateStatus). CANCELLED nam ngoai
 * tien trinh, di qua cancel() de hoan ton kho.
 */
public enum OrderStatus {
    PENDING("Chờ xác nhận"),
    CONFIRMED("Đã xác nhận"),
    /**
     * Tho dang cam / bo hoa, dong goi; da tao van don GHN thi dang cho shipper toi lay.
     * Cua hang tai anh bo hoa thanh pham len o buoc nay de khach duyet truoc khi giao.
     */
    PREPARING("Đang cắm hoa"),
    /** Hoa da roi cua hang: shipper GHN da lay hang, hoac cua hang tu giao. */
    SHIPPING("Đang giao"),
    DELIVERED("Đã giao"),
    CANCELLED("Đã huỷ");

    private final String label;

    OrderStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** Buoc trong tien trinh giao. CANCELLED khong co buoc. */
    public boolean isProgressStep() {
        return this != CANCELLED;
    }

    /** Da ket thuc: khong doi trang thai duoc nua. */
    public boolean isFinal() {
        return this == DELIVERED || this == CANCELLED;
    }
}
