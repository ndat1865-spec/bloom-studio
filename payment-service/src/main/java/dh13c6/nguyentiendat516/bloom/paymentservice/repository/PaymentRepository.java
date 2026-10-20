package dh13c6.nguyentiendat516.bloom.paymentservice.repository;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTxnRef(String txnRef);

    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Giao dich con treo trong khoang thoi gian - dua vao doi soat. */
    List<Payment> findByStatusAndCreatedAtBetween(PaymentStatus status, Instant from, Instant to);

    List<Payment> findByStatus(PaymentStatus status);

    /** Cong da bao thanh cong nhung chua bao duoc sang order-service. */
    List<Payment> findByStatusAndOrderNotifiedFalse(PaymentStatus status);
}
