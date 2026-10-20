package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.CardType;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.DeliverySlot;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.GiftAddon;
import dh13c6.nguyentiendat516.bloom.orderservice.service.DeliveryPolicy;
import dh13c6.nguyentiendat516.bloom.orderservice.service.OrderService;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

/**
 * Cac tuy chon cua trang thanh toan: loai thiep, qua kem, khung gio va quy tac phi ship.
 * Frontend doc tu day thay vi tu khai gia - doi gia chi can sua o server.
 *
 * ghnEnabled = true: form dia chi chon Tinh / Quan / Phuong theo GHN va phi giao hang
 * lay tu GHN; deliveryFee khi do khong dung. false: dia chi go tu do, phi = deliveryFee.
 */
public record OrderOptionsResponse(
        List<Option> cards,
        List<Option> addons,
        List<Slot> slots,
        double freeDeliveryThreshold,
        double deliveryFee,
        boolean ghnEnabled,
        /** Dang dung moi truong thu GHN: trang quan tri hien cong cu gia lap shipper. */
        boolean ghnSandbox,
        // ---------- quy tac giao hoa tuoi ----------
        /** Hom nay theo gio Viet Nam - frontend dung thay dong ho may khach. */
        LocalDate today,
        int sameDayCutoffHour,
        /** Con nhan don giao trong hom nay khong. */
        boolean sameDayOpen,
        /** Tinh GHN duoc giao; rong = moi noi. */
        List<Integer> deliveryProvinceIds,
        String deliveryAreaLabel,
        /** Gio hien tai o Viet Nam "HH:mm" - de khoa khung giao da qua. */
        String nowTime,
        /** Khung giao 1 tieng: gio bat dau som nhat / muon nhat; can bao nhieu tieng cam hoa. */
        int firstDeliveryHour,
        int lastDeliveryHour,
        int prepHours
) {
    public record Option(String value, String label, String description, double price) {
    }

    public record Slot(String value, String label, int startHour, int endHour) {
    }

    public static OrderOptionsResponse current(boolean ghnEnabled, boolean ghnSandbox, DeliveryPolicy policy) {
        return new OrderOptionsResponse(
                Arrays.stream(CardType.values())
                        .map(c -> new Option(c.name(), c.getLabel(), null, c.getPrice())).toList(),
                Arrays.stream(GiftAddon.values())
                        .map(a -> new Option(a.name(), a.getLabel(), a.getDescription(), a.getPrice())).toList(),
                Arrays.stream(DeliverySlot.values())
                        .map(s -> new Slot(s.name(), s.getLabel(), s.getStartHour(), s.getEndHour())).toList(),
                OrderService.FREE_DELIVERY_THRESHOLD,
                OrderService.DELIVERY_FEE,
                ghnEnabled,
                ghnSandbox,
                policy.today(),
                policy.cutoffHour(),
                policy.sameDayOpen(),
                policy.provinceIds(),
                policy.areaLabel(),
                policy.nowTime(),
                DeliverySlot.firstHour(),
                DeliverySlot.lastHour(),
                DeliveryPolicy.PREP_HOURS);
    }
}
