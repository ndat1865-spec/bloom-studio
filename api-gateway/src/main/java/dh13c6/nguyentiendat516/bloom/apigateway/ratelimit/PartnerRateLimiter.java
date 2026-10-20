package dh13c6.nguyentiendat516.bloom.apigateway.ratelimit;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gioi han so request moi phut cua TUNG khoa doi tac - thuat toan token bucket.
 *
 * Moi khoa co mot "xo" chua toi da N token (N = han muc/phut), moi request lay mot token,
 * xo tu day lai deu N token moi phut. Khac dem theo phut chan (fixed window): doi tac khong
 * the don 2N request vao 1 giay cuoi phut nay + 1 giay dau phut sau.
 *
 * GIOI HAN DA BIET: bo dem nam trong bo nho cua MOT tien trinh Gateway. Chay nhieu ban
 * Gateway thi moi ban dem rieng; khi do phai dua bo dem ra Redis (Spring Cloud Gateway co
 * san RequestRateLimiter dung Redis). Voi mot Gateway cua do an thi khong can.
 */
@Component
public class PartnerRateLimiter {

    /** Ket qua mot lan xin token. retryAfterSeconds chi co nghia khi allowed = false. */
    public record Decision(boolean allowed, int limit, int remaining, long retryAfterSeconds) {
    }

    private static final int MAX_BUCKETS = 10_000;

    private final Map<Long, Bucket> buckets = new ConcurrentHashMap<>();

    public Decision tryConsume(Long keyId, int limitPerMinute) {
        if (buckets.size() >= MAX_BUCKETS && !buckets.containsKey(keyId)) {
            buckets.clear();
        }
        Bucket bucket = buckets.computeIfAbsent(keyId, id -> new Bucket(limitPerMinute));
        return bucket.tryConsume(limitPerMinute, System.nanoTime());
    }

    /** Mot xo token. synchronized: nhieu request cung khoa co the toi cung luc. */
    private static final class Bucket {

        private static final double NANOS_PER_MINUTE = 60_000_000_000.0;

        private double tokens;
        private long lastRefill = System.nanoTime();

        Bucket(int capacity) {
            this.tokens = capacity;
        }

        synchronized Decision tryConsume(int capacity, long now) {
            // ADMIN ha han muc -> cat bot token dang du cho khop han muc moi
            tokens = Math.min(capacity, tokens + (now - lastRefill) * capacity / NANOS_PER_MINUTE);
            lastRefill = now;
            if (tokens >= 1) {
                tokens -= 1;
                return new Decision(true, capacity, (int) Math.floor(tokens), 0);
            }
            double secondsForOneToken = (1 - tokens) * 60.0 / capacity;
            return new Decision(false, capacity, 0, (long) Math.ceil(secondsForOneToken));
        }
    }
}
