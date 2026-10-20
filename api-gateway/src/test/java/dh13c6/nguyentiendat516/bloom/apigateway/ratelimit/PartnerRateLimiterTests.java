package dh13c6.nguyentiendat516.bloom.apigateway.ratelimit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Giu thuat toan token bucket: dung han muc, tach rieng tung khoa, bao dung thoi gian cho. */
class PartnerRateLimiterTests {

    @Test
    void choQuaDungHanMucRoiChan() {
        PartnerRateLimiter limiter = new PartnerRateLimiter();
        for (int i = 1; i <= 5; i++) {
            PartnerRateLimiter.Decision d = limiter.tryConsume(1L, 5);
            assertThat(d.allowed()).isTrue();
            assertThat(d.remaining()).isEqualTo(5 - i);
        }
        PartnerRateLimiter.Decision blocked = limiter.tryConsume(1L, 5);
        assertThat(blocked.allowed()).isFalse();
        // 5 request/phut -> 12 giay moi co them mot token
        assertThat(blocked.retryAfterSeconds()).isBetween(11L, 12L);
    }

    @Test
    void moiKhoaMotXoRieng() {
        PartnerRateLimiter limiter = new PartnerRateLimiter();
        limiter.tryConsume(1L, 1);
        assertThat(limiter.tryConsume(1L, 1).allowed()).isFalse();
        // Khoa khac khong bi anh huong
        assertThat(limiter.tryConsume(2L, 1).allowed()).isTrue();
    }

    @Test
    void haHanMucThiCatBotTokenDangDu() {
        PartnerRateLimiter limiter = new PartnerRateLimiter();
        limiter.tryConsume(3L, 100);
        // ADMIN ha tu 100 xuong 2 request/phut: con toi da 2 luot, khong phai 99
        assertThat(limiter.tryConsume(3L, 2).allowed()).isTrue();
        assertThat(limiter.tryConsume(3L, 2).allowed()).isTrue();
        assertThat(limiter.tryConsume(3L, 2).allowed()).isFalse();
    }
}
