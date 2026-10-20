package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * SOS08 (phan tu nghien cuu) - Body cua POST /api/users/register.
 *
 * KHONG co truong role: endpoint dang ky luon tao tai khoan CUSTOMER.
 * Muon tao ADMIN thi dung POST /api/users hoac sua truc tiep trong CSDL.
 */
public record RegisterRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 100, message = "Tên đăng nhập cần 3 đến 100 ký tự")
        String username,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 255, message = "Mật khẩu cần ít nhất 6 ký tự")
        String password
) {
}
