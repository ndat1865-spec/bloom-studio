package dh13c6.nguyentiendat516.bloom.productservice.controller;

import dh13c6.nguyentiendat516.bloom.productservice.dto.ProductResponse;
import dh13c6.nguyentiendat516.bloom.productservice.service.ProductService;
import org.springframework.web.bind.annotation.*;

/**
 * API noi bo - CHI danh cho order-service goi truc tiep vao localhost:8082.
 *
 * Route /internal/** co tinh KHONG duoc khai bao trong api-gateway, nen frontend
 * va doi tac ngoai khong goi toi duoc qua Gateway.
 *
 * Gioi han da biet: day la bao mat dua tren viec khong dinh tuyen, khong phai xac thuc
 * that. Ai vao duoc mang noi bo van goi duoc - xem docs/thiet-ke-bien-gioi-service.md.
 */
@RestController
@RequestMapping("/internal/products")
public class InternalProductController {

    private final ProductService productService;

    public InternalProductController(ProductService productService) {
        this.productService = productService;
    }

    @PatchMapping("/{id}/reserve-stock")
    public ProductResponse reserveStock(@PathVariable Long id,
                                        @RequestParam int quantity) {
        return ProductResponse.from(productService.reserveStock(id, quantity));
    }

    @PatchMapping("/{id}/release-stock")
    public ProductResponse releaseStock(@PathVariable Long id,
                                        @RequestParam int quantity) {
        return ProductResponse.from(productService.releaseStock(id, quantity));
    }
}
