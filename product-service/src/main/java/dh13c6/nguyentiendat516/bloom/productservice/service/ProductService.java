package dh13c6.nguyentiendat516.bloom.productservice.service;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;
import dh13c6.nguyentiendat516.bloom.productservice.entity.FlowerColor;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Occasion;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.productservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.productservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.productservice.repository.CategoryRepository;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductRepository;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductSpecifications;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ReviewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * SOS02 -> SOS07 - Nghiep vu Product.
 * - Kiem tra quyen ADMIN tai tang Service (SOS06)
 * - Tim kiem / sap xep / phan trang thuc hien duoi CSDL bang Pageable (SOS07)
 * - Upload anh uy quyen cho FileStorageService (SOS07)
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;
    private final ReviewRepository reviewRepository;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          FileStorageService fileStorageService,
                          ReviewRepository reviewRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.fileStorageService = fileStorageService;
        this.reviewRepository = reviewRepository;
    }

    // ===================== DOC (ai cung xem duoc) =====================

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    /**
     * SOS07 - Tim kiem theo ten + phan trang + sap xep.
     * Giu nguyen chu ky cu cho cac noi da goi (chi loc ten + danh muc).
     */
    public Page<Product> searchProducts(String name, Long categoryId, Pageable pageable) {
        return searchProducts(name, categoryId, null, null, null, null, pageable);
    }

    /**
     * Tim kiem day du: ten, danh muc, dip, mau, khoang gia. Tham so nao null thi bo qua.
     * Danh muc khong ton tai van tra 404 nhu truoc de client biet la loc sai.
     */
    public Page<Product> searchProducts(String name, Long categoryId, Occasion occasion, FlowerColor color,
                                        Double minPrice, Double maxPrice, Pageable pageable) {
        if (categoryId != null && !categoryRepository.existsById(categoryId)) {
            throw new NotFoundException("Không tìm thấy danh mục id = " + categoryId);
        }
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new BadRequestException("Giá thấp nhất không được lớn hơn giá cao nhất");
        }
        Specification<Product> spec =
                ProductSpecifications.matching(name, categoryId, occasion, color, minPrice, maxPrice);
        // sort=price phai theo gia "Tu ..." tren the: Specification tu sap xep, bo sort khoi
        // Pageable de Spring Data khong ghi de bang cot price
        if (pageable.getSort().getOrderFor("price") != null) {
            spec = spec.and(ProductSpecifications.orderedBy(pageable.getSort()));
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        }
        return productRepository.findAll(spec, pageable);
    }

    /** SOS05 - Lay san pham theo danh muc (khong phan trang). */
    public List<Product> getProductsByCategory(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new NotFoundException("Không tìm thấy danh mục id = " + categoryId);
        }
        return productRepository.findByCategoryId(categoryId);
    }

    // ===================== GHI (chi ADMIN) =====================

    public Product createProduct(Product product) {
        product.setId(null);
        // Diem danh gia chi do ReviewService tinh, khong nhan tu body
        product.setRatingAverage(null);
        product.setRatingCount(0);
        product.setCategory(resolveCategory(product.getCategory()));
        return productRepository.save(product);
    }

    public Optional<Product> updateProduct(Long id, Product updatedProduct) {
        Category resolved = resolveCategory(updatedProduct.getCategory());
        return productRepository.findById(id).map(product -> {
            product.setName(updatedProduct.getName());
            product.setPrice(updatedProduct.getPrice());
            product.setDescription(updatedProduct.getDescription());
            product.setOccasions(updatedProduct.getOccasions());
            product.setColor(updatedProduct.getColor());
            product.setComposition(updatedProduct.getComposition());
            product.setStemCount(updatedProduct.getStemCount());
            product.setSized(updatedProduct.isSized());
            product.setLeadDays(updatedProduct.getLeadDays());
            // Khong chon anh moi -> giu nguyen anh cu
            if (updatedProduct.getImageUrl() != null && !updatedProduct.getImageUrl().isBlank()) {
                product.setImageUrl(updatedProduct.getImageUrl());
            }
            // Khong gui category -> giu nguyen danh muc cu
            if (resolved != null) {
                product.setCategory(resolved);
            }
            return productRepository.save(product);
        });
    }

    @Transactional
    public boolean deleteProduct(Long id) {
        if (productRepository.existsById(id)) {
            // Danh gia tro toi san pham bang khoa ngoai -> xoa truoc, neu khong MySQL chan lenh xoa
            reviewRepository.deleteByProductId(id);
            productRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /** SOS05/SOS06 - Tao san pham truc tiep trong mot danh muc. */
    public Optional<Product> createProductInCategory(Long categoryId, Product product) {
        return categoryRepository.findById(categoryId).map(category -> {
            product.setId(null);
            product.setRatingAverage(null);
            product.setRatingCount(0);
            product.setCategory(category);
            return productRepository.save(product);
        });
    }

    // ============ TON KHO - chi goi tu order-service qua API noi bo ============

    /**
     * Tru mot so luong ton kho. BAT BUOC @Transactional: doc stockQuantity roi ghi lai
     * la hai thao tac rieng, neu hai don hang dat cung luc cung doc duoc gia tri cu thi
     * ton kho se bi tru sai. @Transactional bao dam ca khoi chay tron ven hoac khong chay.
     */
    @Transactional
    public Product reserveStock(Long id, int quantity) {
        if (quantity <= 0) {
            throw new BadRequestException("Số lượng phải lớn hơn 0");
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sản phẩm id = " + id));
        if (product.getStockQuantity() < quantity) {
            throw new ConflictException("Sản phẩm \"" + product.getName() + "\" không đủ hàng");
        }
        product.setStockQuantity(product.getStockQuantity() - quantity);
        return productRepository.save(product);
    }

    /** Hoan tra ton kho khi huy don. */
    @Transactional
    public Product releaseStock(Long id, int quantity) {
        if (quantity <= 0) {
            throw new BadRequestException("Số lượng phải lớn hơn 0");
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sản phẩm id = " + id));
        product.setStockQuantity(product.getStockQuantity() + quantity);
        return productRepository.save(product);
    }

    // ===================== UPLOAD ANH (chi ADMIN) =====================

    /**
     * SOS07 - POST /api/products/upload : chi luu file, tra ve duong dan tuong doi.
     */
    public String uploadProductImage(MultipartFile file) throws IOException {
        return fileStorageService.saveFile(file);
    }

    /**
     * SOS07/SOS09 - Luu file va cap nhat imageUrl cua san pham, tra ve san pham da cap nhat.
     * Day la phan trien khai con thieu ma controller mau goi den (updateProductImage).
     */
    public Product updateProductImage(Long id, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Chưa chọn file hoặc file rỗng");
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sản phẩm id = " + id));

        String storedPath = fileStorageService.saveFile(file);
        product.setImageUrl(storedPath);
        return productRepository.save(product);
    }

    // ===================== HO TRO =====================

    /**
     * Kiem tra danh muc ton tai khi gan / chuyen san pham.
     * Tra ve entity Category duoc quan ly boi JPA, hoac null neu request khong gui category.
     */
    private Category resolveCategory(Category incoming) {
        if (incoming == null || incoming.getId() == null) {
            return null;
        }
        return categoryRepository.findById(incoming.getId())
                .orElseThrow(() -> new BadRequestException(
                        "Danh mục id = " + incoming.getId() + " không tồn tại"));
    }
}
