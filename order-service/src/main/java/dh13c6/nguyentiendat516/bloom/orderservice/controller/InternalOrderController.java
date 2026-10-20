package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentMethod;
import dh13c6.nguyentiendat516.bloom.orderservice.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

/**
 * API noi bo - CHI danh cho service khac goi truc tiep vao localhost:8083.
 *   - product-service: hoi "khach da nhan hang chua" truoc khi cho danh gia.
 *   - payment-service: doc so tien that cua don, bao don da duoc thanh toan.
 *
 * Giong /internal/products/** ben product-service: route nay co tinh KHONG khai trong
 * api-gateway nen frontend va doi tac ngoai khong goi toi duoc. Gioi han da biet: day
 * la bao mat dua tren viec khong dinh tuyen, ai vao duoc mang noi bo van goi duoc.
 */
@RestController
@RequestMapping("/internal/orders")
public class InternalOrderController {

    private final OrderService orderService;

    public InternalOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    public record PurchaseCheck(boolean delivered) {
    }

    /** Nhung gi payment-service can - khong lo dia chi, so dien thoai cua khach. */
    public record PaymentView(Long id, String code, Long userId, Double total, String status,
                              String paymentMethod, String paymentStatus) {
        static PaymentView from(Order o) {
            return new PaymentView(o.getId(), o.getCode(), o.getUserId(), o.getTotal(), o.getStatus().name(),
                    o.effectivePaymentMethod().name(), o.effectivePaymentStatus().name());
        }
    }

    public record PaidRequest(
            @NotNull PaymentMethod provider,
            @NotBlank String txnRef,
            @NotNull Long amount) {
    }

    public record RefundedRequest(@NotBlank String txnRef) {
    }

    /** payment-service bao da hoan tien qua API cua cong thanh toan. */
    @PostMapping("/{id}/refunded")
    public PaymentView refunded(@PathVariable Long id, @Valid @RequestBody RefundedRequest request) {
        return PaymentView.from(orderService.markRefunded(id, request.txnRef()));
    }

    /** product-service hoi truoc khi cho khach danh gia san pham. */
    @GetMapping("/purchase-check")
    public PurchaseCheck purchaseCheck(@RequestParam Long userId, @RequestParam Long productId) {
        return new PurchaseCheck(orderService.hasDeliveredPurchase(userId, productId));
    }

    /** payment-service doc tong tien THAT va chu don truoc khi tao link thanh toan. */
    @GetMapping("/{id}")
    public PaymentView get(@PathVariable Long id) {
        return PaymentView.from(orderService.getOrderById(id));
    }

    /** payment-service bao don da thanh toan (sau khi da kiem chu ky cua cong thanh toan). */
    @PostMapping("/{id}/paid")
    public PaymentView paid(@PathVariable Long id, @Valid @RequestBody PaidRequest request) {
        return PaymentView.from(orderService.markPaid(id, request.provider(), request.txnRef(), request.amount()));
    }
}
