package dh13c6.nguyentiendat516.bloom.orderservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Moi phut huy cac don chon thanh toan truc tuyen ma qua han chua tra tien.
 *
 * Khong co buoc nay, khach bam dat hang roi bo di thi so hoa trong don bi giu mai trong
 * kho. Thoi han phai DAI HON han link thanh toan cong doi soat ben payment-service
 * (mac dinh 15 + 10 phut), neu khong co the huy mot don ma khach vua tra tien xong.
 */
@Component
public class UnpaidOrderCanceller {

    private static final Logger log = LoggerFactory.getLogger(UnpaidOrderCanceller.class);

    private final OrderService orderService;
    private final int unpaidCancelMinutes;

    public UnpaidOrderCanceller(OrderService orderService,
                                @Value("${order.unpaid-cancel-minutes}") int unpaidCancelMinutes) {
        this.orderService = orderService;
        this.unpaidCancelMinutes = unpaidCancelMinutes;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void run() {
        try {
            int count = orderService.cancelExpiredUnpaid(Instant.now().minus(Duration.ofMinutes(unpaidCancelMinutes)));
            if (count > 0) {
                log.info("Đã tự huỷ {} đơn quá hạn thanh toán", count);
            }
        } catch (RuntimeException e) {
            log.error("Tự huỷ đơn quá hạn thanh toán lỗi", e);
        }
    }
}
