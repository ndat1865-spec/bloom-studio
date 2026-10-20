package dh13c6.nguyentiendat516.bloom.chatservice.bot;

import dh13c6.nguyentiendat516.bloom.chatservice.client.ShopDataClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tro ly tu dong theo kich ban - mien phi, khong goi AI.
 *
 * Khach bam nut (action) hoac go chu (bat tu khoa); bot tra loi bang du lieu THAT lay qua API
 * cua product-service va order-service: goi y bo hoa theo dip + ngan sach, gio chot don hom nay,
 * don cua chinh khach. Khong hieu thi dua menu va nut "Gap nhan vien".
 *
 * Action khong luu trang thai: moi nut mang du thong tin cua buoc truoc
 * (vd. "find:BIRTHDAY:500000-1000000:1" = dip, khoang gia, trang) nen khong can bang phien bot.
 */
@Component
public class ScriptedBot {

    private static final Logger log = LoggerFactory.getLogger(ScriptedBot.class);

    public static final String NAME = "Trợ lý Bloom";

    private static final int PAGE_SIZE = 3;

    /** Ket qua mot luot: noi dung, nut / the bo hoa, co chuyen nhan vien khong. */
    public record Reply(String text, BotPayload payload, boolean handoff) {
    }

    // ---------- dip + ngan sach: nhan hien tren nut ----------

    private static final Map<String, String> OCCASIONS = new LinkedHashMap<>();
    private static final Map<String, String> BUDGETS = new LinkedHashMap<>();

    static {
        OCCASIONS.put("BIRTHDAY", "Sinh nhật");
        OCCASIONS.put("LOVE", "Tình yêu");
        OCCASIONS.put("OPENING", "Khai trương");
        OCCASIONS.put("CONGRATS", "Chúc mừng");
        OCCASIONS.put("THANKS", "Cảm ơn");
        OCCASIONS.put("WEDDING", "Cưới hỏi");
        OCCASIONS.put("SYMPATHY", "Chia buồn");

        BUDGETS.put("0-500000", "Dưới 500k");
        BUDGETS.put("500000-1000000", "500k – 1 triệu");
        BUDGETS.put("1000000-3000000", "1 – 3 triệu");
        BUDGETS.put("3000000-", "Trên 3 triệu");
    }

    private static final BotPayload.QuickReply FIND = new BotPayload.QuickReply("Tìm hoa theo dịp", "find");
    private static final BotPayload.QuickReply DELIVERY = new BotPayload.QuickReply("Hôm nay còn giao kịp?", "delivery");
    private static final BotPayload.QuickReply ORDERS = new BotPayload.QuickReply("Đơn của tôi", "orders");
    private static final BotPayload.QuickReply FAQ = new BotPayload.QuickReply("Câu hỏi thường gặp", "faq");
    private static final BotPayload.QuickReply CUSTOM = new BotPayload.QuickReply("Đặt hoa theo yêu cầu", "custom");
    private static final BotPayload.QuickReply STAFF = new BotPayload.QuickReply("Gặp nhân viên", "staff");

    private static final List<BotPayload.QuickReply> MENU = List.of(FIND, DELIVERY, ORDERS, FAQ, STAFF);

    private final ShopDataClient shop;
    private final NumberFormat vnd = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));

    public ScriptedBot(ShopDataClient shop) {
        this.shop = shop;
    }

    // ===================== NUT BAM =====================

    /** Xu ly nut khach vua bam. bearerToken: JWT cua khach, de xem don cua chinh ho. */
    public Reply handleAction(String action, String bearerToken) {
        String[] part = action.split(":", -1);
        try {
            return switch (part[0]) {
                case "menu" -> menu("Mình giúp gì được cho bạn?");
                case "find" -> part.length == 1 ? askOccasion() : find(part);
                case "occ" -> askBudget(part.length > 1 ? part[1] : "");
                case "delivery" -> delivery();
                case "orders" -> orders(bearerToken);
                case "faq" -> part.length == 1 ? faqMenu() : faq(part[1]);
                case "custom" -> custom();
                case "staff" -> new Reply("Mình chuyển bạn sang nhân viên Bloom Studio nhé — họ sẽ trả lời ngay "
                        + "trong khung chat này.", null, true);
                default -> menu("Mình chưa hiểu lựa chọn đó. Bạn chọn lại giúp mình nhé:");
            };
        } catch (RuntimeException e) {
            // product-service / order-service khong tra loi: noi that, dua nut gap nhan vien
            log.warn("Bot không lấy được dữ liệu cho lệnh {}: {}", action, e.toString());
            return new Reply("Mình chưa lấy được dữ liệu lúc này. Bạn thử lại sau ít phút, hoặc gặp nhân viên nhé.",
                    BotPayload.of(List.of(STAFF, new BotPayload.QuickReply("Thử lại", action))), false);
        }
    }

    // ===================== GO CHU =====================

    /**
     * Khach go tu do: bat y dinh theo tu khoa (khong dau, chu thuong). Tim thay dip va / hoac
     * ngan sach thi goi y bo hoa luon; noi toi khieu nai, hoan tien, huy / sua don thi chuyen nguoi.
     */
    public Reply handleText(String text, String bearerToken) {
        String t = normalize(text);

        if (containsAny(t, "nhan vien", "nguoi that", "tu van vien", "khieu nai", "hoan tien", "tra lai tien",
                "huy don", "doi don", "sua don", "boi thuong", "goi lai", "hotline", "so dien thoai")) {
            return handleAction("staff", bearerToken);
        }

        String occasion = detectOccasion(t);
        Long[] price = detectPriceRange(t);
        if (occasion != null || price != null) {
            if (price == null) {
                return handleAction("occ:" + occasion, bearerToken);
            }
            String range = (price[0] == null ? "0" : price[0]) + "-" + (price[1] == null ? "" : price[1]);
            return handleAction("find:" + (occasion == null ? "" : occasion) + ":" + range, bearerToken);
        }

        if (containsAny(t, "don hang", "ma don", "don cua", "don toi", "don minh", "toi dau", "trang thai don",
                "da giao chua", "bao gio toi", "anh bo hoa")) {
            return handleAction("orders", bearerToken);
        }
        if (containsAny(t, "hom nay", "giao kip", "kip khong", "may gio", "khung gio", "ship", "giao hang",
                "giao trong ngay", "chot don", "giao o dau", "giao tinh", "noi thanh")) {
            return handleAction("delivery", bearerToken);
        }
        if (containsAny(t, "thanh toan", "momo", "vnpay", "zalopay", "chuyen khoan", "cod", "tien mat")) {
            return handleAction("faq:payment", bearerToken);
        }
        if (containsAny(t, "thiep", "loi chuc", "qua kem", "gau bong", "socola", "chocolate", "binh hoa", "bong bay")) {
            return handleAction("faq:card", bearerToken);
        }
        if (containsAny(t, "theo yeu cau", "lam rieng", "thiet ke", "mau rieng", "khong co mau", "bo rieng")) {
            return handleAction("custom", bearerToken);
        }
        if (containsAny(t, "tuoi", "bao lau", "cham soc", "giu hoa", "cam hoa")) {
            return handleAction("faq:care", bearerToken);
        }
        if (containsAny(t, "hoa", "bo", "gio hoa", "lang hoa", "mua", "dat", "goi y", "tu van")) {
            return askOccasion();
        }
        if (containsAny(t, "chao", "hello", "hi ", "alo", "shop oi", "ad oi", "xin chao") || t.length() <= 3) {
            return menu("Chào bạn! Mình là trợ lý của Bloom Studio. Mình giúp gì được cho bạn?");
        }
        return menu("Mình chưa hiểu ý bạn lắm 😅 Bạn chọn một mục dưới đây, hoặc bấm \"Gặp nhân viên\" để nói "
                + "chuyện với người thật nhé.");
    }

    // ===================== TUNG BUOC =====================

    private Reply menu(String text) {
        return new Reply(text, BotPayload.of(MENU), false);
    }

    private Reply askOccasion() {
        List<BotPayload.QuickReply> buttons = new ArrayList<>();
        OCCASIONS.forEach((code, label) -> buttons.add(new BotPayload.QuickReply(label, "occ:" + code)));
        buttons.add(new BotPayload.QuickReply("Chưa rõ dịp", "occ:"));
        return new Reply("Bạn tặng hoa nhân dịp gì?", BotPayload.of(buttons), false);
    }

    private Reply askBudget(String occasion) {
        List<BotPayload.QuickReply> buttons = new ArrayList<>();
        BUDGETS.forEach((range, label) -> buttons.add(new BotPayload.QuickReply(label, "find:" + occasion + ":" + range)));
        String prefix = OCCASIONS.containsKey(occasion) ? "Hoa " + OCCASIONS.get(occasion).toLowerCase() + " — " : "";
        return new Reply(prefix + "ngân sách của bạn khoảng bao nhiêu?", BotPayload.of(buttons), false);
    }

    /** find:DIP:MIN-MAX[:TRANG] - goi y toi da 3 bo con hang, co nut xem them. */
    private Reply find(String[] part) {
        String occasion = part.length > 1 && OCCASIONS.containsKey(part[1]) ? part[1] : null;
        String range = part.length > 2 ? part[2] : "";
        int page = part.length > 3 ? parseInt(part[3]) : 0;
        Long min = null;
        Long max = null;
        if (range.contains("-")) {
            String[] mm = range.split("-", -1);
            min = mm[0].isBlank() ? null : Long.valueOf(mm[0]);
            max = mm[1].isBlank() ? null : Long.valueOf(mm[1]);
            if (min != null && min == 0) {
                min = null;
            }
        }

        Map<String, Object> result = shop.searchProducts(occasion, null, min, max, null, page, PAGE_SIZE);
        List<Map<String, Object>> items = list(result.get("content"));
        List<BotPayload.ProductCard> cards = new ArrayList<>();
        for (Map<String, Object> p : items) {
            if (p.get("stockQuantity") instanceof Number n && n.intValue() <= 0) {
                continue;
            }
            cards.add(card(p));
        }
        boolean more = !Boolean.TRUE.equals(result.get("last"));
        String what = (occasion == null ? "hoa" : "hoa " + OCCASIONS.get(occasion).toLowerCase())
                + (BUDGETS.containsKey(range) ? " " + BUDGETS.get(range).toLowerCase()
                : min != null && max != null ? " từ " + money(min) + " đến " + money(max)
                : min != null ? " từ " + money(min) + " trở lên"
                : max != null ? " dưới " + money(max) : "");

        if (cards.isEmpty() && page == 0) {
            return new Reply("Hiện studio chưa có mẫu " + what + " còn hàng. Bạn thử khoảng giá khác, hoặc nhờ studio "
                    + "làm riêng theo ngân sách của bạn nhé.",
                    BotPayload.of(List.of(new BotPayload.QuickReply("Đổi ngân sách", "occ:" + nz(occasion)), CUSTOM,
                            STAFF)), false);
        }

        List<BotPayload.QuickReply> buttons = new ArrayList<>();
        if (more) {
            buttons.add(new BotPayload.QuickReply("Xem thêm mẫu",
                    "find:" + nz(occasion) + ":" + range + ":" + (page + 1)));
        }
        buttons.add(new BotPayload.QuickReply("Đổi ngân sách", "occ:" + nz(occasion)));
        buttons.add(new BotPayload.QuickReply("Chọn dịp khác", "find"));
        buttons.add(CUSTOM);
        String text = cards.isEmpty()
                ? "Hết mẫu " + what + " rồi. Bạn đổi ngân sách hoặc nhờ studio làm riêng nhé."
                : (page == 0 ? "Gợi ý " + what + " cho bạn:" : "Thêm vài mẫu " + what + ":")
                + " bấm vào bó để xem chi tiết, chọn cỡ và đặt.";
        return new Reply(text, new BotPayload(buttons, cards), false);
    }

    private Reply delivery() {
        Map<String, Object> o = shop.orderOptions();
        String today = String.valueOf(o.get("today"));
        String day = today.length() >= 10 ? today.substring(8, 10) + "/" + today.substring(5, 7) : today;
        Object cutoff = o.get("sameDayCutoffHour");
        boolean open = Boolean.TRUE.equals(o.get("sameDayOpen"));
        String area = String.valueOf(o.get("deliveryAreaLabel"));
        List<String> slots = list(o.get("slots")).stream().map(s -> String.valueOf(s.get("label"))).toList();

        String text = (open
                ? "Hôm nay (" + day + ") studio **vẫn nhận đơn giao trong ngày** — đặt trước " + cutoff + ":00 nhé."
                : "Đơn giao trong ngày hôm nay (" + day + ") **đã chốt lúc " + cutoff + ":00**. Bạn đặt bây giờ thì "
                + "giao sớm nhất là ngày mai.")
                + "\n- Giao trong nội thành " + area
                + "\n- Khung giờ: " + String.join(", ", slots)
                + "\n- Miễn phí giao cho đơn từ " + money(o.get("freeDeliveryThreshold"))
                + "\n- Hoa cưới, hoa sự kiện cần đặt trước vài ngày (ghi rõ ở từng mẫu).";
        return new Reply(text, BotPayload.of(List.of(FIND, ORDERS, STAFF)), false);
    }

    private Reply orders(String bearerToken) {
        List<Map<String, Object>> orders = list(shop.myOrders(bearerToken, 3).get("content"));
        if (orders.isEmpty()) {
            return new Reply("Bạn chưa có đơn nào. Mình gợi ý vài bó hoa nhé?", BotPayload.of(List.of(FIND, STAFF)),
                    false);
        }
        StringBuilder text = new StringBuilder("Các đơn gần nhất của bạn:");
        for (Map<String, Object> o : orders) {
            text.append("\n- [").append(o.get("code")).append("](/orders/").append(o.get("id")).append(") — **")
                    .append(o.get("statusLabel")).append("**");
            Object date = o.get("deliveryDate");
            if (date != null) {
                String d = String.valueOf(date);
                text.append(", giao ").append(d.length() >= 10 ? d.substring(8, 10) + "/" + d.substring(5, 7) : d);
            }
            if (o.get("timeSlotLabel") != null) {
                text.append(" (").append(o.get("timeSlotLabel")).append(")");
            }
            text.append(", ").append(money(o.get("total")));
            if (o.get("arrangementPhotoUrl") != null) {
                text.append(" · đã có ảnh bó hoa thật");
            }
        }
        text.append("\nBấm mã đơn để xem chi tiết. Muốn sửa hay huỷ đơn thì gặp nhân viên nhé.");
        return new Reply(text.toString(), BotPayload.of(List.of(STAFF, FIND)), false);
    }

    private Reply faqMenu() {
        return new Reply("Bạn muốn hỏi về điều gì?", BotPayload.of(List.of(
                new BotPayload.QuickReply("Cách thanh toán", "faq:payment"),
                new BotPayload.QuickReply("Thiệp & quà kèm", "faq:card"),
                new BotPayload.QuickReply("Ảnh bó hoa thật", "faq:photo"),
                new BotPayload.QuickReply("Giữ hoa tươi lâu", "faq:care"),
                new BotPayload.QuickReply("Đổi / huỷ đơn", "faq:cancel"))), false);
    }

    private Reply faq(String topic) {
        List<BotPayload.QuickReply> next = List.of(FAQ, FIND, STAFF);
        return switch (topic) {
            case "payment" -> new Reply("Bạn chọn cách thanh toán ở bước đặt hoa:\n- **COD**: trả tiền mặt khi nhận hoa"
                    + "\n- **VNPay, MoMo, ZaloPay**: trả ngay, studio bắt đầu cắm hoa sau khi nhận tiền"
                    + "\nĐơn trả trực tuyến quá 30 phút chưa thanh toán sẽ tự huỷ.", BotPayload.of(next), false);
            case "card" -> {
                Map<String, Object> o = shop.orderOptions();
                StringBuilder text = new StringBuilder("Ở bước đặt hoa bạn thêm được:");
                for (Map<String, Object> c : list(o.get("cards"))) {
                    if (!"NONE".equals(c.get("value"))) {
                        text.append("\n- ").append(c.get("label")).append(": ").append(priceOrFree(c.get("price")));
                    }
                }
                for (Map<String, Object> a : list(o.get("addons"))) {
                    text.append("\n- ").append(a.get("label")).append(": ").append(priceOrFree(a.get("price")));
                }
                text.append("\nLời chúc viết tay lên thiệp, và bạn có thể giấu tên người tặng.");
                yield new Reply(text.toString(), BotPayload.of(next), false);
            }
            case "photo" -> new Reply("Cắm xong bó hoa, thợ hoa chụp **ảnh bó thật** gửi vào trang đơn và email của bạn "
                    + "trước khi giao. Muốn chỉnh gì (ruy băng, giấy gói…) bạn nhắn nhân viên trước giờ giao nhé.",
                    BotPayload.of(List.of(ORDERS, FAQ, STAFF)), false);
            case "care" -> new Reply("Để hoa tươi lâu:\n- Cắt chéo gốc 2–3 cm rồi cắm ngay vào nước sạch"
                    + "\n- Thay nước mỗi ngày, bỏ lá ngập dưới nước\n- Tránh nắng trực tiếp, điều hoà thổi thẳng"
                    + "\nThường hoa tươi đẹp 5–7 ngày; hoa khô giữ được nhiều tháng.", BotPayload.of(next), false);
            case "cancel" -> new Reply("Đơn còn **Chờ xác nhận** hoặc **Đã xác nhận** thì bạn tự huỷ được ở trang đơn. "
                    + "Khi thợ đã bắt đầu cắm hoa thì cần nhân viên hỗ trợ. Đơn đã trả trực tuyến sẽ được hoàn tiền.",
                    BotPayload.of(List.of(ORDERS, STAFF)), false);
            default -> faqMenu();
        };
    }

    private Reply custom() {
        return new Reply("Không thấy mẫu ưng ý? Bạn tả bó hoa muốn làm (dịp, ngân sách, tông màu, ảnh mẫu) ở trang "
                + "[Đặt hoa theo yêu cầu](/dat-hoa-theo-yeu-cau) — studio báo giá, bạn đồng ý thì đặt như đơn thường.",
                BotPayload.of(List.of(FIND, STAFF)), false);
    }

    // ===================== NHAN DIEN TU KHOA =====================

    static String detectOccasion(String t) {
        if (containsAny(t, "sinh nhat", "birthday", "tuoi moi", "happy birthday")) return "BIRTHDAY";
        if (containsAny(t, "khai truong", "khai ma", "mo cua hang", "mo shop")) return "OPENING";
        if (containsAny(t, "chia buon", "dam tang", "vieng", "phung dieu", "tang le", "tien dua")) return "SYMPATHY";
        if (containsAny(t, "cuoi", "co dau", "dam hoi", "an hoi")) return "WEDDING";
        if (containsAny(t, "cam on", "thay co", "20/11", "tri an")) return "THANKS";
        if (containsAny(t, "tot nghiep", "thang chuc", "chuc mung", "nha moi", "tan gia", "le ky niem thanh lap"))
            return "CONGRATS";
        if (containsAny(t, "nguoi yeu", "valentine", "tinh yeu", "ky niem", "tang vo", "tang chong", "ban gai",
                "ban trai", "to tinh", "8/3", "20/10", "vo minh", "vo toi")) return "LOVE";
        return null;
    }

    private static final Pattern MONEY = Pattern.compile(
            "(\\d+(?:[.,]\\d+)*)\\s*(k|nghin|ngan|trieu|tr|cu|m|dong|vnd|d)?(?![a-z0-9])");

    /** "300-500k", "300 den 500k": don vi chi viet o so sau -> chep sang so truoc. */
    private static final Pattern SHARED_UNIT = Pattern.compile(
            "(\\d+(?:[.,]\\d+)?)\\s*(-|–|den|toi)\\s*(\\d+(?:[.,]\\d+)?)\\s*(k|nghin|ngan|trieu|tr|cu)(?![a-z0-9])");

    /**
     * Khoang gia khach muon: {min, max}, phan tu null = khong chan. Khong noi gia thi null.
     * "duoi 500k" -> tran dung 500k; "tren 1 trieu" -> san 1 trieu; "300-500k" -> 300k..500k;
     * "khoang 500k" -> toi 500k + 20% de khong bo lo bo vua nhinh hon.
     */
    static Long[] detectPriceRange(String t) {
        List<Long> amounts = detectAmounts(t);
        if (amounts.isEmpty()) {
            return null;
        }
        if (amounts.size() >= 2) {
            long low = amounts.stream().mapToLong(Long::longValue).min().getAsLong();
            long high = amounts.stream().mapToLong(Long::longValue).max().getAsLong();
            return new Long[]{low, high};
        }
        long budget = amounts.get(0);
        // "tren duoi X" la uoc chung, khong phai chan tren hay chan duoi
        if (!t.contains("tren duoi")) {
            // Xet chan tren truoc: "re hon", "it hon" chua chu "hon" cua chan duoi
            if (containsAny(t, "duoi", "toi da", "khong qua", "khong vuot", "it hon", "re hon", "do lai",
                    "tro xuong", "chua toi", "chua den", "max", "<")) {
                return new Long[]{null, budget};
            }
            if (containsAny(t, "tren", "tro len", "it nhat", "toi thieu", " hon ", ">")) {
                return new Long[]{budget, null};
            }
        }
        return new Long[]{null, Math.round(budget * 1.2 / 10_000.0) * 10_000};
    }

    /** Ngan sach trong cau ("500k", "1 trieu", "1tr5", "700.000") -> so tien VND; khong co thi null. */
    static Long detectBudget(String t) {
        return detectAmounts(t).stream().max(Long::compare).orElse(null);
    }

    /** Moi so tien trong cau, theo thu tu xuat hien. */
    private static List<Long> detectAmounts(String t) {
        // "1tr5" -> "1.5tr" truoc, roi moi chep don vi cho "1 den 1.5tr"
        String text = t.replaceAll("(\\d+)\\s*tr\\s*(\\d)(?!\\d)", "$1.$2tr");
        Matcher m = MONEY.matcher(SHARED_UNIT.matcher(text).replaceAll("$1$4 $2 $3$4"));
        List<Long> amounts = new ArrayList<>();
        while (m.find()) {
            String raw = m.group(1);
            String unit = m.group(2);
            double value;
            if (unit == null || unit.equals("d") || unit.equals("dong") || unit.equals("vnd")) {
                // So tron (co the kem "d" / "dong"): chi coi la tien neu du lon (700.000, 1500000)
                String digits = raw.replaceAll("[.,]", "");
                if (digits.length() < 5) {
                    continue;
                }
                value = Double.parseDouble(digits);
            } else {
                double number = Double.parseDouble(raw.replace(",", "."));
                value = switch (unit) {
                    case "k", "nghin", "ngan" -> number * 1_000;
                    default -> number * 1_000_000;
                };
            }
            if (value >= 50_000 && value <= 100_000_000) {
                amounts.add(Math.round(value));
            }
        }
        return amounts;
    }

    /** Chu thuong, bo dau tieng Viet, gop khoang trang - de so tu khoa khong phu thuoc cach go. */
    static String normalize(String text) {
        String lower = text.toLowerCase(Locale.ROOT).replace('đ', 'd');
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return " " + noAccent.replaceAll("\\s+", " ").trim() + " ";
    }

    private static boolean containsAny(String text, String... keys) {
        for (String k : keys) {
            if (text.contains(k)) {
                return true;
            }
        }
        return false;
    }

    // ===================== HO TRO =====================

    private BotPayload.ProductCard card(Map<String, Object> p) {
        List<Map<String, Object>> sizes = list(p.get("sizes"));
        Double from = sizes.stream()
                .map(s -> s.get("price") instanceof Number n ? n.doubleValue() : null)
                .filter(v -> v != null)
                .min(Double::compare)
                .orElse(p.get("price") instanceof Number n ? n.doubleValue() : null);
        Integer stems = p.get("stemCount") instanceof Number n ? n.intValue() : null;
        int lead = p.get("leadDays") instanceof Number n ? n.intValue() : 0;
        return new BotPayload.ProductCard(((Number) p.get("id")).longValue(), String.valueOf(p.get("name")),
                p.get("imageUrl") == null ? null : String.valueOf(p.get("imageUrl")), from,
                Math.max(1, sizes.size()), stems, lead, "/products/" + p.get("id"));
    }

    private String money(Object value) {
        if (!(value instanceof Number n)) {
            return "—";
        }
        return vnd.format(Math.round(n.doubleValue())) + "₫";
    }

    private String priceOrFree(Object value) {
        return value instanceof Number n && n.doubleValue() == 0 ? "miễn phí" : money(value);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private static int parseInt(String value) {
        try {
            return Math.max(0, Integer.parseInt(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(Object value) {
        return value instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }
}
