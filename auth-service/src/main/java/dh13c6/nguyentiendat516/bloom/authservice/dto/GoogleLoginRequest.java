package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.NotBlank;

/** Body cua POST /auth/google va POST /auth/me/google: ID token Google tra cho trinh duyet. */
public record GoogleLoginRequest(
        @NotBlank(message = "Thiếu mã xác thực Google")
        String credential
) {
}
