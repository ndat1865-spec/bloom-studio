package dh13c6.nguyentiendat516.bloom.orderservice.client;

import dh13c6.nguyentiendat516.bloom.orderservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ServiceUnavailableException;
import dh13c6.nguyentiendat516.bloom.orderservice.resilience.CircuitOpenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

/**
 * Goi sang API noi bo cua product-service.
 *
 * Day la diem giao tiep DUY NHAT giua hai service nghiep vu. Trong ban monolith, doan
 * nay chi la productRepository.findById(...) - mot loi goi ham trong cung tien trinh.
 * Sau khi tach, no tro thanh loi goi mang, keo theo phai xu ly: san pham khong ton tai,
 * het hang, va ca truong hop service kia khong phan hoi.
 */
@Component
public class ProductClient {

    private static final Logger log = LoggerFactory.getLogger(ProductClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public ProductClient(RestTemplate restTemplate,
                         @Value("${product-service.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    /**
     * Tru ton kho va lay ve thong tin san pham trong CUNG MOT loi goi.
     *
     * Gop lai mot loi goi thay vi hai (mot de doc gia, mot de tru kho) vua nhanh hon,
     * vua tranh duoc khe hop giua hai lan goi ma gia hoac ton kho co the thay doi.
     */
    public ProductSnapshot reserveStock(Long productId, int quantity) {
        return call(productId, quantity, "reserve-stock");
    }

    /** Hoan tra ton kho khi huy don, hoac khi mot dong khac trong cung don bi loi. */
    public void releaseStock(Long productId, int quantity) {
        call(productId, quantity, "release-stock");
    }

    private ProductSnapshot call(Long productId, int quantity, String action) {
        String url = baseUrl + "/internal/products/" + productId + "/" + action
                + "?quantity=" + quantity;
        try {
            return restTemplate.patchForObject(url, null, ProductSnapshot.class);

        } catch (HttpClientErrorException.NotFound ex) {
            throw new NotFoundException("Không tìm thấy sản phẩm id = " + productId);

        } catch (HttpClientErrorException.Conflict ex) {
            // product-service da phat hien het hang - chuyen tiep nguyen van y nghia
            throw new ConflictException("Sản phẩm id = " + productId + " không đủ hàng");

        } catch (HttpClientErrorException ex) {
            throw new ConflictException("product-service từ chối yêu cầu: " + ex.getStatusCode());

        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof CircuitOpenException open) {
                // Mach dang mo: tu choi ngay, khong doi timeout
                throw new ServiceUnavailableException(open.getMessage());
            }
            // product-service tat han hoac qua timeout
            log.error("Không kết nối được product-service tại {}", url, ex);
            throw new ConflictException("Không thể kết nối tới product-service, vui lòng thử lại sau");
        }
    }
}
