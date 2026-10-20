package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import dh13c6.nguyentiendat516.bloom.orderservice.service.OrderService;
import dh13c6.nguyentiendat516.bloom.orderservice.shipping.ShippingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Giao hang GHN: danh muc dia gioi cho form thanh toan, xem truoc phi, webhook trang thai.
 *
 * Frontend KHONG goi thang GHN: token GHN la bi mat cua cua hang, lo ra trinh duyet la
 * ai cung tao van don duoc bang tai khoan cua cua hang.
 */
@RestController
@RequestMapping("/shipping")
public class ShippingController {

    private static final Logger log = LoggerFactory.getLogger(ShippingController.class);

    private final ShippingService shippingService;
    private final OrderService orderService;

    public ShippingController(ShippingService shippingService, OrderService orderService) {
        this.shippingService = shippingService;
        this.orderService = orderService;
    }

    public record FeeRequest(
            @NotNull(message = "Chọn quận/huyện") Integer districtId,
            @NotBlank(message = "Chọn phường/xã") String wardCode,
            @NotNull @Min(value = 1, message = "Số lượng tối thiểu là 1")
            @Max(value = 200, message = "Số lượng quá lớn") Integer itemCount) {
    }

    public record FeeResponse(double fee, String provider) {
    }

    @GetMapping("/provinces")
    public List<ShippingService.Place> provinces() {
        return shippingService.provinces();
    }

    @GetMapping("/districts")
    public List<ShippingService.Place> districts(@RequestParam Integer provinceId) {
        return shippingService.districts(provinceId);
    }

    @GetMapping("/wards")
    public List<ShippingService.Ward> wards(@RequestParam Integer districtId) {
        return shippingService.wards(districtId);
    }

    /**
     * Xem truoc phi GHN o trang thanh toan (can dang nhap - moi lan goi la mot lan hoi GHN).
     * Chi la XEM TRUOC: khi dat hang server hoi GHN lai tu dau.
     */
    @PostMapping("/fee")
    public FeeResponse fee(@Valid @RequestBody FeeRequest request) {
        return new FeeResponse(shippingService.quote(request.districtId(), request.wardCode().trim(),
                request.itemCount()), "GHN");
    }

    /**
     * GHN goi vao khi van don doi trang thai. GHN khong ky webhook nen KHONG tin noi dung:
     * chi lay ma van don roi tu hoi lai GHN. Luon tra 200 de GHN khong goi lai mai.
     */
    @PostMapping("/ghn/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> body) {
        Object code = body.get("OrderCode");
        if (code != null) {
            try {
                orderService.refreshShipmentByCode(String.valueOf(code));
            } catch (RuntimeException e) {
                log.warn("Webhook GHN cho vận đơn {} lỗi: {}", code, e.getMessage());
            }
        }
        return ResponseEntity.ok().build();
    }
}
