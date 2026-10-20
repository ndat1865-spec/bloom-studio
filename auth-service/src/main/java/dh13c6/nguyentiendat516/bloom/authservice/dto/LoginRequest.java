package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.NotBlank;

/** SOS08 - Body cua POST /api/users/login. */
public record LoginRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống") String username,
        @NotBlank(message = "Mật khẩu không được để trống") String password
) {
}
