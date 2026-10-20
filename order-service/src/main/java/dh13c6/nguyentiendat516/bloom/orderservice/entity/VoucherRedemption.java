package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Mot lan dung ma giam gia: ma nao, tai khoan nao, don nao.
 * Can de kiem tra quy tac "moi tai khoan mot lan" va de tra lai luot khi don bi huy.
 */
@Entity
@Table(name = "voucher_redemptions", indexes = {
        @Index(name = "idx_redemption_voucher_user", columnList = "voucher_id, user_id"),
        @Index(name = "idx_redemption_order", columnList = "order_id")
})
public class VoucherRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public VoucherRedemption() {
    }

    public VoucherRedemption(Long voucherId, Long userId, Long orderId) {
        this.voucherId = voucherId;
        this.userId = userId;
        this.orderId = orderId;
    }

    public Long getId() {
        return id;
    }

    public Long getVoucherId() {
        return voucherId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
