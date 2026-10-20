package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderItem;

/** Mot dong don hang tra ve cho client. Gia la gia DA CHUP luc dat. */
public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        Double unitPrice,
        Integer quantity,
        Double lineTotal,
        String imageUrl,
        String size,
        String sizeLabel,
        Long customRequestId
) {
    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductId(),
                item.getProductName(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal(),
                item.getImageUrl(),
                item.getSize(),
                item.getSizeLabel(),
                item.getCustomRequestId());
    }
}
