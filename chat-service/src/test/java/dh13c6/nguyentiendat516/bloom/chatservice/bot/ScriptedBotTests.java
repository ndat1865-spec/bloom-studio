package dh13c6.nguyentiendat516.bloom.chatservice.bot;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** Nhan dien dip va ngan sach tu cau khach go - khach go co dau, khong dau, viet tat deu phai hieu. */
class ScriptedBotTests {

    private static String occ(String text) {
        return ScriptedBot.detectOccasion(ScriptedBot.normalize(text));
    }

    private static Long budget(String text) {
        return ScriptedBot.detectBudget(ScriptedBot.normalize(text));
    }

    @Test
    void detectsOccasionWithOrWithoutAccents() {
        assertEquals("BIRTHDAY", occ("Mai sinh nhật mẹ mình"));
        assertEquals("BIRTHDAY", occ("hoa sinh nhat cho ban"));
        assertEquals("OPENING", occ("Khai trương cửa hàng bạn"));
        assertEquals("SYMPATHY", occ("cần vòng hoa viếng đám tang"));
        assertEquals("LOVE", occ("tặng vợ nhân dịp kỷ niệm"));
        assertEquals("THANKS", occ("hoa cảm ơn thầy cô 20/11"));
        assertEquals("WEDDING", occ("hoa cầm tay cô dâu"));
        assertNull(occ("shop ơi cho hỏi"));
    }

    @Test
    void detectsBudgetInCommonVietnameseForms() {
        assertEquals(500_000L, budget("khoảng 500k"));
        assertEquals(500_000L, budget("tầm 500 nghìn"));
        assertEquals(1_000_000L, budget("1 triệu đổ lại"));
        assertEquals(1_500_000L, budget("ngân sách 1tr5"));
        assertEquals(700_000L, budget("700.000đ"));
        assertEquals(2_000_000L, budget("2 củ"));
        assertNull(budget("mai giao lúc 9 giờ"));
        assertNull(budget("20/11"));
    }

    private static Long[] range(String text) {
        return ScriptedBot.detectPriceRange(ScriptedBot.normalize(text));
    }

    @Test
    void upperBoundIsExactNotPlusTwentyPercent() {
        // Loi cu: "duoi 500k" bi noi thanh duoi 600k, goi y ca bo 580k
        assertArrayEquals(new Long[]{null, 500_000L}, range("cần bó hoa dưới 500k"));
        assertArrayEquals(new Long[]{null, 1_000_000L}, range("1 triệu đổ lại"));
        assertArrayEquals(new Long[]{null, 700_000L}, range("tối đa 700 nghìn"));
        assertArrayEquals(new Long[]{null, 400_000L}, range("rẻ hơn 400k"));
        assertArrayEquals(new Long[]{null, 300_000L}, range("không quá 300k"));
    }

    @Test
    void lowerBoundAndBetween() {
        assertArrayEquals(new Long[]{1_000_000L, null}, range("bó trên 1 triệu"));
        assertArrayEquals(new Long[]{2_000_000L, null}, range("hơn 2 triệu"));
        assertArrayEquals(new Long[]{500_000L, null}, range("500k trở lên"));
        assertArrayEquals(new Long[]{300_000L, 500_000L}, range("từ 300k đến 500k"));
        assertArrayEquals(new Long[]{300_000L, 500_000L}, range("tầm 300-500k"));
        assertArrayEquals(new Long[]{1_000_000L, 1_500_000L}, range("1 đến 1tr5"));
    }

    @Test
    void approximateBudgetKeepsTwentyPercentHeadroom() {
        assertArrayEquals(new Long[]{null, 600_000L}, range("khoảng 500k"));
        assertArrayEquals(new Long[]{null, 600_000L}, range("trên dưới 500k"));
        assertNull(range("hoa sinh nhật cho mẹ"));
    }
}
