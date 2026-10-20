package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body cua POST /users - ADMIN tao tai khoan noi bo (nhan vien hoac ADMIN khac).
 *
 * Khach hang tu dang ky qua /auth/register nen role o day chi nhan STAFF hoac ADMIN.
 */
public record CreateStaffRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 100, message = "Tên đăng nhập cần 3 đến 100 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch")
        String username,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 255, message = "Mật khẩu cần ít nhất 6 ký tự")
        String password,

        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @NotBlank(message = "Chọn quyền cho tài khoản")
        @Pattern(regexp = "STAFF|ADMIN", message = "Quyền phải là STAFF hoặc ADMIN")
        String role
) {
}
