package dh13c6.nguyentiendat516.bloom.chatservice.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.Map;

/**
 * Doc du lieu cua cua hang cho tro ly AI - qua API cua product-service va order-service,
 * KHONG doc CSDL cua ho (moi service mot CSDL rieng).
 *
 * Don hang cua khach: chuyen tiep NGUYEN JWT cua khach sang order-service (GET /orders/my).
 * chat-service khong tu dat userId, nen AI khong the doc don cua nguoi khac du khach co
 * "ra lenh" cho no the nao di nua.
 */
@Component
public class ShopDataClient {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP =
            new ParameterizedTypeReference<>() {
            };

    private final RestTemplate restTemplate;
    private final String productBaseUrl;
    private final String orderBaseUrl;

    public ShopDataClient(@Value("${product-service.base-url}") String productBaseUrl,
                          @Value("${order-service.base-url}") String orderBaseUrl) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restTemplate = new RestTemplate(factory);
        this.productBaseUrl = productBaseUrl;
        this.orderBaseUrl = orderBaseUrl;
    }

    /** GET /products (public) - loc theo dip, mau, khoang gia, tu khoa. */
    public Map<String, Object> searchProducts(String occasion, String color, Number minPrice, Number maxPrice,
                                              String keyword, int size) {
        return searchProducts(occasion, color, minPrice, maxPrice, keyword, 0, size);
    }

    public Map<String, Object> searchProducts(String occasion, String color, Number minPrice, Number maxPrice,
                                              String keyword, int page, int size) {
        String url = UriComponentsBuilder.fromUriString(productBaseUrl + "/products")
                .queryParamIfPresent("occasion", java.util.Optional.ofNullable(blankToNull(occasion)))
                .queryParamIfPresent("color", java.util.Optional.ofNullable(blankToNull(color)))
                .queryParamIfPresent("minPrice", java.util.Optional.ofNullable(minPrice))
                .queryParamIfPresent("maxPrice", java.util.Optional.ofNullable(maxPrice))
                .queryParamIfPresent("name", java.util.Optional.ofNullable(blankToNull(keyword)))
                .queryParam("page", page)
                .queryParam("size", size)
                .build()
                .toUriString();
        return get(url, null);
    }

    /** GET /products/{id} (public). */
    public Map<String, Object> product(long id) {
        return get(productBaseUrl + "/products/" + id, null);
    }

    /** GET /orders/options (public) - gio chot don, vung giao, khung gio, thiep, qua kem. */
    public Map<String, Object> orderOptions() {
        return get(orderBaseUrl + "/orders/options", null);
    }

    /** GET /orders/my bang JWT cua chinh khach. */
    public Map<String, Object> myOrders(String bearerToken, int size) {
        return get(orderBaseUrl + "/orders/my?page=0&size=" + size, bearerToken);
    }

    private Map<String, Object> get(String url, String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        if (bearerToken != null) {
            headers.set(HttpHeaders.AUTHORIZATION, bearerToken);
        }
        return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), MAP).getBody();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
