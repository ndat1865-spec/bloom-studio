package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/**
 * Vong doi yeu cau dat hoa theo y khach:
 * NEW -> QUOTED (studio bao gia) -> ORDERED (khach dong y, da thanh don hang).
 * NEW / QUOTED co the -> REJECTED (studio tu choi) hoac CANCELLED (khach huy).
 * Don hang tu yeu cau bi huy thi yeu cau quay ve QUOTED de khach dat lai.
 */
public enum CustomRequestStatus {
    NEW("Chờ báo giá"),
    QUOTED("Đã báo giá"),
    ORDERED("Đã đặt hàng"),
    REJECTED("Studio từ chối"),
    CANCELLED("Đã huỷ");

    private final String label;

    CustomRequestStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
