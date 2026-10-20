package dh13c6.nguyentiendat516.bloom.apigateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Chan som nhung request thieu han header Authorization, de khong lam phien service
 * phia sau.
 *
 * DAY CHI LA BUOC CHAN SOM, KHONG phai lop bao mat that. Gateway chi kiem tra header
 * CO TON TAI hay khong, khong he xac thuc chu ky. Viec xac thuc that do tung service
 * tu lam bang JwtAuthFilter - neu ai do goi thang localhost:8082 bo qua Gateway thi
 * buoc nay hoan toan vo hieu. Nguyen tac Zero Trust thu nho.
 */
@Component
public class AuthHeaderFilter implements GlobalFilter, Ordered {

    /** Nhung duong dan khong can dang nhap. */
    private static final List<String> OPEN_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            // Dang nhap bang Google (+ /config): ID token Google thay cho mat khau
            "/api/auth/google",
            "/api/public/",
            "/uploads/",
            // Anh bo hoa thanh pham / anh mau cua khach: the <img> khong gui duoc JWT
            "/order-media/",
            // Ket qua thanh toan va IPN / callback: cong thanh toan khong co JWT.
            // payment-service tu kiem chu ky cua cong - day moi la lop bao mat that.
            "/api/payments/return",
            "/api/payments/vnpay/ipn",
            "/api/payments/momo/ipn",
            "/api/payments/zalopay/callback",
            // GHN bao doi trang thai van don; order-service khong tin noi dung, tu hoi lai GHN
            "/api/shipping/ghn/webhook");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        boolean isOpen = OPEN_PATHS.stream().anyMatch(path::startsWith);

        // Xem hoa, danh muc, danh gia, tuy chon thanh toan, ma dang co, cong thanh toan dang
        // bat va danh muc dia gioi GHN thi khong can
        // dang nhap; chi thao tac ghi moi can. /api/products/{id}/reviews/eligibility cung
        // lot qua day nhung product-service van tu tra 401 neu thieu token.
        boolean isPublicRead = HttpMethod.GET.equals(request.getMethod())
                && (path.startsWith("/api/products") || path.startsWith("/api/categories")
                    || path.equals("/api/orders/options") || path.equals("/api/vouchers/public")
                    || path.equals("/api/vouchers/hunt")
                    || path.equals("/api/payments/methods") || path.equals("/api/shipping/provinces")
                    || path.equals("/api/shipping/districts") || path.equals("/api/shipping/wards"));

        // Trinh duyet gui OPTIONS truoc moi request co header tuy chinh (CORS preflight)
        // va KHONG kem theo header Authorization - phai cho di qua.
        boolean isPreflight = HttpMethod.OPTIONS.equals(request.getMethod());

        if (isOpen || isPublicRead || isPreflight) {
            return chain.filter(exchange);
        }

        // Spring 7 (Boot 4): HttpHeaders khong con containsKey(String) - dung
        // getFirst(...) == null. Code mau cua tai lieu viet cho Boot 3 nen khong compile.
        if (request.getHeaders().getFirst("Authorization") == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
