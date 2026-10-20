package dh13c6.nguyentiendat516.bloom.chatservice.ai;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import dh13c6.nguyentiendat516.bloom.chatservice.client.ShopDataClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cac cong cu tro ly AI duoc goi. Moi cong cu la mot loi goi API CHI DOC sang service khac
 * (tru handoff_to_staff - doi trang thai cuoc chat cua chinh khach).
 *
 * AI KHONG co cong cu dat hang, huy don, sua gia hay ap ma giam gia: nhung viec do van di
 * qua giao dien va nghiep vu co san, khong mo them cua nao cho viec "noi kheo" voi AI.
 *
 * Ket qua tra ve rut gon: chi nhung truong AI can de tu van, bot token va bot cho de bia.
 */
@Component
public class AssistantTools {

    public static final String SEARCH_BOUQUETS = "search_bouquets";
    public static final String GET_BOUQUET = "get_bouquet";
    public static final String GET_DELIVERY_RULES = "get_delivery_rules";
    public static final String GET_MY_ORDERS = "get_my_orders";
    public static final String HANDOFF_TO_STAFF = "handoff_to_staff";

    /** Ai dang chat: dung JWT cua chinh khach de hoi don hang. */
    public record Context(Long userId, String username, String bearerToken) {
    }

    private static final List<String> OCCASIONS =
            List.of("BIRTHDAY", "LOVE", "OPENING", "WEDDING", "SYMPATHY", "THANKS", "CONGRATS");
    private static final List<String> COLORS = List.of("RED", "PINK", "WHITE", "YELLOW", "PURPLE", "GREEN", "MIXED");

    private final ShopDataClient shop;
    private final ObjectMapper objectMapper;
    private final List<Tool> definitions;

    public AssistantTools(ShopDataClient shop, ObjectMapper objectMapper) {
        this.shop = shop;
        this.objectMapper = objectMapper;
        this.definitions = List.of(
                tool(SEARCH_BOUQUETS,
                        "Tìm bó hoa đang bán của Bloom Studio theo dịp, màu, khoảng giá hoặc từ khoá tên. "
                                + "Trả về tối đa 8 bó kèm giá từng cỡ, số ngày cần đặt trước và còn hàng không. "
                                + "Dùng trước khi gợi ý bất kỳ bó hoa hay mức giá nào.",
                        props(
                                "occasion", Map.of("type", "string", "enum", OCCASIONS,
                                        "description", "Dịp tặng: BIRTHDAY sinh nhật, LOVE tình yêu, OPENING khai trương, "
                                                + "WEDDING cưới hỏi, SYMPATHY chia buồn, THANKS cảm ơn, CONGRATS chúc mừng"),
                                "color", Map.of("type", "string", "enum", COLORS, "description", "Tông màu chủ đạo"),
                                "min_price", Map.of("type", "integer", "description", "Giá thấp nhất (VND)"),
                                "max_price", Map.of("type", "integer", "description", "Giá cao nhất (VND)"),
                                "keyword", Map.of("type", "string", "description", "Từ khoá trong tên bó, ví dụ: hồng, cẩm tú cầu")),
                        List.of()),
                tool(GET_BOUQUET,
                        "Xem chi tiết một bó hoa theo id: thành phần, số bông, giá từng cỡ, số ngày đặt trước, còn hàng không.",
                        props("product_id", Map.of("type", "integer", "description", "id bó hoa lấy từ search_bouquets")),
                        List.of("product_id")),
                tool(GET_DELIVERY_RULES,
                        "Quy tắc giao hoa hiện tại: hôm nay là ngày nào, giờ chốt đơn trong ngày, còn giao hôm nay được không, "
                                + "vùng giao, ngưỡng miễn phí giao, khung giờ, loại thiệp và quà kèm (có giá), cách thanh toán.",
                        props(), List.of()),
                tool(GET_MY_ORDERS,
                        "5 đơn gần nhất của chính khách đang chat: mã đơn, trạng thái, ngày giờ giao, tổng tiền, "
                                + "đã có ảnh bó hoa thật chưa. Dùng khi khách hỏi về đơn của họ.",
                        props(), List.of()),
                tool(HANDOFF_TO_STAFF,
                        "Chuyển cuộc chat cho nhân viên thật. Dùng khi khách muốn gặp người, khiếu nại, đòi hoàn tiền, "
                                + "muốn sửa/huỷ đơn, hỏi điều công cụ không trả lời được, hoặc bạn không chắc chắn.",
                        props("reason", Map.of("type", "string", "description", "Lý do ngắn gọn cho nhân viên đọc")),
                        List.of("reason")));
    }

    public List<Tool> definitions() {
        return definitions;
    }

    /**
     * Chay mot cong cu, tra ve JSON dang chuoi cho tool_result.
     * handoff_to_staff KHONG chay o day - FloristAssistant tu xu ly vi no doi trang thai chat.
     */
    public String execute(String name, Map<String, Object> input, Context ctx) {
        Object result = switch (name) {
            case SEARCH_BOUQUETS -> searchBouquets(input);
            case GET_BOUQUET -> getBouquet(input);
            case GET_DELIVERY_RULES -> deliveryRules();
            case GET_MY_ORDERS -> myOrders(ctx);
            default -> throw new IllegalArgumentException("Không có công cụ " + name);
        };
        return objectMapper.writeValueAsString(result);
    }

    // ===================== tung cong cu =====================

    private Object searchBouquets(Map<String, Object> input) {
        Map<String, Object> page = shop.searchProducts(str(input.get("occasion")), str(input.get("color")),
                num(input.get("min_price")), num(input.get("max_price")), str(input.get("keyword")), 8);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> p : list(page.get("content"))) {
            out.add(bouquetSummary(p, false));
        }
        return Map.of("count", out.size(), "bouquets", out);
    }

    private Object getBouquet(Map<String, Object> input) {
        Number id = num(input.get("product_id"));
        if (id == null) {
            throw new IllegalArgumentException("Thiếu product_id");
        }
        return bouquetSummary(shop.product(id.longValue()), true);
    }

    private Object deliveryRules() {
        Map<String, Object> o = shop.orderOptions();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("today", o.get("today"));
        out.put("same_day_cutoff_hour", o.get("sameDayCutoffHour"));
        out.put("same_day_still_open", o.get("sameDayOpen"));
        out.put("delivery_area", o.get("deliveryAreaLabel"));
        out.put("free_delivery_from_vnd", o.get("freeDeliveryThreshold"));
        out.put("time_slots", list(o.get("slots")).stream().map(s -> s.get("label")).toList());
        out.put("cards", list(o.get("cards")).stream()
                .map(c -> Map.of("name", c.get("label"), "price_vnd", c.get("price"))).toList());
        out.put("gift_addons", list(o.get("addons")).stream()
                .map(a -> Map.of("name", a.get("label"), "price_vnd", a.get("price"))).toList());
        out.put("payment_methods", "COD (trả khi nhận hoa), VNPay, MoMo, ZaloPay");
        out.put("custom_order_page", "/dat-hoa-theo-yeu-cau");
        return out;
    }

    private Object myOrders(Context ctx) {
        Map<String, Object> page = shop.myOrders(ctx.bearerToken(), 5);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> o : list(page.get("content"))) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", o.get("code"));
            row.put("link", "/orders/" + o.get("id"));
            row.put("status", o.get("statusLabel"));
            row.put("delivery_date", o.get("deliveryDate"));
            row.put("time_slot", o.get("timeSlotLabel"));
            row.put("total_vnd", o.get("total"));
            row.put("payment", o.get("paymentMethodLabel") + " · " + o.get("paymentStatusLabel"));
            row.put("items", list(o.get("items")).stream()
                    .map(i -> i.get("productName") + (i.get("sizeLabel") == null ? "" : " (" + i.get("sizeLabel") + ")")
                            + " × " + i.get("quantity"))
                    .toList());
            row.put("has_arrangement_photo", o.get("arrangementPhotoUrl") != null);
            out.add(row);
        }
        return Map.of("count", out.size(), "orders", out);
    }

    private Map<String, Object> bouquetSummary(Map<String, Object> p, boolean detail) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", p.get("id"));
        out.put("name", p.get("name"));
        out.put("link", "/products/" + p.get("id"));
        out.put("sizes", list(p.get("sizes")).stream()
                .map(s -> {
                    Map<String, Object> size = new LinkedHashMap<>();
                    size.put("size", s.get("label"));
                    size.put("stems", s.get("stems"));
                    size.put("price_vnd", s.get("price"));
                    return size;
                })
                .toList());
        out.put("order_days_ahead", p.get("leadDays"));
        Object stock = p.get("stockQuantity");
        out.put("in_stock", stock instanceof Number n && n.intValue() > 0);
        out.put("occasions", p.get("occasions"));
        out.put("color", p.get("color"));
        if (p.get("ratingCount") instanceof Number n && n.intValue() > 0) {
            out.put("rating", p.get("ratingAverage") + "/5 (" + n + " đánh giá)");
        }
        if (detail) {
            out.put("composition", p.get("composition"));
            out.put("description", p.get("description"));
            Object category = p.get("category");
            if (category instanceof Map<?, ?> c) {
                out.put("category", c.get("name"));
            }
        }
        return out;
    }

    // ===================== ho tro =====================

    private static Tool tool(String name, String description, Map<String, Object> properties, List<String> required) {
        Tool.InputSchema.Properties.Builder props = Tool.InputSchema.Properties.builder();
        properties.forEach((key, schema) -> props.putAdditionalProperty(key, JsonValue.from(schema)));
        return Tool.builder()
                .name(name)
                .description(description)
                .inputSchema(Tool.InputSchema.builder().properties(props.build()).required(required).build())
                .build();
    }

    /** Giu thu tu khai bao cua cac tham so. */
    private static Map<String, Object> props(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(Object value) {
        return value instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static Number num(Object value) {
        if (value instanceof Number n) {
            return n;
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Long.valueOf(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
