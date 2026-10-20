package dh13c6.nguyentiendat516.bloom.paymentservice.client;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.ServiceUnavailableException;
import dh13c6.nguyentiendat516.bloom.paymentservice.resilience.CircuitOpenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Goi API noi bo cua order-service.
 *
 * Chieu phu thuoc chi MOT huong: payment-service -> order-service. order-service khong
 * goi nguoc lai; giao dich treo do chinh payment-service tu doi soat (PaymentReconciler).
 */
@Component
public class OrderClient {

    private static final Logger log = LoggerFactory.getLogger(OrderClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public OrderClient(RestTemplate restTemplate, @Value("${order-service.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    public OrderSnapshot getOrder(Long orderId) {
        try {
            OrderSnapshot order = restTemplate.getForObject(baseUrl + "/internal/orders/" + orderId,
                    OrderSnapshot.class);
            if (order == null) {
                throw new NotFoundException("Không tìm thấy đơn hàng id = " + orderId);
            }
            return order;
        } catch (HttpClientErrorException.NotFound e) {
            throw new NotFoundException("Không tìm thấy đơn hàng id = " + orderId);
        } catch (RestClientException e) {
            log.error("Không gọi được order-service: {}", e.getMessage());
            throw new ServiceUnavailableException(CircuitOpenException.messageOr(e,
                    "Không kết nối được order-service, vui lòng thử lại sau"));
        }
    }

    /**
     * Bao don da duoc thanh toan. order-service tu so khop so tien voi tong don cua no.
     * 409 = don khong nhan (da huy, da thanh toan bang giao dich khac, lech so tien).
     */
    public void markPaid(Long orderId, PaymentProvider provider, String txnRef, long amount) {
        try {
            restTemplate.postForObject(baseUrl + "/internal/orders/" + orderId + "/paid",
                    Map.of("provider", provider.name(), "txnRef", txnRef, "amount", amount), Map.class);
        } catch (HttpClientErrorException.Conflict | HttpClientErrorException.NotFound e) {
            throw new ConflictException(messageOf(e));
        } catch (RestClientException e) {
            log.error("Không báo được order-service đơn {} đã thanh toán: {}", orderId, e.getMessage());
            throw new ServiceUnavailableException("Không kết nối được order-service");
        }
    }

    /**
     * Bao don da duoc hoan tien. order-service chi doi trang thai khi txnRef dung la giao dich
     * da thanh toan don do; giao dich du (tra hai lan) thi don giu nguyen.
     */
    public void markRefunded(Long orderId, String txnRef) {
        try {
            restTemplate.postForObject(baseUrl + "/internal/orders/" + orderId + "/refunded",
                    Map.of("txnRef", txnRef), Map.class);
        } catch (HttpClientErrorException e) {
            // Don khong con (404) hay khong khop: khong co gi de cap nhat - khong thu lai
            log.warn("order-service không nhận thông báo hoàn tiền đơn {}: {}", orderId, messageOf(e));
        } catch (RestClientException e) {
            log.error("Không báo được order-service đơn {} đã hoàn tiền: {}", orderId, e.getMessage());
            throw new ServiceUnavailableException("Không kết nối được order-service");
        }
    }

    private static String messageOf(HttpClientErrorException e) {
        try {
            Map<?, ?> body = e.getResponseBodyAs(Map.class);
            if (body != null && body.get("message") != null) {
                return String.valueOf(body.get("message"));
            }
        } catch (RuntimeException ignored) {
            // body khong phai JSON - dung ma trang thai
        }
        return "order-service từ chối (" + e.getStatusCode() + ")";
    }
}
