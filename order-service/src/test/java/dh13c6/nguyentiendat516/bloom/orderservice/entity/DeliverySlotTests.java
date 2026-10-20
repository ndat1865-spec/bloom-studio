package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Khung giao 1 tieng -> buoi giao (Sang / Chieu / Toi) va nhan hien thi. */
class DeliverySlotTests {

    @Test
    void hourBelongsToItsSlot() {
        assertEquals(DeliverySlot.MORNING, DeliverySlot.ofHour(8));
        assertEquals(DeliverySlot.MORNING, DeliverySlot.ofHour(11));
        assertEquals(DeliverySlot.AFTERNOON, DeliverySlot.ofHour(12));
        assertEquals(DeliverySlot.AFTERNOON, DeliverySlot.ofHour(16));
        assertEquals(DeliverySlot.EVENING, DeliverySlot.ofHour(17));
        assertEquals(DeliverySlot.EVENING, DeliverySlot.ofHour(20));
        assertThrows(IllegalArgumentException.class, () -> DeliverySlot.ofHour(21));
        assertThrows(IllegalArgumentException.class, () -> DeliverySlot.ofHour(7));
    }

    @Test
    void hourRangeAndLabel() {
        assertEquals(8, DeliverySlot.firstHour());
        assertEquals(20, DeliverySlot.lastHour());
        assertEquals("10:00 – 11:00", DeliverySlot.hourLabel(10));
    }
}
