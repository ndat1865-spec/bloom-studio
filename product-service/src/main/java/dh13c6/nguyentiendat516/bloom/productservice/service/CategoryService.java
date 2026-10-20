package dh13c6.nguyentiendat516.bloom.productservice.service;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;
import dh13c6.nguyentiendat516.bloom.productservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.productservice.repository.CategoryRepository;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * SOS05 + SOS06 - Nghiep vu Category. Kiem tra quyen thuc hien tai tang Service.
 */
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    // ===== Ai cung xem duoc =====
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }

    public long countProducts(Long categoryId) {
        return productRepository.countByCategoryId(categoryId);
    }

    // ===== Chi ADMIN =====
    public Category createCategory(Category category) {
        category.setId(null);
        return categoryRepository.save(category);
    }

    public Optional<Category> updateCategory(Long id, Category categoryDetails) {
        return categoryRepository.findById(id).map(category -> {
            category.setName(categoryDetails.getName());
            return categoryRepository.save(category);
        });
    }

    /**
     * SOS05 - Chinh sach xoa: KHONG cascade.
     * Neu danh muc con san pham -> tu choi bang ConflictException (409),
     * nguoi dung phai xoa hoac chuyen het san pham truoc.
     */
    public boolean deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            return false;
        }
        long remaining = productRepository.countByCategoryId(id);
        if (remaining > 0) {
            throw new ConflictException(
                    "Danh mục vẫn còn " + remaining + " sản phẩm. Hãy xoá hoặc chuyển sản phẩm sang danh mục khác trước.");
        }
        categoryRepository.deleteById(id);
        return true;
    }
}
