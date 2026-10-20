package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.DeliverySlot;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Quy tac giao hoa tuoi: gio chot don trong ngay, so ngay dat truoc, vung giao.
 *
 * Moi phep tinh "hom nay / bay gio" deu theo gio Viet Nam. Container Docker chay UTC:
 * dung LocalDate.now() tran thi tu 0:00 toi 7:00 sang server van tuong la hom qua.
 */
@Component
public class DeliveryPolicy {

    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Can 1 tieng bo hoa: dat luc 11:30 thi khung Sang (ket thuc 12:00) khong con kip. */
    public static final int PREP_HOURS = 1;

    private final int cutoffHour;
    private final List<Integer> provinceIds;
    private final String areaLabel;
    /** Dong ho theo gio Viet Nam; test truyen dong ho co dinh de thu "10:30 sang". */
    private final Clock clock;

    @Autowired
    public DeliveryPolicy(@Value("${order.same-day-cutoff-hour:15}") int cutoffHour,
                          @Value("${order.delivery-province-ids:}") String provinceIds,
                          @Value("${order.delivery-area-label:Hà Nội}") String areaLabel) {
        this(cutoffHour, provinceIds, areaLabel, Clock.system(SHOP_ZONE));
    }

    DeliveryPolicy(int cutoffHour, String provinceIds, String areaLabel, Clock clock) {
        this.clock = clock;
        this.cutoffHour = cutoffHour;
        this.provinceIds = Arrays.stream(provinceIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::valueOf)
                .toList();
        this.areaLabel = areaLabel;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public int cutoffHour() {
        return cutoffHour;
    }

    /** Con nhan don giao trong hom nay khong (chua qua gio chot). */
    /** Gio hien tai o Viet Nam "HH:mm" - frontend khoa khung da qua theo gio server. */
    public String nowTime() {
        return LocalTime.now(clock).withSecond(0).withNano(0).toString();
    }

    public boolean sameDayOpen() {
        return ZonedDateTime.now(clock).getHour() < cutoffHour;
    }

    /** Ngay giao som nhat cho don co hoa phai dat truoc leadDays ngay. */
    public LocalDate earliestDate(int leadDays) {
        int days = Math.max(leadDays, sameDayOpen() ? 0 : 1);
        return today().plusDays(days);
    }

    /** Tinh GHN duoc giao; rong = giao moi noi. */
    public List<Integer> provinceIds() {
        return provinceIds;
    }

    public String areaLabel() {
        return areaLabel;
    }

    /**
     * Kiem tra ngay + khung gio giao.
     *
     * date null = "giao som nhat co the" - chi cho khi khong co hoa can dat truoc.
     * leadDays > 0 (hoa cuoi, hoa su kien) thi bat buoc chon ngay.
     */
    public void validate(LocalDate date, DeliverySlot slot, int leadDays) {
        validate(date, slot, null, leadDays);
    }

    /**
     * Nhu tren, kem khung giao 1 tieng (hour = gio bat dau). Giao hom nay thi khung phai con
     * du PREP_HOURS de cam hoa: 10:30 dat thi som nhat la khung 12:00 - 13:00 (11:00 chi con 30 phut).
     */
    public void validate(LocalDate date, DeliverySlot slot, Integer hour, int leadDays) {
        LocalDate today = today();
        if (date != null && date.isBefore(today)) {
            throw new BadRequestException("Ngày giao hàng không được ở quá khứ");
        }
        if (leadDays > 0 && date == null) {
            throw new BadRequestException("Đơn có hoa cần đặt trước " + leadDays
                    + " ngày, hãy chọn ngày giao từ " + DAY.format(earliestDate(leadDays)));
        }
        if (date != null && date.isBefore(earliestDate(leadDays))) {
            throw new BadRequestException(leadDays > 0
                    ? "Đơn có hoa cần đặt trước " + leadDays + " ngày, giao sớm nhất ngày "
                    + DAY.format(earliestDate(leadDays))
                    : "Đã qua " + cutoffHour + ":00, studio chốt đơn giao trong ngày. Hãy chọn giao từ ngày "
                    + DAY.format(earliestDate(0)));
        }
        boolean isToday = date == null || date.equals(today);
        if (hour != null && isToday
                && LocalTime.now(clock).plusHours(PREP_HOURS).isAfter(LocalTime.of(hour, 0))) {
            throw new BadRequestException("Khung " + DeliverySlot.hourLabel(hour)
                    + " hôm nay không còn kịp cắm hoa, hãy chọn khung muộn hơn hoặc ngày khác");
        }
        if (hour == null && slot != null && isToday
                && LocalTime.now(clock).plusHours(PREP_HOURS).isAfter(LocalTime.of(slot.getEndHour(), 0))) {
            throw new BadRequestException("Khung giờ " + slot.getLabel()
                    + " hôm nay không còn kịp, hãy chọn khung giờ muộn hơn hoặc ngày khác");
        }
    }

    /** Hoa tuoi khong di buu kien lien tinh duoc - chi nhan dia chi trong vung giao. */
    public void validateProvince(Integer provinceId) {
        if (!provinceIds.isEmpty() && provinceIds.stream().noneMatch(id -> Objects.equals(id, provinceId))) {
            throw new BadRequestException("Studio chỉ giao hoa tươi trong " + areaLabel
                    + " để hoa tới tay người nhận trong ngày. Hãy chọn địa chỉ trong " + areaLabel);
        }
    }
}
