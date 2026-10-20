package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Gio chot don, khung giao 1 tieng, so ngay dat truoc - voi dong ho co dinh theo gio Viet Nam. */
class DeliveryPolicyTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);

    private static DeliveryPolicy at(int hour, int minute) {
        ZonedDateTime now = TODAY.atTime(hour, minute).atZone(DeliveryPolicy.SHOP_ZONE);
        return new DeliveryPolicy(15, "201", "Hà Nội", Clock.fixed(now.toInstant(), DeliveryPolicy.SHOP_ZONE));
    }

    @Test
    void hourWindowNeedsOneHourToArrange() {
        DeliveryPolicy policy = at(10, 30);
        // 10:30 dat, can 1 tieng cam hoa: khung 10:00 va 11:00 khong kip, som nhat 12:00 - 13:00
        assertThrows(BadRequestException.class, () -> policy.validate(TODAY, null, 10, 0));
        assertThrows(BadRequestException.class, () -> policy.validate(TODAY, null, 11, 0));
        assertDoesNotThrow(() -> policy.validate(TODAY, null, 12, 0));
        // Ngay mai thi khung nao cung duoc
        assertDoesNotThrow(() -> policy.validate(TODAY.plusDays(1), null, 8, 0));
    }

    @Test
    void sameDayCutoffAt15() {
        assertTrue(at(14, 59).sameDayOpen());
        assertFalse(at(15, 0).sameDayOpen());
        assertThrows(BadRequestException.class, () -> at(15, 10).validate(TODAY, null, 19, 0));
        assertEquals(TODAY.plusDays(1), at(16, 0).earliestDate(0));
    }

    @Test
    void leadDaysPushEarliestDate() {
        DeliveryPolicy policy = at(9, 0);
        assertEquals(TODAY.plusDays(7), policy.earliestDate(7));
        assertThrows(BadRequestException.class, () -> policy.validate(TODAY.plusDays(3), null, null, 7));
        assertDoesNotThrow(() -> policy.validate(TODAY.plusDays(7), null, 10, 7));
    }

    @Test
    void nowTimeIsVietnamTime() {
        assertEquals("10:30", at(10, 30).nowTime());
    }
}
