package dh13c6.nguyentiendat516.bloom.orderservice.shipping;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderItem;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Collator;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giao hang qua GHN: danh muc dia gioi, tinh phi, tao / tra cuu / huy van don.
 *
 * Nam trong order-service chu khong tach service rieng: phi giao hang la mot phan cua
 * tong tien don, phai tinh trong CUNG luc dat hang. Tach ra thi moi lan dat hang them mot
 * loi goi mang noi bo ma khong duoc gi them ve ranh gioi du lieu (service moi se khong co
 * du lieu rieng nao - GHN moi la noi giu du lieu van don).
 */
@Service
public class ShippingService {

    /** Mot don vi hanh chinh (tinh hoac quan). */
    public record Place(int id, String name) {
    }

    public record Ward(String code, String name) {
    }

    /** Dia chi da doi chieu voi danh muc GHN. */
    public record ResolvedAddress(String fullAddress, int provinceId, int districtId, String wardCode) {
    }

    /** Ket qua tao van don. codAmount: so tien shipper thu ho; weight: gram gui GHN. */
    public record Shipment(String orderCode, Instant expectedDeliveryAt, double fee, long codAmount, int weight) {
    }

    /** Mot moc trong hanh trinh van don. */
    public record TrackingEvent(String status, Instant at) {
    }

    /** Hang nhe - dich vu tieu chuan cho thuong mai dien tu cua GHN. */
    private static final int SERVICE_TYPE_ID = 2;

    private static final Collator VI = Collator.getInstance(Locale.forLanguageTag("vi-VN"));

    private final GhnClient ghn;
    private final int itemWeightGrams;
    private final boolean sandbox;
    private final int packageLength;
    private final int packageWidth;
    private final int packageHeight;

    // Danh muc dia gioi gan nhu khong doi: nho trong bo nho, khoi dong lai thi tai lai.
    private volatile List<Place> provinces;
    private final Map<Integer, List<Place>> districts = new ConcurrentHashMap<>();
    private final Map<Integer, List<Ward>> wards = new ConcurrentHashMap<>();

    public ShippingService(GhnClient ghn,
                           @Value("${ghn.item-weight-grams}") int itemWeightGrams,
                           @Value("${ghn.package-length-cm}") int packageLength,
                           @Value("${ghn.package-width-cm}") int packageWidth,
                           @Value("${ghn.package-height-cm}") int packageHeight,
                           @Value("${ghn.base-url}") String baseUrl,
                           @Value("${ghn.sandbox-simulation:auto}") String sandboxSimulation) {
        this.ghn = ghn;
        this.itemWeightGrams = itemWeightGrams;
        this.packageLength = packageLength;
        this.packageWidth = packageWidth;
        this.packageHeight = packageHeight;
        // Moi truong thu cua GHN khong co shipper that: bat cong cu gia lap shipper (auto = khi dung dev-online-gateway)
        this.sandbox = "true".equalsIgnoreCase(sandboxSimulation)
                || ("auto".equalsIgnoreCase(sandboxSimulation) && baseUrl.contains("dev-online-gateway"));
    }

    /** Dang dung moi truong thu cua GHN (khong co shipper that) - cho phep gia lap trang thai. */
    public boolean sandbox() {
        return enabled() && sandbox;
    }

    /**
     * Thu tu cac trang thai van don tren duong giao thuan (khong tinh huy / tra hang).
     * Dung de khong keo lui: GHN (hoac sandbox) bao trang thai cu hon thi giu trang thai moi hon.
     */
    private static final List<String> FORWARD = List.of("ready_to_pick", "picking", "money_collect_picking",
            "picked", "storing", "transporting", "sorting", "delivering", "money_collect_delivering", "delivered");

    public static int progressRank(String status) {
        return status == null ? -1 : FORWARD.indexOf(status);
    }

    public boolean enabled() {
        return ghn.isConfigured();
    }

    // ===================== DANH MUC DIA GIOI =====================

    public List<Place> provinces() {
        List<Place> cached = provinces;
        if (cached == null) {
            // Ten tinh that khong bao gio co chu so; moi truong thu nghiem cua GHN co ban sao
            // kieu "Hà Nội 02" -> bo. KHONG ap dung cho quan: "Quận 1", "Quận 10" la ten that.
            cached = toPlaces(ghn.provinces(), "ProvinceID", "ProvinceName").stream()
                    .filter(p -> !p.name().matches(".*\\d.*"))
                    .toList();
            // Khong nho ket qua rong: GHN loi tam thoi thi lan sau hoi lai
            if (!cached.isEmpty()) {
                provinces = cached;
            }
        }
        return cached;
    }

    public List<Place> districts(int provinceId) {
        List<Place> cached = districts.get(provinceId);
        if (cached == null) {
            cached = toPlaces(ghn.districts(provinceId), "DistrictID", "DistrictName");
            if (!cached.isEmpty()) {
                districts.put(provinceId, cached);
            }
        }
        return cached;
    }

    public List<Ward> wards(int districtId) {
        List<Ward> cached = wards.get(districtId);
        if (cached == null) {
            List<Ward> list = new ArrayList<>();
            for (Map<String, Object> row : ghn.wards(districtId)) {
                String code = str(row.get("WardCode"));
                String name = str(row.get("WardName"));
                if (!code.isEmpty() && usable(name)) {
                    list.add(new Ward(code, name));
                }
            }
            list.sort(Comparator.comparing(Ward::name, VI));
            cached = List.copyOf(list);
            if (!cached.isEmpty()) {
                wards.put(districtId, cached);
            }
        }
        return cached;
    }

    /**
     * Doi chieu ma tinh / quan / phuong client gui len voi danh muc GHN va ghep dia chi day
     * du. Chi tin MA, ten lay tu GHN - client gui ten sai thi don van in dung dia chi.
     */
    public ResolvedAddress resolve(String street, Integer provinceId, Integer districtId, String wardCode) {
        if (provinceId == null || districtId == null || wardCode == null || wardCode.isBlank()) {
            throw new BadRequestException("Chọn đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã");
        }
        Place province = provinces().stream().filter(p -> p.id() == provinceId).findFirst()
                .orElseThrow(() -> new BadRequestException("Tỉnh/Thành phố không hợp lệ"));
        Place district = districts(provinceId).stream().filter(d -> d.id() == districtId).findFirst()
                .orElseThrow(() -> new BadRequestException("Quận/Huyện không thuộc tỉnh đã chọn"));
        Ward ward = wards(districtId).stream().filter(w -> w.code().equals(wardCode.trim())).findFirst()
                .orElseThrow(() -> new BadRequestException("Phường/Xã không thuộc quận/huyện đã chọn"));

        String full = street.trim() + ", " + ward.name() + ", " + district.name() + ", " + province.name();
        if (full.length() > 255) {
            throw new BadRequestException("Địa chỉ quá dài, hãy rút gọn số nhà / tên đường");
        }
        return new ResolvedAddress(full, province.id(), district.id(), ward.code());
    }

    // ===================== PHI VA VAN DON =====================

    /** Phi giao hang GHN (VND) cho so bo hoa itemCount toi phuong/xa da chon. */
    public double quote(int districtId, String wardCode, int itemCount) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("service_type_id", SERVICE_TYPE_ID);
        body.put("to_district_id", districtId);
        body.put("to_ward_code", wardCode);
        body.put("weight", weightOf(itemCount));
        body.put("length", packageLength);
        body.put("width", packageWidth);
        body.put("height", heightFor(itemCount));
        body.put("insurance_value", 0);
        Object total = ghn.fee(body).get("total");
        if (!(total instanceof Number n)) {
            throw new GhnException("GHN không trả về phí giao hàng");
        }
        return n.doubleValue();
    }

    /**
     * Tao van don GHN cho mot don hang.
     *
     * payment_type_id = 1: CUA HANG tra phi cho GHN, vi khach da tra phi giao hang trong
     * tong don. cod_amount: don COD thi shipper thu ho toan bo tong tien; don da thanh toan
     * truc tuyen thi 0.
     */
    public Shipment createShipment(Order order, boolean collectOnDelivery) {
        int itemCount = order.getItems().stream().mapToInt(OrderItem::getQuantity).sum();

        List<Map<String, Object>> items = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("name", item.getProductName());
            line.put("code", item.getProductId() == null ? "" : String.valueOf(item.getProductId()));
            line.put("quantity", item.getQuantity());
            line.put("price", Math.round(item.getUnitPrice()));
            line.put("weight", itemWeightGrams);
            items.add(line);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("payment_type_id", 1);
        body.put("required_note", "CHOXEMHANGKHONGTHU");
        body.put("client_order_code", order.getCode());
        body.put("to_name", order.getCustomerName());
        body.put("to_phone", normalizePhone(order.getPhone()));
        body.put("to_address", order.getAddress());
        body.put("to_ward_code", order.getToWardCode());
        body.put("to_district_id", order.getToDistrictId());
        long codAmount = collectOnDelivery ? Math.round(order.getTotal()) : 0;
        int weight = weightOf(itemCount);
        body.put("cod_amount", codAmount);
        body.put("content", "Hoa tươi - đơn " + order.getCode());
        body.put("note", order.getNote() == null ? "Hàng dễ dập, nhẹ tay" : order.getNote());
        body.put("weight", weight);
        body.put("length", packageLength);
        body.put("width", packageWidth);
        body.put("height", heightFor(itemCount));
        body.put("insurance_value", 0);
        body.put("service_type_id", SERVICE_TYPE_ID);
        body.put("items", items);

        Map<String, Object> data = ghn.createOrder(body);
        Object fee = data.get("total_fee");
        return new Shipment(str(data.get("order_code")), parseInstant(data.get("expected_delivery_time")),
                fee instanceof Number n ? n.doubleValue() : 0, codAmount, weight);
    }

    /** Trang thai hien tai cua van don va thoi gian du kien giao. */
    public Map<String, Object> detail(String ghnOrderCode) {
        return ghn.detail(ghnOrderCode);
    }

    public void cancelShipment(String ghnOrderCode) {
        for (Map<String, Object> row : ghn.cancel(ghnOrderCode)) {
            if (Boolean.FALSE.equals(row.get("result"))) {
                throw new GhnException("GHN không huỷ được vận đơn " + ghnOrderCode + ": " + str(row.get("message")));
            }
        }
    }

    // ===================== DOC KET QUA TRA CUU =====================

    /**
     * Trang thai GHN -> trang thai don tuong ung. null = khong keo trang thai don di dau
     * (huy, tra hang, ngoai le... de nguoi xu ly quyet dinh).
     */
    public static OrderStatus stageOf(String ghnStatus) {
        if (ghnStatus == null) {
            return null;
        }
        return switch (ghnStatus) {
            case "ready_to_pick", "picking", "money_collect_picking" -> OrderStatus.PREPARING;
            case "picked", "storing", "transporting", "sorting", "delivering", "money_collect_delivering",
                 "delivery_fail" -> OrderStatus.SHIPPING;
            case "delivered" -> OrderStatus.DELIVERED;
            default -> null;
        };
    }

    /** Khoi luong GHN tinh phi (gram): lon hon giua can nang that va quy doi theo the tich. */
    public static Integer chargeableWeight(Map<String, Object> detail) {
        if (detail.get("calculate_weight") instanceof Number n && n.intValue() > 0) {
            return n.intValue();
        }
        int actual = detail.get("weight") instanceof Number n ? n.intValue() : 0;
        int converted = detail.get("converted_weight") instanceof Number n ? n.intValue() : 0;
        int weight = Math.max(actual, converted);
        return weight > 0 ? weight : null;
    }

    /**
     * Hanh trinh van don tu truong "log" cua GHN, cu nhat truoc. Van don chua doi trang
     * thai lan nao thi GHN khong tra "log" - khi do tra danh sach rong.
     */
    public static List<TrackingEvent> trackingEvents(Map<String, Object> detail) {
        List<TrackingEvent> events = new ArrayList<>();
        if (detail.get("log") instanceof List<?> rows) {
            for (Object row : rows) {
                if (row instanceof Map<?, ?> m && m.get("status") != null) {
                    Instant at = parseInstant(m.get("updated_date"));
                    if (at != null) {
                        events.add(new TrackingEvent(String.valueOf(m.get("status")), at));
                    }
                }
            }
        }
        events.sort(Comparator.comparing(TrackingEvent::at));
        return events;
    }

    /**
     * Luu hanh trinh vao mot cot TEXT: moi dong "status@2026-09-26T07:05:49Z". Chi de hien
     * thi, khong truy van theo tung moc nen khong can bang rieng hay JSON.
     */
    public static String encodeLog(List<TrackingEvent> events) {
        StringBuilder sb = new StringBuilder();
        for (TrackingEvent e : events) {
            sb.append(e.status()).append('@').append(e.at()).append('\n');
        }
        return sb.toString();
    }

    public static List<TrackingEvent> decodeLog(String text) {
        List<TrackingEvent> events = new ArrayList<>();
        if (text == null) {
            return events;
        }
        for (String line : text.split("\n")) {
            int at = line.lastIndexOf('@');
            if (at > 0) {
                Instant time = parseInstant(line.substring(at + 1).trim());
                if (time != null) {
                    events.add(new TrackingEvent(line.substring(0, at), time));
                }
            }
        }
        return events;
    }

    /** Gop hanh trinh cu voi moc moi, bo moc trung (cung trang thai, cung thoi diem). */
    public static List<TrackingEvent> mergeLog(List<TrackingEvent> known, List<TrackingEvent> fresh) {
        List<TrackingEvent> merged = new ArrayList<>(known);
        for (TrackingEvent e : fresh) {
            if (!merged.contains(e)) {
                merged.add(e);
            }
        }
        merged.sort(Comparator.comparing(TrackingEvent::at));
        return merged;
    }

    // ===================== HO TRO =====================

    /** Trang thai GHN -> nhan tieng Viet. */
    public static String label(String status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case "ready_to_pick" -> "Chờ lấy hàng";
            case "picking" -> "Đang lấy hàng";
            case "money_collect_picking" -> "Đang tương tác với người gửi";
            case "picked" -> "Đã lấy hàng";
            case "storing" -> "Đã nhập kho";
            case "transporting" -> "Đang luân chuyển";
            case "sorting" -> "Đang phân loại";
            case "delivering" -> "Đang giao hàng";
            case "money_collect_delivering" -> "Đang tương tác với người nhận";
            case "delivered" -> "Đã giao hàng";
            case "delivery_fail" -> "Giao hàng thất bại";
            case "waiting_to_return" -> "Chờ trả hàng";
            case "return", "return_transporting", "return_sorting", "returning" -> "Đang trả hàng";
            case "return_fail" -> "Trả hàng thất bại";
            case "returned" -> "Đã trả hàng";
            case "cancel" -> "Đã huỷ vận đơn";
            case "exception" -> "Đơn hàng ngoại lệ";
            case "damage" -> "Hàng bị hư hỏng";
            case "lost" -> "Hàng bị thất lạc";
            default -> status;
        };
    }

    /** GHN chi nhan so di dong 10 so bat dau bang 0: bo khoang trang, dau cham, doi +84 -> 0. */
    static String normalizePhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }
        return digits;
    }

    /** Hop cao them moi bo mot tang; GHN nhan toi da 150 cm moi chieu. */
    private int heightFor(int itemCount) {
        return Math.min(150, Math.max(1, itemCount) * packageHeight);
    }

    private int weightOf(int itemCount) {
        return Math.max(1, itemCount) * itemWeightGrams;
    }

    private static List<Place> toPlaces(List<Map<String, Object>> rows, String idKey, String nameKey) {
        List<Place> list = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row.get(idKey) instanceof Number id && usable(str(row.get(nameKey)))) {
                list.add(new Place(id.intValue(), str(row.get(nameKey))));
            }
        }
        list.sort(Comparator.comparing(Place::name, VI));
        return List.copyOf(list);
    }

    /** Moi truong thu nghiem cua GHN lan vai dong du lieu test - an di. */
    private static boolean usable(String name) {
        return !name.isBlank() && !name.toLowerCase(Locale.ROOT).contains("test");
    }

    private static Instant parseInstant(Object value) {
        try {
            return value == null ? null : Instant.parse(String.valueOf(value));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
