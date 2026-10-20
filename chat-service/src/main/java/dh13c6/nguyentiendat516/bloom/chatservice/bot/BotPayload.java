package dh13c6.nguyentiendat516.bloom.chatservice.bot;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/**
 * Phan "giau" cua mot tin nhan tu dong: nut tra loi nhanh va the bo hoa.
 * Luu thanh JSON trong cot chat_messages.payload; tin thuong thi payload null.
 */
public record BotPayload(List<QuickReply> quickReplies, List<ProductCard> cards) {

    private static final ObjectMapper JSON = JsonMapper.builder().build();

    /**
     * Nut bam. action la ma lenh gui nguoc ve bot (vd. "occ:BIRTHDAY"), label la chu hien
     * tren nut va cung la noi dung tin cua khach khi bam.
     */
    public record QuickReply(String label, String action) {
    }

    /** The bo hoa - du de khach quyet dinh bam vao xem, khong can mo trang san pham. */
    public record ProductCard(Long id, String name, String imageUrl, Double priceFrom, int sizeCount,
                              Integer stems, int leadDays, String link) {
    }

    public static BotPayload of(List<QuickReply> quickReplies) {
        return new BotPayload(quickReplies, List.of());
    }

    public String toJson() {
        return JSON.writeValueAsString(this);
    }

    /** Doc payload tu CSDL; hong / rong thi coi nhu khong co. */
    public static BotPayload fromJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return JSON.readValue(json, BotPayload.class);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
