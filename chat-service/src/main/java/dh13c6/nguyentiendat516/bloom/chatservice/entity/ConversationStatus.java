package dh13c6.nguyentiendat516.bloom.chatservice.entity;

/**
 * Ai dang tra loi cuoc chat.
 * AI -> (khach bam "Gap nhan vien" / AI tu chuyen) WAITING_STAFF -> (nhan vien tra loi)
 * WITH_STAFF -> CLOSED. Nhan vien co the tra cuoc chat ve cho AI.
 */
public enum ConversationStatus {
    /** Tro ly tu dong dang tra loi: bot kich ban (luon co) + Claude API (khi co khoa). */
    AI("Trợ lý tự động"),
    WAITING_STAFF("Đang chờ nhân viên"),
    WITH_STAFF("Nhân viên đang hỗ trợ"),
    CLOSED("Đã kết thúc");

    private final String label;

    ConversationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
