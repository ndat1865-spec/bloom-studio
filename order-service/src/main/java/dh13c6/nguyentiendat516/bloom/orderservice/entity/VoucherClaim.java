package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Mot lan khach "san" (luu) ma vao vi. Moi tai khoan luu mot ma toi da mot lan - rang
 * buoc unique o CSDL la lop chan cuoi khi khach bam Luu hai lan lien tiep.
 */
@Entity
@Table(name = "voucher_claims", uniqueConstraints = @UniqueConstraint(
        name = "uk_claim_voucher_user", columnNames = {"voucher_id", "user_id"}),
        indexes = @Index(name = "idx_claim_user", columnList = "user_id"))
public class VoucherClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "claimed_at", nullable = false)
    private Instant claimedAt = Instant.now();

    public VoucherClaim() {
    }

    public VoucherClaim(Long voucherId, Long userId) {
        this.voucherId = voucherId;
        this.userId = userId;
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

    public Instant getClaimedAt() {
        return claimedAt;
    }
}
