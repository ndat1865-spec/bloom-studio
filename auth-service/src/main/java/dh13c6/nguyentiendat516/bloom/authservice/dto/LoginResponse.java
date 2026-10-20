package dh13c6.nguyentiendat516.bloom.authservice.dto;

/**
 * Tra ve sau khi dang nhap thanh cong.
 *
 * userId duoc tra rieng ra ngoai token de frontend dung ngay, khoi phai giai ma JWT
 * o phia client.
 */
public record LoginResponse(
        Long userId,
        String token,
        String username,
        String role
) {
}
