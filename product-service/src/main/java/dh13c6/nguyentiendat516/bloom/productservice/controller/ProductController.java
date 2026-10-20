package dh13c6.nguyentiendat516.bloom.productservice.controller;

import dh13c6.nguyentiendat516.bloom.productservice.dto.ApiError;
import dh13c6.nguyentiendat516.bloom.productservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ProductResponse;
import dh13c6.nguyentiendat516.bloom.productservice.entity.FlowerColor;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Occasion;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * SOS02 -> SOS10 - API san pham. URL goc: /api/products
 *
 * Ghi chu ve role: SOS06 mo ta role o header nhung controller va cac buoc kiem thu
 * deu dung @RequestParam. Du an nay theo hop dong query-param / form-field cua controller.
 * role = null hoac khac ADMIN -> tang Service nem SecurityException -> 403.
 */
@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // ============ DANH SACH: tim kiem + sap xep + phan trang (SOS07) ============

    /**
     * GET /api/products?name=rose&categoryId=1&occasion=BIRTHDAY&color=RED&minPrice=50&maxPrice=100&page=0&size=6&sort=price,desc
     * GET /api/products/search?... (alias, dung chung Service - phan kiem thu SOS07 dung duong dan nay)
     */
    @GetMapping({"", "/search"})
    public ResponseEntity<PageResponse<ProductResponse>> getProducts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Occasion occasion,
            @RequestParam(required = false) FlowerColor color,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            Pageable pageable) {
        return ResponseEntity.ok(PageResponse.from(
                productService.searchProducts(name, categoryId, occasion, color, minPrice, maxPrice, pageable),
                ProductResponse::from));
    }

    /**
     * Danh sach dip va mau kem nhan tieng Viet, de frontend dung lam bo loc va form.
     * Frontend khong tu khai lai danh sach nay - them dip moi chi can sua enum.
     */
    @GetMapping("/attributes")
    public Map<String, List<Map<String, String>>> getAttributes() {
        return Map.of(
                "occasions", Arrays.stream(Occasion.values())
                        .map(o -> Map.of("value", o.name(), "label", o.getLabel())).toList(),
                "colors", Arrays.stream(FlowerColor.values())
                        .map(c -> Map.of("value", c.name(), "label", c.getLabel())).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(ProductResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    // ============ GHI (chi ADMIN - SOS06) ============

    @PostMapping
    public ResponseEntity<?> createProduct(@Valid @RequestBody Product product) {
        try {
            Product saved = productService.createProduct(product);
            return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(saved));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id,
                                           @Valid @RequestBody Product product) {
        try {
            return productService.updateProduct(id, product)
                    .<ResponseEntity<?>>map(p -> ResponseEntity.ok(ProductResponse.from(p)))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    /** DELETE thanh cong -> 204 voi body rong (SOS03). */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        try {
            return productService.deleteProduct(id)
                    ? ResponseEntity.noContent().build()
                    : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    // ============ THEO DANH MUC (duong dan xuat hien o SOS07) ============

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ProductResponse>> getProductsByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId)
                .stream().map(ProductResponse::from).toList());
    }

    @PostMapping("/category/{categoryId}")
    public ResponseEntity<?> createProductInCategory(@PathVariable Long categoryId,
                                                     @Valid @RequestBody Product product) {
        try {
            return productService.createProductInCategory(categoryId, product)
                    .<ResponseEntity<?>>map(p -> ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(p)))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiError.of(404, "Not Found", "Danh mục không tồn tại")));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    // ============ UPLOAD ANH (SOS07 + SOS09) ============

    /**
     * SOS07 - POST /api/products/upload?role=ADMIN
     * Luu anh doc lap, tra ve chuoi "uploads/<uuid>_<tenfile>" voi ma 200.
     *
     * KHONG khai bao consumes = multipart/form-data: neu khai bao, mot request gui thieu
     * body/Content-Type se bi Spring tra 415 truoc khi vao controller, trong khi SOS07
     * quy dinh "khong gui file hoac file rong -> 400 Bad Request".
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(@RequestParam(value = "file", required = false) MultipartFile file)
            throws IOException {
        try {
            return ResponseEntity.ok(productService.uploadProductImage(file));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    /**
     * SOS07 - PUT /api/products/{id}/image?role=ADMIN
     * Nhan file va cap nhat anh cho san pham.
     */
    @PutMapping("/{id}/image")
    public ResponseEntity<?> replaceImage(@PathVariable Long id,
                                          @RequestParam(value = "file", required = false) MultipartFile file)
            throws IOException {
        try {
            return ResponseEntity.ok(ProductResponse.from(productService.updateProductImage(id, file)));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    /**
     * SOS09 - POST /api/products/{id}/upload-image
     * Tra ve san pham da cap nhat de client cap nhat giao dien ngay.
     */
    @PostMapping("/{id}/upload-image")
    public ResponseEntity<?> uploadProductImage(@PathVariable Long id,
                                                @RequestParam(value = "file", required = false) MultipartFile file)
            throws IOException {
        try {
            return ResponseEntity.ok(ProductResponse.from(productService.updateProductImage(id, file)));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    private ResponseEntity<ApiError> forbidden(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(403, "Forbidden", e.getMessage()));
    }
}
