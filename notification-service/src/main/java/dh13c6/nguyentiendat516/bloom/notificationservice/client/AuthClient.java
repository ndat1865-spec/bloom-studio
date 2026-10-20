package dh13c6.nguyentiendat516.bloom.notificationservice.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Optional;

/**
 * Hoi auth-service email cua khach (GET /internal/users/{id}/contact).
 *
 * Email khong nam trong su kien vi no la du lieu cua auth-service: khach doi email hom nay
 * thi thu gui ngay sau do phai toi email moi, khong phai email luc dat hang.
 */
@Component
public class AuthClient {

    private static final Logger log = LoggerFactory.getLogger(AuthClient.class);

    public record Contact(Long id, String username, String email, String displayName) {
    }

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AuthClient(@Value("${auth-service.base-url}") String baseUrl) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restTemplate = new RestTemplate(factory);
        this.baseUrl = baseUrl;
    }

    /** Rong neu tai khoan khong con. Loi mang thi nem ra de ben goi ghi FAILED. */
    public Optional<Contact> contact(Long userId) {
        try {
            return Optional.ofNullable(restTemplate.getForObject(baseUrl + "/internal/users/" + userId + "/contact",
                    Contact.class));
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Tài khoản {} không còn tồn tại", userId);
            return Optional.empty();
        }
    }
}
