package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * PHAN MO RONG ngoai SOS01-SOS10: body cua PUT /api/users/{id}/profile.
 *
 * Moi truong deu KHONG bat buoc — nguoi dung co the chi luu ho ten, hoac chi luu dia chi.
 * Khong co username/password/role o day: doi mat khau va doi quyen la luong rieng.
 */
public record UpdateProfileRequest(
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @Email(message = "Email không đúng định dạng")
        @Size(max = 150, message = "Email tối đa 150 ký tự")
        String email,

        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
        String address,

        @Size(max = 60, message = "Quận / thành phố tối đa 60 ký tự")
        String city,

        // Dia chi GHN. wardCode quyet dinh: null = giu nguyen, chuoi rong = xoa ca bo,
        // co gia tri = luu ca bo (khi do bat buoc co provinceId + districtId).
        @Positive(message = "Mã tỉnh/thành không hợp lệ")
        Integer provinceId,

        @Positive(message = "Mã quận/huyện không hợp lệ")
        Integer districtId,

        @Size(max = 20, message = "Mã phường/xã tối đa 20 ký tự")
        String wardCode,

        @Size(max = 200, message = "Tên khu vực tối đa 200 ký tự")
        String areaLabel
) {
}
