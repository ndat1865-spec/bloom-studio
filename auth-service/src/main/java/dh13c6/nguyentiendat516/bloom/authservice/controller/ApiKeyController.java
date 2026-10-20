package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyCreatedResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.CreateApiKeyRequest;
import dh13c6.nguyentiendat516.bloom.authservice.service.ApiKeyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Quan tri API Key cua doi tac. Toan bo /api-keys/** da duoc SecurityConfig gioi han
 * cho ROLE_ADMIN - khong kiem tra lai bang tay trong controller.
 */
@RestController
@RequestMapping("/api-keys")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public ApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping
    public List<ApiKeyResponse> getAll() {
        return apiKeyService.getAll();
    }

    /** 201 kem key goc. Day la lan DUY NHAT key goc roi khoi he thong. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiKeyCreatedResponse create(@Valid @RequestBody CreateApiKeyRequest request) {
        return apiKeyService.create(request);
    }

    /** Thu hoi: khoa ngung hieu luc nhung van con trong danh sach de truy vet. */
    @PostMapping("/{id}/revoke")
    public ApiKeyResponse revoke(@PathVariable Long id) {
        return apiKeyService.revoke(id);
    }

    public record RateLimitRequest(
            @NotNull(message = "Nhập giới hạn")
            @Min(value = 1, message = "Giới hạn tối thiểu 1 request/phút")
            @Max(value = 10000, message = "Giới hạn tối đa 10.000 request/phút")
            Integer rateLimitPerMinute) {
    }

    /** Doi so request/phut cua mot khoa. */
    @PatchMapping("/{id}/rate-limit")
    public ApiKeyResponse updateRateLimit(@PathVariable Long id, @Valid @RequestBody RateLimitRequest request) {
        return apiKeyService.updateRateLimit(id, request.rateLimitPerMinute());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        apiKeyService.delete(id);
    }
}
