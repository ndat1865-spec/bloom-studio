package dh13c6.nguyentiendat516.bloom.orderservice.repository;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.VoucherClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;

public interface VoucherClaimRepository extends JpaRepository<VoucherClaim, Long> {

    boolean existsByVoucherIdAndUserId(Long voucherId, Long userId);

    /** Id cac ma khach da luu - doc mot lan cho ca trang, khong hoi tung ma. */
    @Query("select c.voucherId from VoucherClaim c where c.userId = :userId")
    Set<Long> findVoucherIdsByUserId(@Param("userId") Long userId);

    void deleteByVoucherId(Long voucherId);
}
