package dh13c6.nguyentiendat516.bloom.apigateway.filter;

import dh13c6.nguyentiendat516.bloom.apigateway.client.ApiKeyValidationClient;
import dh13c6.nguyentiendat516.bloom.apigateway.ratelimit.PartnerRateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Kiem tra header X-API-KEY cho route danh cho doi tac ngoai.
 *
 * Day la lop bao mat DOC LAP voi JWT: doi tac la may goi may, khong co tai khoan nguoi
 * dung nen khong dang nhap duoc de lay token. Nguoc lai, co API Key dung cung khong
 * thay the duoc JWT cho cac route nghiep vu.
 *
 * Key khong con la chuoi tinh trong file cau hinh: auth-service giu danh sach key, moi
 * key co chu so huu, scope, trang thai va han dung. Gateway chi hoi va nho ket qua -
 * xem ApiKeyValidationClient.
 */
@Component
public class ApiKeyFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyFilter.class);

    private static final String PARTNER_PATH = "/api/public/";
    private static final String API_KEY_HEADER = "X-API-KEY";

    /** Danh tinh doi tac, Gateway tu gan sau khi kiem tra xong. */
    private static final String PARTNER_HEADER = "X-Partner-Name";

    private final ApiKeyValidationClient validationClient;
    private final PartnerRateLimiter rateLimiter;

    public ApiKeyFilter(ApiKeyValidationClient validationClient, PartnerRateLimiter rateLimiter) {
        this.validationClient = validationClient;
        this.rateLimiter = rateLimiter;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // Xoa X-Partner-Name tren MOI request truoc khi lam gi khac. Neu khong, client
        // tu dat header nay va service phia sau se tin nham la Gateway da xac thuc.
        // Cung mot bai hoc voi 4.10: khong bao gio tin dinh danh do client tu khai.
        ServerWebExchange cleaned = exchange.mutate()
                .request(r -> r.headers(h -> h.remove(PARTNER_HEADER)))
                .build();

        if (!path.startsWith(PARTNER_PATH)) {
            return chain.filter(cleaned);
        }

        String apiKey = cleaned.getRequest().getHeaders().getFirst(API_KEY_HEADER);

        if (apiKey == null || apiKey.isBlank()) {
            // Thieu thong tin xac thuc -> 401, khong phai 403
            return reject(cleaned, HttpStatus.UNAUTHORIZED, "Thiếu header X-API-KEY");
        }

        return validationClient.validate(apiKey, requiredScope(path))
                .flatMap(result -> {
                    if (!result.valid()) {
                        // Ghi ly do vao log cho minh xem, con doi tac chi nhan mot cau chung:
                        // phan biet "key sai" voi "key da thu hoi" la chi cho ke do biet
                        // chuoi nao tung la key that.
                        log.warn("Tu choi API Key cho {}: {}", path, result.reason());
                        return reject(cleaned, HttpStatus.FORBIDDEN, "API Key không hợp lệ");
                    }
                    // Han muc rieng cua khoa nay. Kiem SAU khi khoa hop le: khoa sai khong
                    // duoc tao xo dem, tranh bi ban khoa rac lam phinh bo nho.
                    PartnerRateLimiter.Decision decision = rateLimiter.tryConsume(result.keyId(),
                            result.rateLimitPerMinute());
                    var headers = cleaned.getResponse().getHeaders();
                    headers.set("X-RateLimit-Limit", String.valueOf(decision.limit()));
                    headers.set("X-RateLimit-Remaining", String.valueOf(decision.remaining()));
                    if (!decision.allowed()) {
                        headers.set("Retry-After", String.valueOf(decision.retryAfterSeconds()));
                        log.warn("Khoa cua {} vuot {} request/phut", result.ownerName(), decision.limit());
                        return reject(cleaned, HttpStatus.TOO_MANY_REQUESTS, "Vượt giới hạn "
                                + decision.limit() + " request/phút của khoá này, thử lại sau "
                                + decision.retryAfterSeconds() + " giây");
                    }
                    ServerWebExchange identified = cleaned.mutate()
                            .request(r -> r.headers(h -> h.set(PARTNER_HEADER, result.ownerName())))
                            .build();
                    return chain.filter(identified);
                })
                .onErrorResume(e -> {
                    // auth-service chet hoac qua han tra loi: DONG cua lai, khong cho di tiep.
                    // Mot lop bao mat ma "loi thi cho qua" thi coi nhu khong co.
                    log.error("Khong hoi duoc auth-service de kiem tra API Key: {}", e.toString());
                    return reject(cleaned, HttpStatus.SERVICE_UNAVAILABLE,
                            "Chưa kiểm tra được API Key, thử lại sau");
                });
    }

    /**
     * Route doi tac nao doi scope nao. Them route /api/public/** moi thi khai them o day,
     * neu khong key nao cung goi duoc route do mien la con hieu luc.
     */
    private String requiredScope(String path) {
        if (path.startsWith("/api/public/products")) {
            return "products:read";
        }
        return null;
    }

    private Mono<Void> reject(ServerWebExchange exchange, HttpStatus status, String message) {
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -2; // chay truoc AuthHeaderFilter
    }
}
