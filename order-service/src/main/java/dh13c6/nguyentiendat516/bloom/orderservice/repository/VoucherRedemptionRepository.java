package dh13c6.nguyentiendat516.bloom.orderservice.repository;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.VoucherRedemption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption, Long> {

    boolean existsByVoucherIdAndUserId(Long voucherId, Long userId);

    Optional<VoucherRedemption> findByOrderId(Long orderId);
}
