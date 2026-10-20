package dh13c6.nguyentiendat516.bloom.authservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Yeu cau cap key moi. Key do server sinh ra - client KHONG duoc tu chon gia tri key,
 * neu khong doi tac se dat mot chuoi de doan.
 *
 * daysValid de trong = key khong het han (tien cho demo, khong nen dung that).
 */
public record CreateApiKeyRequest(
        @NotBlank(message = "Tên đối tác không được để trống")
        @Size(max = 100, message = "Tên đối tác tối đa 100 ký tự")
        String ownerName,

        List<String> scopes,

        @Min(value = 1, message = "Số ngày hiệu lực tối thiểu là 1")
        @Max(value = 3650, message = "Số ngày hiệu lực tối đa là 3650")
        Integer daysValid,

        // De trong = 60 request/phut
        @Min(value = 1, message = "Giới hạn tối thiểu 1 request/phút")
        @Max(value = 10000, message = "Giới hạn tối đa 10.000 request/phút")
        Integer rateLimitPerMinute
) {
}
