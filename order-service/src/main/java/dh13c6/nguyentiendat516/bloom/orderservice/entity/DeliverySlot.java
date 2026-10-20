package dh13c6.nguyentiendat516.bloom.orderservice.entity;

/**
 * Khung gio giao hoa. Hoa tang thuong can den dung luc (sang sinh nhat, gio khai truong),
 * nen khach chon khung gio ngoai ngay giao.
 */
public enum DeliverySlot {
    MORNING("Sáng 8:00 – 12:00", 8, 12),
    AFTERNOON("Chiều 12:00 – 17:00", 12, 17),
    EVENING("Tối 17:00 – 21:00", 17, 21);

    private final String label;
    private final int startHour;
    private final int endHour;

    DeliverySlot(String label, int startHour, int endHour) {
        this.label = label;
        this.startHour = startHour;
        this.endHour = endHour;
    }

    public String getLabel() {
        return label;
    }

    public int getStartHour() {
        return startHour;
    }

    public int getEndHour() {
        return endHour;
    }

    /** Buoi chua khung 1 tieng bat dau luc startOfHour (8 -> Sang, 13 -> Chieu, 19 -> Toi). */
    public static DeliverySlot ofHour(int startOfHour) {
        for (DeliverySlot slot : values()) {
            if (startOfHour >= slot.startHour && startOfHour < slot.endHour) {
                return slot;
            }
        }
        throw new IllegalArgumentException("Ngoài giờ giao: " + startOfHour);
    }

    /** Gio bat dau som nhat / muon nhat cua khung 1 tieng (8 va 20 -> 20:00 - 21:00). */
    public static int firstHour() {
        return MORNING.startHour;
    }

    public static int lastHour() {
        return EVENING.endHour - 1;
    }

    /** "10:00 – 11:00". */
    public static String hourLabel(int startOfHour) {
        return String.format("%d:00 – %d:00", startOfHour, startOfHour + 1);
    }
}
