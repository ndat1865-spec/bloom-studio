package dh13c6.nguyentiendat516.bloom.notificationservice.service;

import dh13c6.nguyentiendat516.bloom.notificationservice.messaging.OrderEvent;

import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Noi dung email theo tung loai su kien. HTML don gian, style viet thang trong the (trinh
 * doc email bo qua the style).
 */
final class EmailTemplates {

    record Email(String subject, String html) {
    }

    private static final NumberFormat VND = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    static {
        VND.setMaximumFractionDigits(0);
    }

    private EmailTemplates() {
    }

    /** Thu gui khach. null = loai su kien nay khong gui khach. */
    static Email forCustomer(OrderEvent e, String name, String storeUrl, String mediaBaseUrl) {
        String link = storeUrl + "/orders/" + e.orderId();
        return switch (e.type()) {
            case "PLACED" -> new Email("Bloom Studio đã nhận đơn " + e.orderCode(), wrap(name,
                    "Cảm ơn bạn đã đặt hoa. Studio đã nhận đơn <b>" + e.orderCode() + "</b>.",
                    summary(e) + ("COD".equals(e.paymentMethod()) ? "<p>Bạn thanh toán khi nhận hàng.</p>"
                            : "<p>Đơn sẽ được chuẩn bị ngay khi " + e.paymentMethodLabel() + " xác nhận thanh toán.</p>"),
                    link));
            case "PAID" -> new Email("Đã nhận thanh toán đơn " + e.orderCode(), wrap(name,
                    "Studio đã nhận " + money(e.total()) + " qua <b>" + e.paymentMethodLabel() + "</b> cho đơn <b>"
                            + e.orderCode() + "</b>.", "<p>Hoa sẽ được bó và giao theo lịch bạn chọn.</p>", link));
            case "ARRANGED" -> new Email("Bó hoa cho đơn " + e.orderCode() + " đã cắm xong", wrap(name,
                    "Thợ hoa đã cắm xong bó hoa cho đơn <b>" + e.orderCode() + "</b>. Đây là ảnh thật trước khi giao:",
                    photo(mediaBaseUrl, e.photoUrl())
                            + "<p>Nếu muốn chỉnh gì, bạn trả lời qua số điện thoại của studio trước giờ giao nhé.</p>",
                    link));
            case "SHIPPED" -> new Email("Đơn " + e.orderCode() + " đã giao cho Giao Hàng Nhanh", wrap(name,
                    "Đơn <b>" + e.orderCode() + "</b> đã được bàn giao cho Giao Hàng Nhanh.",
                    "<p>Mã vận đơn: <b>" + e.ghnOrderCode() + "</b>"
                            + (e.expectedDeliveryAt() == null ? "" : "<br>Dự kiến giao: " + DATE.format(e.expectedDeliveryAt()))
                            + "</p>", link));
            case "DELIVERED" -> new Email("Đơn " + e.orderCode() + " đã giao thành công", wrap(name,
                    "Đơn <b>" + e.orderCode() + "</b> đã được giao tới " + e.address() + ".",
                    "<p>Mong hoa làm bạn và người nhận vui. Bạn có thể đánh giá sản phẩm trên trang đơn hàng.</p>", link));
            case "CANCELLED" -> new Email("Đơn " + e.orderCode() + " đã huỷ", wrap(name,
                    "Đơn <b>" + e.orderCode() + "</b> đã được huỷ.",
                    "Chờ hoàn tiền".equals(e.paymentStatusLabel())
                            ? "<p>Bạn đã thanh toán " + money(e.total()) + " — studio sẽ hoàn lại qua "
                            + e.paymentMethodLabel() + ".</p>" : "", link));
            case "REFUNDED" -> new Email("Đã hoàn tiền đơn " + e.orderCode(), wrap(name,
                    "Studio đã hoàn " + money(e.total()) + " cho đơn <b>" + e.orderCode() + "</b> qua "
                            + e.paymentMethodLabel() + ".",
                    "<p>Tuỳ ngân hàng, tiền có thể mất vài ngày làm việc mới hiện trong tài khoản.</p>", link));
            default -> null;
        };
    }

    /** Thu gui hop thu cua hang - chi nhung viec cua hang can lam ngay. null = khong gui. */
    static Email forShop(OrderEvent e) {
        return switch (e.type()) {
            case "PLACED" -> new Email("[Đơn mới] " + e.orderCode() + " · " + money(e.total()),
                    shop("Đơn mới " + e.orderCode(), summary(e) + "<p>Thanh toán: " + e.paymentMethodLabel() + "</p>"));
            case "PAID" -> new Email("[Đã thanh toán] " + e.orderCode() + " · " + e.paymentMethodLabel(),
                    shop("Đơn " + e.orderCode() + " đã thanh toán", "<p>Có thể tạo vận đơn GHN.</p>"));
            case "CANCELLED" -> "Chờ hoàn tiền".equals(e.paymentStatusLabel())
                    ? new Email("[Cần hoàn tiền] " + e.orderCode() + " · " + money(e.total()),
                    shop("Đơn " + e.orderCode() + " đã huỷ sau khi khách thanh toán",
                            "<p>Vào trang quản trị, mở đơn và bấm <b>Hoàn tiền</b>.</p>"))
                    : null;
            default -> null;
        };
    }

    /** Anh bo hoa: duong dan web cua order-service, ghep voi dia chi Gateway. */
    private static String photo(String mediaBaseUrl, String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            return "";
        }
        String src = mediaBaseUrl.replaceAll("/+$", "") + "/" + photoUrl.replaceAll("^/+", "");
        return "<p><img src=\"" + escape(src) + "\" alt=\"Ảnh bó hoa\" "
                + "style=\"max-width:100%;border-radius:4px\"></p>";
    }

    private static String summary(OrderEvent e) {
        return "<table style=\"border-collapse:collapse;margin:12px 0\">"
                + row("Người nhận", e.customerName())
                + row("Giao tới", e.address())
                + row("Sản phẩm", e.itemsSummary())
                + row("Tổng cộng", money(e.total()))
                + "</table>";
    }

    private static String row(String label, String value) {
        return "<tr><td style=\"padding:4px 12px 4px 0;color:#777\">" + label + "</td><td style=\"padding:4px 0\">"
                + (value == null ? "—" : escape(value)) + "</td></tr>";
    }

    private static String wrap(String name, String lead, String body, String link) {
        return "<div style=\"font-family:Arial,sans-serif;max-width:560px;color:#222\">"
                + "<h2 style=\"color:#b5654d;margin:0 0 16px\">Bloom Studio</h2>"
                + "<p>Xin chào " + escape(name) + ",</p><p>" + lead + "</p>" + body
                + "<p><a href=\"" + link + "\" style=\"color:#b5654d\">Xem đơn hàng</a></p>"
                + "<p style=\"color:#999;font-size:12px\">Thư tự động từ Bloom Studio, vui lòng không trả lời.</p></div>";
    }

    private static String shop(String title, String body) {
        return "<div style=\"font-family:Arial,sans-serif;color:#222\"><h3>" + title + "</h3>" + body + "</div>";
    }

    private static String money(Double value) {
        return value == null ? "—" : VND.format(Math.round(value));
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
