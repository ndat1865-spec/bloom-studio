package dh13c6.nguyentiendat516.bloom.productservice.client;

import dh13c6.nguyentiendat516.bloom.productservice.exception.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Goi sang API noi bo cua order-service de hoi: khach nay da NHAN duoc san pham nay chua?
 *
 * Day la luong goi thu hai giua hai service nghiep vu, nguoc chieu voi luong tru ton kho
 * (order -> product). product-service khong duoc doc bang orders cua order-service,
 * nen muon biet "da mua" thi phai hoi chu so huu du lieu do.
 */
@Component
public class OrderClient {

    private static final Logger log = LoggerFactory.getLogger(OrderClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public OrderClient(RestTemplate restTemplate,
                       @Value("${order-service.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    /** Phan hoi cua GET /internal/orders/purchase-check. */
    public record PurchaseCheck(boolean delivered) {
    }

    /**
     * true neu user co it nhat mot don DA GIAO chua san pham nay.
     *
     * order-service chet thi KHONG mac dinh cho qua: nem 503 de client biet la tam thoi
     * khong kiem tra duoc, thay vi am tham cho ai cung danh gia duoc.
     */
    public boolean hasDeliveredPurchase(Long userId, Long productId) {
        String url = baseUrl + "/internal/orders/purchase-check?userId=" + userId + "&productId=" + productId;
        try {
            PurchaseCheck result = restTemplate.getForObject(url, PurchaseCheck.class);
            return result != null && result.delivered();
        } catch (RestClientException ex) {
            log.error("Không hỏi được order-service tại {}", url, ex);
            throw new ServiceUnavailableException(
                    "Tạm thời không kiểm tra được lịch sử mua hàng, vui lòng thử lại sau");
        }
    }
}
