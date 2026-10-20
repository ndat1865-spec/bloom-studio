package dh13c6.nguyentiendat516.bloom.productservice.repository;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/** SOS05 + SOS07 - Repository cho Product: loc theo danh muc, tim kiem + phan trang + sap xep. */
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    // SOS05 - lay san pham theo danh muc (khong phan trang)
    List<Product> findByCategoryId(Long categoryId);

    // SOS07 - tim kiem theo ten, khong phan biet hoa thuong, co phan trang + sap xep
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    // Bo sung: loc theo danh muc co phan trang (dung cho trang /products cua frontend)
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    Page<Product> findByCategoryIdAndNameContainingIgnoreCase(Long categoryId, String name, Pageable pageable);

    long countByCategoryId(Long categoryId);
}
