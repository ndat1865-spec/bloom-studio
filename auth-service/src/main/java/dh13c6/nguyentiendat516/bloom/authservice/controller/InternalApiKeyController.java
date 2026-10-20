package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyValidationResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.ValidateApiKeyRequest;
import dh13c6.nguyentiendat516.bloom.authservice.service.ApiKeyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API noi bo cho api-gateway hoi ve API Key. KHONG duoc khai route nao tro toi
 * /internal/** trong api-gateway/application.yml, neu khong doi tac ngoai se tu hoi
 * duoc va do tim key qua phan hoi.
 *
 * Giong /internal/** cua product-service: o do an nay duong dan chi duoc bao ve bang
 * viec khong lo qua Gateway. He thong that phai chan o tang mang, hoac ky request
 * giua cac service.
 */
@RestController
@RequestMapping("/internal/api-keys")
public class InternalApiKeyController {

    private final ApiKeyService apiKeyService;

    public InternalApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @PostMapping("/validate")
    public ApiKeyValidationResponse validate(@Valid @RequestBody ValidateApiKeyRequest request) {
        return apiKeyService.validate(request.key(), request.requiredScope());
    }
}
