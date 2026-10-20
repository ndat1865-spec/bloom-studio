package dh13c6.nguyentiendat516.bloom.apigateway.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hoi auth-service xem API Key con hieu luc khong, co nho ket qua trong bo nho.
 *
 * Vi sao phai cache: khong co no thi moi request cua doi tac deu keo theo mot luot goi
 * mang cong mot luot doc CSDL o auth-service. Doi lai, key vua thu hoi van dung duoc
 * toi het thoi gian cache - dat partner.cache-ttl-seconds = 0 de thu hoi co hieu luc
 * ngay khi dang trinh bay.
 *
 * Dung WebClient chu khong phai RestTemplate: Gateway chay tren WebFlux, mot lenh goi
 * chan luong se giu mot thread cua vong lap su kien va lam nghen ca cong 8080.
 */
@Component
public class ApiKeyValidationClient {

    /** Chan tren so dong cache, tranh viec bi ban key rac lam phinh bo nho. */
    private static final int MAX_ENTRIES = 1000;

    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(3);

    private final WebClient webClient;
    private final Duration ttl;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    /**
     * Tao WebClient bang WebClient.create chu KHONG nhan WebClient.Builder qua constructor:
     * starter cua Gateway khong keo theo auto-config nao dang ky bean Builder, nen tiem
     * Builder se bien dich sach nhung chet luc khoi dong voi "No qualifying bean of type
     * WebClient$Builder". Cung kieu loi "bien dich sach, chi lo luc chay" nhu khi quen
     * @ConfigurationPropertiesScan.
     */
    public ApiKeyValidationClient(@Value("${partner.auth-service-url}") String authServiceUrl,
                                  @Value("${partner.cache-ttl-seconds:60}") long cacheTtlSeconds) {
        this.webClient = WebClient.create(authServiceUrl);
        this.ttl = Duration.ofSeconds(cacheTtlSeconds);
    }

    /**
     * Ket qua da rut gon cho Gateway. scopes khong can giu vi auth-service da kiem tra ho.
     * keyId + rateLimitPerMinute de dem han muc theo tung khoa (PartnerRateLimiter).
     */
    public record Result(boolean valid, String reason, String ownerName, Long keyId, int rateLimitPerMinute) {
    }

    /** Body tra ve cua auth-service. Khai lai o day - hai service khong dung chung ma nguon. */
    public record ValidationResponse(boolean valid, String reason, String ownerName, Long keyId,
                                     Integer rateLimitPerMinute) {
    }

    public Mono<Result> validate(String rawKey, String requiredScope) {
        // Cache theo hash chu khong theo key goc: key that chi song trong vong doi mot
        // request, khong nam lai trong mot Map ton tai suot doi tien trinh.
        String cacheKey = sha256(rawKey) + "|" + (requiredScope == null ? "" : requiredScope);

        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return Mono.just(cached.result());
        }

        return webClient.post()
                .uri("/internal/api-keys/validate")
                .bodyValue(Map.of(
                        "key", rawKey,
                        "requiredScope", requiredScope == null ? "" : requiredScope))
                .retrieve()
                .bodyToMono(ValidationResponse.class)
                .timeout(CALL_TIMEOUT)
                .map(body -> new Result(body.valid(), body.reason(), body.ownerName(), body.keyId(),
                        body.rateLimitPerMinute() == null ? 60 : body.rateLimitPerMinute()))
                .doOnNext(result -> put(cacheKey, result));
    }

    private void put(String cacheKey, Result result) {
        if (ttl.isZero() || ttl.isNegative()) {
            return;
        }
        if (cache.size() >= MAX_ENTRIES) {
            // Don don gian: het cho thi xoa sach roi nap lai. Voi vai key that thi khong
            // bao gio cham toi nhanh nay.
            cache.clear();
        }
        cache.put(cacheKey, new CacheEntry(result, Instant.now().plus(ttl)));
    }

    private record CacheEntry(Result result, Instant expiresAt) {
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("JVM khong ho tro SHA-256", e);
        }
    }
}
