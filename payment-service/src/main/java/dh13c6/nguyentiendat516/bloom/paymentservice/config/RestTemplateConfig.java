package dh13c6.nguyentiendat516.bloom.paymentservice.config;

import dh13c6.nguyentiendat516.bloom.paymentservice.resilience.CircuitBreakerInterceptor;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * RestTemplate dung chung de goi order-service va ba cong thanh toan.
 *
 * Timeout tuong minh: mac dinh RestTemplate cho vo han, cong thanh toan cham la giu
 * thread mai mai.
 *
 * Ket noi 30 giay: da do that, qua mot so mang (VPN, Cloudflare WARP) rieng buoc mo ket noi
 * TCP toi sandbox.vnpayment.vn mat ~20 giay. Read timeout cua JdkClientHttpRequestFactory tinh GOP
 * ca buoc ket noi, nen phai lon hon han 20 giay (45) - de 15 giay thi moi lan truy van VNPay
 * deu that bai.
 *
 * Circuit breaker (CircuitBreakerInterceptor): cong thanh toan / order-service chet han thi
 * tu choi ngay thay vi moi request deu doi toi 45 giay.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(CircuitBreakerRegistry circuitBreakers) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(45));
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.getInterceptors().add(new CircuitBreakerInterceptor(circuitBreakers));
        return restTemplate;
    }
}
