package dh13c6.nguyentiendat516.bloom.orderservice.config;

import dh13c6.nguyentiendat516.bloom.orderservice.resilience.CircuitBreakerInterceptor;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * RestTemplate dung de goi sang product-service.
 *
 * HAI DIEM BAT BUOC:
 *
 * 1. JdkClientHttpRequestFactory chu KHONG de mac dinh. SimpleClientHttpRequestFactory
 *    dua tren HttpURLConnection khong ho tro HTTP method PATCH - ma reserve-stock va
 *    release-stock deu la PATCH. De mac dinh se gap ProtocolException: Invalid HTTP
 *    method: PATCH.
 *
 * 2. Timeout tuong minh. RestTemplate mac dinh cho VO HAN - neu product-service khong
 *    chet han ma chi phan hoi rat cham, order-service se giu thread cho mai, keo theo
 *    ca he thong cham dan (cascading failure).
 *
 * 3. Circuit breaker (CircuitBreakerInterceptor): timeout chi gioi han MOT loi goi. May dich
 *    chet han thi request nao cung van doi het 5 giay; breaker mo mach de tu choi ngay.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(CircuitBreakerRegistry circuitBreakers) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(5));
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.getInterceptors().add(new CircuitBreakerInterceptor(circuitBreakers));
        return restTemplate;
    }
}
