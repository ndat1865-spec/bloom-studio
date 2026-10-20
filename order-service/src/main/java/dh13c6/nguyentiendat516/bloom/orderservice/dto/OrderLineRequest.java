package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Mot dong gio hang client gui len.
 *
 * Gia KHONG nam o day: server tu hoi gia tu product-service (theo co bo) hoac lay gia
 * cua hang da bao cho yeu cau dat hoa, de client khong the tu dat gia bang DevTools.
 *
 * Mot dong la MOT trong hai loai:
 *  - bo hoa co san: productId (+ size, bo trong = co Tieu chuan)
 *  - hoa dat theo yeu cau da duoc bao gia: customRequestId (so luong luon la 1)
 */
public record OrderLineRequest(
        Long productId,

        @Size(max = 10, message = "Cỡ bó không hợp lệ")
        String size,

        Long customRequestId,

        @NotNull(message = "Thiếu số lượng")
        @Min(value = 1, message = "Số lượng tối thiểu là 1")
        @Max(value = 99, message = "Số lượng tối đa là 99")
        Integer quantity
) {
}
