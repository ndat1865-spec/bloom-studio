package dh13c6.nguyentiendat516.bloom.orderservice.resilience;

import java.io.IOException;

/** Mach dang mo: tu choi ngay, khong goi ra may dich. */
public class CircuitOpenException extends IOException {

    private final String target;

    public CircuitOpenException(String target, long retryAfterSeconds) {
        super("Tạm ngưng gọi " + target + " vì lỗi liên tục, thử lại sau khoảng " + retryAfterSeconds + " giây");
        this.target = target;
    }

    public String getTarget() {
        return target;
    }

    /**
     * Thong bao cho nguoi dung: neu loi goi hong vi mach dang mo thi noi ro dieu do, con
     * khong thi dung thong bao "khong ket noi duoc" san co cua client.
     */
    public static String messageOr(Throwable error, String fallback) {
        return error != null && error.getCause() instanceof CircuitOpenException open ? open.getMessage() : fallback;
    }
}
