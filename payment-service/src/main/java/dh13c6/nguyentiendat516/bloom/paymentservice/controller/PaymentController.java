package dh13c6.nguyentiendat516.bloom.paymentservice.controller;

import dh13c6.nguyentiendat516.bloom.paymentservice.dto.CreatePaymentRequest;
import dh13c6.nguyentiendat516.bloom.paymentservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.paymentservice.dto.PaymentMethodResponse;
import dh13c6.nguyentiendat516.bloom.paymentservice.dto.PaymentResponse;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.paymentservice.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Thanh toan truc tuyen.
 *
 * Luong chuan:
 *   1. Khach dat don (order-service) -> 2. POST /payments lay payUrl -> 3. trinh duyet sang
 *   cong thanh toan -> 4. cong dua khach ve /payment/result cua frontend -> 5. frontend
 *   chuyen nguyen bo tham so len POST /payments/return -> kiem chu ky -> bao order-service.
 */
@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /** Cong dang bat - ai cung xem duoc (khai o SecurityConfig). */
    @GetMapping("/methods")
    public List<PaymentMethodResponse> methods() {
        return paymentService.methods();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(Authentication authentication, HttpServletRequest http,
                                  @Valid @RequestBody CreatePaymentRequest request) {
        Payment payment = paymentService.create(currentUserId(authentication), request.orderId(),
                request.provider(), clientIp(http));
        return PaymentResponse.from(payment);
    }

    /**
     * Ket qua tu trang /payment/result. Cong khai: tin chu ky cua cong thanh toan chu khong
     * tin phien dang nhap - khach het phien trong luc tra tien van phai ghi nhan duoc.
     */
    @PostMapping("/return")
    public PaymentResponse confirmReturn(@RequestBody Map<String, String> params) {
        return PaymentResponse.from(paymentService.confirmReturn(params));
    }

    /** Cac giao dich cua mot don - chu don hoac ADMIN. */
    @GetMapping("/order/{orderId}")
    public List<PaymentResponse> byOrder(Authentication authentication, @PathVariable Long orderId) {
        boolean admin = isAdmin(authentication);
        Long userId = currentUserId(authentication);
        return paymentService.listByOrder(orderId).stream()
                .filter(p -> admin || (userId != null && userId.equals(p.getUserId())))
                .map(PaymentResponse::from)
                .toList();
    }

    /** Hoi lai cong thanh toan trang thai mot giao dich dang treo. */
    @PostMapping("/{id}/refresh")
    public PaymentResponse refresh(Authentication authentication, @PathVariable Long id) {
        Payment payment = paymentService.get(id);
        Long userId = currentUserId(authentication);
        if (!isAdmin(authentication) && (userId == null || !userId.equals(payment.getUserId()))) {
            throw new NotFoundException("Không tìm thấy giao dịch id = " + id);
        }
        return PaymentResponse.from(paymentService.refresh(payment));
    }

    public record RefundRequest(@Size(max = 100, message = "Lý do tối đa 100 ký tự") String reason) {
    }

    /**
     * Hoan tien qua API cua cong - chi ADMIN, khai o SecurityConfig. Body tuy chon.
     * Cong tu choi -> 502 kem ly do cua cong.
     */
    @PostMapping("/{id}/refund")
    public PaymentResponse refund(@PathVariable Long id, @Valid @RequestBody(required = false) RefundRequest request) {
        String reason = request == null || request.reason() == null || request.reason().isBlank()
                ? null : request.reason().trim();
        return PaymentResponse.from(paymentService.refund(id, reason));
    }

    /** Toan bo giao dich - chi ADMIN, khai o SecurityConfig. */
    @GetMapping
    public PageResponse<PaymentResponse> listAll(Pageable pageable) {
        return PageResponse.from(paymentService.listAll(pageable), PaymentResponse::from);
    }

    // ===================== HO TRO =====================

    /** JwtAuthFilter dat userId vao o credentials cua Authentication. */
    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }

    /** ADMIN hoac nhan vien: xem va xu ly giao dich cua moi don. */
    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_STAFF".equals(a.getAuthority()));
    }

    /**
     * IP cua khach (VNPay bat buoc). Di qua Gateway thi IP that nam trong X-Forwarded-For,
     * remoteAddr chi la IP cua Gateway.
     */
    private static String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : http.getRemoteAddr();
        return ip == null || ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1") ? "127.0.0.1" : ip;
    }
}
