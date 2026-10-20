package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.CustomRequestDtos;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequestStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.service.CustomRequestService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Dat hoa theo yeu cau.
 *
 * Khach: gui yeu cau, dinh kem anh mau, xem / huy yeu cau cua minh.
 * Studio (ADMIN, STAFF - khai o SecurityConfig): xem tat ca, bao gia, tu choi.
 * userId luon lay tu JWT.
 */
@RestController
@RequestMapping("/custom-requests")
public class CustomRequestController {

    private final CustomRequestService service;

    public CustomRequestController(CustomRequestService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomRequestDtos.Response create(Authentication authentication,
                                             @Valid @RequestBody CustomRequestDtos.CreateRequest body) {
        return CustomRequestDtos.Response.from(
                service.create(currentUserId(authentication), authentication.getName(), body));
    }

    @PostMapping("/{id}/reference-image")
    public CustomRequestDtos.Response uploadReference(Authentication authentication, @PathVariable Long id,
                                                      @RequestParam("file") MultipartFile file) {
        return CustomRequestDtos.Response.from(service.attachReference(id, currentUserId(authentication), file));
    }

    @GetMapping("/my")
    public PageResponse<CustomRequestDtos.Response> mine(Authentication authentication, Pageable pageable) {
        return PageResponse.from(service.mine(currentUserId(authentication), pageable),
                CustomRequestDtos.Response::from);
    }

    /** Tat ca yeu cau, loc theo trang thai - chi studio. */
    @GetMapping
    public PageResponse<CustomRequestDtos.Response> all(@RequestParam(required = false) CustomRequestStatus status,
                                                        Pageable pageable) {
        return PageResponse.from(service.all(status, pageable), CustomRequestDtos.Response::from);
    }

    @GetMapping("/{id}")
    public CustomRequestDtos.Response getById(Authentication authentication, @PathVariable Long id) {
        CustomRequest request = isStaff(authentication)
                ? service.get(id)
                : service.getOwned(id, currentUserId(authentication));
        return CustomRequestDtos.Response.from(request);
    }

    @PutMapping("/{id}/quote")
    public CustomRequestDtos.Response quote(Authentication authentication, @PathVariable Long id,
                                            @Valid @RequestBody CustomRequestDtos.QuoteRequest body) {
        return CustomRequestDtos.Response.from(service.quote(id, body, authentication.getName()));
    }

    @PutMapping("/{id}/reject")
    public CustomRequestDtos.Response reject(Authentication authentication, @PathVariable Long id,
                                             @Valid @RequestBody CustomRequestDtos.RejectRequest body) {
        return CustomRequestDtos.Response.from(service.reject(id, body, authentication.getName()));
    }

    /** Khach huy yeu cau cua minh (chua dat hang). */
    @DeleteMapping("/{id}")
    public CustomRequestDtos.Response cancel(Authentication authentication, @PathVariable Long id) {
        return CustomRequestDtos.Response.from(service.cancel(id, currentUserId(authentication)));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_STAFF".equals(a.getAuthority()));
    }
}
