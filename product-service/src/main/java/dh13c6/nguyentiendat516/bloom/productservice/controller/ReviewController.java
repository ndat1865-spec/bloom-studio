package dh13c6.nguyentiendat516.bloom.productservice.controller;

import dh13c6.nguyentiendat516.bloom.productservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewEligibility;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewRequest;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewResponse;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewSummary;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.VisibilityRequest;
import dh13c6.nguyentiendat516.bloom.productservice.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Danh gia san pham.
 *
 * - /products/{id}/reviews/...  : phia khach (xem cong khai, gui danh gia can dang nhap)
 * - /reviews/...                : phia ADMIN (duyet, an, xoa)
 *
 * Quyen tung duong dan khai o SecurityConfig. userId luon lay tu JWT.
 */
@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    // ===================== PHIA KHACH =====================

    @GetMapping("/products/{productId}/reviews")
    public PageResponse<ReviewResponse> listForProduct(
            @PathVariable Long productId,
            @PageableDefault(size = 5, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(reviewService.listVisible(productId, pageable), ReviewResponse::publicView);
    }

    @GetMapping("/products/{productId}/reviews/summary")
    public ReviewSummary summary(@PathVariable Long productId) {
        return reviewService.summary(productId);
    }

    @GetMapping("/products/{productId}/reviews/eligibility")
    public ReviewEligibility eligibility(Authentication authentication, @PathVariable Long productId) {
        return reviewService.eligibility(productId, currentUserId(authentication));
    }

    /** Tao moi hoac sua danh gia cua chinh minh (mot tai khoan - mot danh gia - mot san pham). */
    @PostMapping("/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> upsert(Authentication authentication,
                                                 @PathVariable Long productId,
                                                 @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(ReviewResponse.full(reviewService.upsert(
                productId, currentUserId(authentication), authentication.getName(), request)));
    }

    // ===================== PHIA ADMIN =====================

    /** hidden bo trong = tat ca; true = chi dang an; false = chi dang hien. */
    @GetMapping("/reviews")
    public PageResponse<ReviewResponse> listForAdmin(
            @RequestParam(required = false) Boolean hidden,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(reviewService.listForAdmin(hidden, pageable), ReviewResponse::full);
    }

    @PatchMapping("/reviews/{id}/visibility")
    public ReviewResponse setVisibility(@PathVariable Long id, @Valid @RequestBody VisibilityRequest request) {
        return ReviewResponse.full(reviewService.setHidden(id, request.hidden()));
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reviewService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** JwtAuthFilter dat userId vao o credentials cua Authentication. */
    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }
}
