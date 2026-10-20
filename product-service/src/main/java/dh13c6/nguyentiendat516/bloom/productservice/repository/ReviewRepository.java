package dh13c6.nguyentiendat516.bloom.productservice.repository;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** Danh gia dang hien cua mot san pham - trang chi tiet san pham. */
    Page<Review> findByProductIdAndHiddenFalse(Long productId, Pageable pageable);

    Optional<Review> findByProductIdAndUserId(Long productId, Long userId);

    /** Trang quan tri: loc theo trang thai an/hien. */
    Page<Review> findByHidden(boolean hidden, Pageable pageable);

    long countByProductIdAndHiddenFalse(Long productId);

    @Query("select avg(r.rating) from Review r where r.product.id = :productId and r.hidden = false")
    Double averageVisibleRating(@Param("productId") Long productId);

    /** Moi phan tu: [so sao, so luong] - de ve thanh phan bo 5 sao. */
    @Query("select r.rating, count(r) from Review r where r.product.id = :productId and r.hidden = false "
            + "group by r.rating")
    List<Object[]> countVisibleByRating(@Param("productId") Long productId);

    @Modifying
    @Query("delete from Review r where r.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
