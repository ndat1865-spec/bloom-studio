package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Gateway hoi: key nay con dung duoc khong, va co scope nay khong.
 *
 * Dung POST chu khong phai GET ?key=... vi query string bi ghi vao access log cua
 * moi tang di qua - key se nam lai trong log duoi dang ro.
 */
public record ValidateApiKeyRequest(
        @NotBlank(message = "Thiếu khoá cần kiểm tra")
        String key,

        String requiredScope
) {
}
