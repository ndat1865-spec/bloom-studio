package dh13c6.nguyentiendat516.bloom.paymentservice.service;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentStatus;
import dh13c6.nguyentiendat516.bloom.paymentservice.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Doi soat dinh ky - thay cho IPN khi IPN khong toi duoc.
 *
 * Cong thanh toan chi goi IPN vao mot dia chi cong khai tren Internet. Chay tren may ca
 * nhan (localhost) thi IPN khong bao gio toi; neu khach tra tien xong roi dong trinh duyet
 * truoc khi quay ve trang ket qua thi cua hang khong he biet. Moi phut, bo nay:
 *  1. Hoi cong trang thai cac giao dich con PENDING (tao tu 1 phut truoc).
 *  2. Giao dich qua han ma cong van chua bao gi -> dong lai (FAILED).
 *  3. Giao dich SUCCESS chua bao duoc order-service -> bao lai.
 */
@Component
public class PaymentReconciler {

    private static final Logger log = LoggerFactory.getLogger(PaymentReconciler.class);

    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final int expireMinutes;

    public PaymentReconciler(PaymentRepository paymentRepository, PaymentService paymentService,
                             @Value("${payment.expire-minutes}") int expireMinutes) {
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
        this.expireMinutes = expireMinutes;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    public void reconcile() {
        Instant now = Instant.now();
        // Cho them 10 phut sau khi link het han: giao dich tra o giay cuoi van kip ghi nhan
        Instant expiredBefore = now.minus(Duration.ofMinutes(expireMinutes + 10L));

        for (Payment payment : paymentRepository.findByStatusAndCreatedAtBetween(
                PaymentStatus.PENDING, now.minus(Duration.ofDays(1)), now.minus(Duration.ofMinutes(1)))) {
            try {
                Payment updated = paymentService.refresh(payment);
                if (updated.getStatus() == PaymentStatus.PENDING && updated.getCreatedAt().isBefore(expiredBefore)) {
                    paymentService.expire(updated);
                }
            } catch (RuntimeException e) {
                log.warn("Đối soát giao dịch {} thất bại: {}", payment.getTxnRef(), e.getMessage());
            }
        }

        for (Payment payment : paymentRepository.findByStatusAndOrderNotifiedFalse(PaymentStatus.SUCCESS)) {
            paymentService.notifyOrder(payment);
        }

        // Hoan tien dang xu ly (ZaloPay) -> hoi lai; da hoan ma chua bao duoc order-service -> bao lai
        for (Payment payment : paymentRepository.findByStatus(PaymentStatus.REFUNDING)) {
            try {
                paymentService.refresh(payment);
            } catch (RuntimeException e) {
                log.warn("Hỏi trạng thái hoàn tiền {} thất bại: {}", payment.getTxnRef(), e.getMessage());
            }
        }
        for (Payment payment : paymentRepository.findByStatusAndOrderNotifiedFalse(PaymentStatus.REFUNDED)) {
            paymentService.notifyRefund(payment);
        }
    }
}
