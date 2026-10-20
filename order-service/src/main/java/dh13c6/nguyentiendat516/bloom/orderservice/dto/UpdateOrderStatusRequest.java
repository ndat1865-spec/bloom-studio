package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

/** Body cua PUT /api/orders/{id}/status. */
public record UpdateOrderStatusRequest(
        @NotNull(message = "Trạng thái phải là PENDING, CONFIRMED, PREPARING, SHIPPING, DELIVERED hoặc CANCELLED")
        OrderStatus status
) {
}
