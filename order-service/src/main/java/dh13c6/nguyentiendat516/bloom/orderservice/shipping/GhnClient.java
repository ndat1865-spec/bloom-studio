package dh13c6.nguyentiendat516.bloom.orderservice.shipping;

import dh13c6.nguyentiendat516.bloom.orderservice.exception.ServiceUnavailableException;
import dh13c6.nguyentiendat516.bloom.orderservice.resilience.CircuitOpenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Goi API cua Giao Hang Nhanh (GHN).
 *
 * Moi API deu tra {code, message, data}. Hai header xac thuc: Token (tai khoan) va ShopId
 * (cua hang - quyet dinh dia chi lay hang, nen khong phai gui dia chi kho moi lan).
 *
 * Tai lieu: https://api.ghn.vn/home/docs/detail
 */
@Component
public class GhnClient {

    private static final Logger log = LoggerFactory.getLogger(GhnClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String token;
    private final String shopId;

    public GhnClient(RestTemplate restTemplate,
                     @Value("${ghn.base-url}") String baseUrl,
                     @Value("${ghn.token}") String token,
                     @Value("${ghn.shop-id}") String shopId) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
        this.token = token.trim();
        this.shopId = shopId.trim();
    }

    /** Chua khai token/shop -> dung phi giao hang co dinh, dia chi go tu do nhu truoc. */
    public boolean isConfigured() {
        return !token.isEmpty() && !shopId.isEmpty();
    }

    public List<Map<String, Object>> provinces() {
        return list(call(HttpMethod.GET, "/master-data/province", null, false));
    }

    public List<Map<String, Object>> districts(int provinceId) {
        return list(call(HttpMethod.POST, "/master-data/district", Map.of("province_id", provinceId), false));
    }

    public List<Map<String, Object>> wards(int districtId) {
        return list(call(HttpMethod.POST, "/master-data/ward?district_id=" + districtId,
                Map.of("district_id", districtId), false));
    }

    /** Tinh phi. Tra ve data cua GHN (co truong total). */
    public Map<String, Object> fee(Map<String, Object> body) {
        return map(call(HttpMethod.POST, "/v2/shipping-order/fee", body, true));
    }

    /** Tao van don. Tra ve data (order_code, expected_delivery_time, total_fee...). */
    public Map<String, Object> createOrder(Map<String, Object> body) {
        return map(call(HttpMethod.POST, "/v2/shipping-order/create", body, true));
    }

    public Map<String, Object> detail(String orderCode) {
        return map(call(HttpMethod.POST, "/v2/shipping-order/detail", Map.of("order_code", orderCode), true));
    }

    /** Huy van don. GHN chi cho huy khi chua lay hang. */
    public List<Map<String, Object>> cancel(String orderCode) {
        return list(call(HttpMethod.POST, "/v2/switch-status/cancel", Map.of("order_codes", List.of(orderCode)), true));
    }

    // ===================== HO TRO =====================

    /**
     * withShop: chi API van don / tinh phi moi can ShopId. Danh muc dia gioi gui kem ShopId
     * sai thi GHN tu choi ca danh muc ("Loi lay thong tin shop") - khong gui cho chac.
     */
    private Object call(HttpMethod method, String path, Object body, boolean withShop) {
        if (!isConfigured()) {
            throw new ServiceUnavailableException("Chưa cấu hình Giao Hàng Nhanh (GHN_TOKEN, GHN_SHOP_ID)");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Token", token);
        if (withShop) {
            headers.set("ShopId", shopId);
        }
        try {
            Map<?, ?> response = restTemplate.exchange(baseUrl + path, method, new HttpEntity<>(body, headers),
                    Map.class).getBody();
            if (response == null) {
                throw new GhnException("GHN không trả lời");
            }
            return response.get("data");
        } catch (HttpStatusCodeException e) {
            // GHN bao loi nghiep vu bang 400 kem {code, message, code_message_value}
            String message = messageOf(e);
            log.warn("GHN {} {} -> {} {}", method, path, e.getStatusCode(), message);
            throw new GhnException(message);
        } catch (RestClientException e) {
            log.error("Không kết nối được GHN tại {}", path, e);
            throw new ServiceUnavailableException(CircuitOpenException.messageOr(e,
                    "Không kết nối được Giao Hàng Nhanh, vui lòng thử lại sau"));
        }
    }

    private static String messageOf(HttpStatusCodeException e) {
        try {
            Map<?, ?> body = e.getResponseBodyAs(Map.class);
            if (body != null) {
                Object detail = body.get("code_message_value");
                Object message = body.get("message");
                if (detail != null && !String.valueOf(detail).isBlank()) {
                    return "GHN: " + detail;
                }
                if (message != null) {
                    return "GHN: " + message;
                }
            }
        } catch (RuntimeException ignored) {
            // body khong phai JSON
        }
        return "GHN từ chối yêu cầu (" + e.getStatusCode() + ")";
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(Object data) {
        return data instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object data) {
        if (data instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        throw new GhnException("GHN trả dữ liệu không đúng định dạng");
    }
}
