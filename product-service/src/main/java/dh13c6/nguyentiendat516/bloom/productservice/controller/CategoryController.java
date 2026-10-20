package dh13c6.nguyentiendat516.bloom.productservice.controller;

import dh13c6.nguyentiendat516.bloom.productservice.dto.ApiError;
import dh13c6.nguyentiendat516.bloom.productservice.dto.CategoryResponse;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ProductResponse;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.service.CategoryService;
import dh13c6.nguyentiendat516.bloom.productservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SOS05 + SOS06 - API danh muc. URL goc: /api/categories
 */
@RestController
@RequestMapping("/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final ProductService productService;

    public CategoryController(CategoryService categoryService, ProductService productService) {
        this.categoryService = categoryService;
        this.productService = productService;
    }

    // ===== Ai cung xem duoc =====

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories().stream()
                .map(c -> CategoryResponse.from(c, categoryService.countProducts(c.getId())))
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        return categoryService.getCategoryById(id)
                .map(c -> CategoryResponse.from(c, categoryService.countProducts(c.getId())))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    // ===== Chi ADMIN =====

    @PostMapping
    public ResponseEntity<?> createCategory(@Valid @RequestBody Category category) {
        try {
            Category saved = categoryService.createCategory(category);
            return ResponseEntity.status(HttpStatus.CREATED).body(CategoryResponse.from(saved, 0));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id,
                                            @Valid @RequestBody Category category) {
        try {
            return categoryService.updateCategory(id, category)
                    .<ResponseEntity<?>>map(c -> ResponseEntity.ok(
                            CategoryResponse.from(c, categoryService.countProducts(c.getId()))))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    /**
     * Xoa danh muc. Chinh sach KHONG cascade:
     * con san pham -> 409 Conflict (xu ly boi GlobalExceptionHandler).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        try {
            return categoryService.deleteCategory(id)
                    ? ResponseEntity.noContent().build()
                    : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    // ===== San pham trong mot danh muc =====

    @GetMapping("/{id}/products")
    public ResponseEntity<List<ProductResponse>> getProductsByCategory(@PathVariable Long id) {
        if (categoryService.getCategoryById(id).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(productService.getProductsByCategory(id)
                .stream().map(ProductResponse::from).toList());
    }

    @PostMapping("/{id}/products")
    public ResponseEntity<?> createProductInCategory(@PathVariable Long id,
                                                     @Valid @RequestBody Product product) {
        try {
            return productService.createProductInCategory(id, product)
                    .<ResponseEntity<?>>map(p -> ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(p)))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiError.of(404, "Not Found", "Danh mục không tồn tại")));
        } catch (SecurityException e) {
            return forbidden(e);
        }
    }

    private ResponseEntity<ApiError> forbidden(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(403, "Forbidden", e.getMessage()));
    }
}
