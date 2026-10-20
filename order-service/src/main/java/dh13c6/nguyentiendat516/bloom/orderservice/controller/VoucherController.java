package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.ClaimResponse;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.HuntVoucher;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.PublicVoucher;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.VoucherCheckRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.VoucherCheckResponse;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.VoucherRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.VoucherResponse;
import dh13c6.nguyentiendat516.bloom.orderservice.service.VoucherService;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Ma giam gia. Quyen tung duong dan khai o SecurityConfig:
 *  - GET  /vouchers/public : ai cung xem duoc (goi y o trang thanh toan)
 *  - GET  /vouchers/hunt   : ai cung xem duoc (trang San voucher); co JWT thi biet ma nao da luu
 *  - POST /vouchers/{code}/claim : can dang nhap (luu ma san vao vi)
 *  - POST /vouchers/check  : can dang nhap (quy tac "moi tai khoan mot lan" can biet la ai)
 *  - con lai               : chi ADMIN
 */
@RestController
@RequestMapping("/vouchers")
public class VoucherController {

    private final VoucherService voucherService;

    public VoucherController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    @GetMapping("/public")
    public List<PublicVoucher> usableNow() {
        return voucherService.listUsableNow().stream().map(PublicVoucher::from).toList();
    }

    /**
     * Trang San voucher. Duong dan mo cho ca khach chua dang nhap; JwtAuthFilter van doc token
     * neu co gui kem, nen khach da dang nhap thay dung ma nao minh da luu.
     */
    @GetMapping("/hunt")
    public List<HuntVoucher> hunt(Authentication authentication) {
        return voucherService.hunt(currentUserIdOrNull(authentication));
    }

    /** Luu ma san vao vi. Bam lai ma da luu tra 200 voi alreadyClaimed = true, khong bao loi. */
    @PostMapping("/{code}/claim")
    public ClaimResponse claim(Authentication authentication, @PathVariable String code) {
        try {
            VoucherService.ClaimResult result = voucherService.claim(code, (Long) authentication.getCredentials());
            return new ClaimResponse(result.voucher().getCode(), result.alreadyClaimed(), result.claimedPercent());
        } catch (DataIntegrityViolationException e) {
            // Hai request Luu cung luc cua CUNG mot khach: request sau dung rang buoc unique,
            // transaction cua no da rollback (khong cong luot) - voi khach thi ma van da luu
            return new ClaimResponse(code.trim().toUpperCase(java.util.Locale.ROOT), true, null);
        }
    }

    /**
     * Duong dan permitAll: chua dang nhap thi Spring dat AnonymousAuthenticationToken (credentials
     * la chuoi rong) chu khong phai null - chi tin token do JwtAuthFilter dat.
     */
    private static Long currentUserIdOrNull(Authentication authentication) {
        if (authentication instanceof UsernamePasswordAuthenticationToken
                && authentication.getCredentials() instanceof Long userId) {
            return userId;
        }
        return null;
    }

    /**
     * Vi ma cua toi: ma chung dang chay + ma rieng cua toi, kem danh gia cho don `amount`
     * (bo trong = chi xem con dung duoc khong). Dung cho trang "Ma giam gia cua toi" va popup
     * chon ma o trang dat hoa.
     */
    @GetMapping("/mine")
    public List<VoucherDtos.MyVoucher> mine(Authentication authentication,
                                           @RequestParam(required = false) Double amount) {
        return voucherService.wallet((Long) authentication.getCredentials(), amount).stream()
                .map(a -> new VoucherDtos.MyVoucher(a.voucher().getCode(), a.voucher().getDescription(),
                        a.voucher().getType().name(), a.voucher().getValue(), a.voucher().getMaxDiscount(),
                        a.voucher().getMinOrderValue(), a.voucher().getStartDate(), a.voucher().getEndDate(),
                        a.voucher().isPersonal(), a.status(), a.reason(), a.discount()))
                .toList();
    }

    /** Xem truoc so tien giam. Khong ghi gi xuong CSDL, khong tru luot dung. */
    @PostMapping("/check")
    public VoucherCheckResponse check(Authentication authentication,
                                      @Valid @RequestBody VoucherCheckRequest request) {
        VoucherService.Quote quote = voucherService.evaluate(
                request.code(), request.amount(), (Long) authentication.getCredentials());
        return new VoucherCheckResponse(quote.voucher().getCode(), quote.voucher().getDescription(),
                quote.discount());
    }

    // ===================== ADMIN =====================

    @GetMapping
    public List<VoucherResponse> listAll() {
        return voucherService.listAll().stream().map(VoucherResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VoucherResponse create(@Valid @RequestBody VoucherRequest request) {
        return VoucherResponse.from(voucherService.create(request));
    }

    @PutMapping("/{id}")
    public VoucherResponse update(@PathVariable Long id, @Valid @RequestBody VoucherRequest request) {
        return VoucherResponse.from(voucherService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        voucherService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
