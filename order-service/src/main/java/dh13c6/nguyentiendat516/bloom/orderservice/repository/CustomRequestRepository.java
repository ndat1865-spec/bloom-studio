package dh13c6.nguyentiendat516.bloom.orderservice.repository;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Yeu cau dat hoa theo y khach. */
public interface CustomRequestRepository extends JpaRepository<CustomRequest, Long> {

    Page<CustomRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<CustomRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<CustomRequest> findByStatusOrderByCreatedAtDesc(CustomRequestStatus status, Pageable pageable);

    long countByStatus(CustomRequestStatus status);

    /**
     * Giu yeu cau cho mot don dang dat: chi thanh cong khi yeu cau VAN dang "da bao gia" va
     * dung chu. Kiem tra va ghi trong MOT lenh UPDATE - hai tab cung dat mot yeu cau thi chi
     * mot ben thang, ben kia nhan 0.
     */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update CustomRequest r set r.status = :ordered where r.id = :id and r.userId = :userId "
            + "and r.status = :quoted")
    int claim(@Param("id") Long id, @Param("userId") Long userId,
              @Param("quoted") CustomRequestStatus quoted, @Param("ordered") CustomRequestStatus ordered);

    /** Tra yeu cau ve "da bao gia" (dat hang that bai / don bi huy). */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update CustomRequest r set r.status = :quoted, r.orderId = null, r.orderCode = null "
            + "where r.id = :id and r.status = :ordered")
    int release(@Param("id") Long id,
                @Param("ordered") CustomRequestStatus ordered, @Param("quoted") CustomRequestStatus quoted);
}
