package dh13c6.nguyentiendat516.bloom.orderservice.resilience;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Circuit breaker cho MOI loi goi HTTP di ra tu service nay, moi may dich mot breaker rieng
 * (ten = host:port, vi du "product-service:8082", "dev-online-gateway.ghn.vn").
 *
 * Van de no giai quyet: product-service / GHN / cong thanh toan chet han thi moi request
 * phai doi het timeout (5-45 giay) roi moi bao loi, thread bi giu, request don lai va
 * service nay cham theo (loi day chuyen). Breaker dem ty le loi; qua nguong thi MO MACH:
 * trong mot khoang thoi gian tu choi NGAY, khong goi ra nua. Het khoang do cho vai request
 * thu (HALF_OPEN); thanh cong thi dong mach lai.
 *
 * Chi tinh la loi khi KHONG LIEN LAC DUOC (IOException: tu choi ket noi, timeout) hoac may
 * dich loi 5xx. 4xx la loi nghiep vu (het hang, dia chi sai) - may dich van khoe, khong tinh.
 *
 * Dat o tang RestTemplate thay vi tung client: moi client hien co (va client viet sau nay)
 * deu duoc bao ve ma khong phai sua. Lop nay giong het o order-service va payment-service -
 * trung lap co chu dich, nhu JwtAuthFilter.
 */
public class CircuitBreakerInterceptor implements ClientHttpRequestInterceptor {

    private final CircuitBreakerRegistry registry;

    public CircuitBreakerInterceptor(CircuitBreakerRegistry registry) {
        this.registry = registry;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        String name = request.getURI().getHost()
                + (request.getURI().getPort() > 0 ? ":" + request.getURI().getPort() : "");
        CircuitBreaker breaker = registry.circuitBreaker(name);
        if (!breaker.tryAcquirePermission()) {
            // Ke thua IOException -> RestTemplate boc thanh ResourceAccessException, nen moi
            // client dang xu ly "khong ket noi duoc" tu dong xu ly luon truong hop mach mo.
            throw new CircuitOpenException(name,
                    breaker.getCircuitBreakerConfig().getWaitIntervalFunctionInOpenState().apply(1) / 1000);
        }
        long start = System.nanoTime();
        try {
            ClientHttpResponse response = execution.execute(request, body);
            long elapsed = System.nanoTime() - start;
            if (response.getStatusCode().is5xxServerError()) {
                breaker.onError(elapsed, TimeUnit.NANOSECONDS,
                        new IOException("HTTP " + response.getStatusCode().value() + " tu " + name));
            } else {
                breaker.onSuccess(elapsed, TimeUnit.NANOSECONDS);
            }
            return response;
        } catch (IOException e) {
            breaker.onError(System.nanoTime() - start, TimeUnit.NANOSECONDS, e);
            throw e;
        }
    }
}
