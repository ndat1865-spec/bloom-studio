package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.GiftAddon;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Mot dong qua kem client gui len: CHI ma qua + so luong, gia do server tu tra. */
public record AddonLineRequest(
        @NotNull(message = "Thiếu mã quà kèm") GiftAddon code,
        @NotNull(message = "Thiếu số lượng quà kèm")
        @Min(value = 1, message = "Số lượng quà kèm tối thiểu là 1")
        @Max(value = 10, message = "Số lượng quà kèm tối đa là 10")
        Integer quantity
) {
}
