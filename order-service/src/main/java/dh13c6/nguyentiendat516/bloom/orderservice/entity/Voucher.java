package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Ma giam gia.
 *
 * Nam o order-service vi giam gia la mot phan cua viec tinh tien don hang - ma va don
 * phai duoc ghi nhan trong CUNG mot transaction (tang luot dung + luu don), dieu chi
 * lam duoc khi hai bang o chung mot CSDL.
 */
@Entity
@Table(name = "vouchers")
public class Voucher {

    public enum Type {
        /** Giam theo phan tram, co the gioi han so tien giam toi da. */
        PERCENT,
        /** Giam mot so tien co dinh. */
        FIXED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Luon luu IN HOA de khach go "bloom10" hay "BLOOM10" deu khop. */
    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "description", length = 200)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private Type type;

    /** PERCENT: 1-100 (%). FIXED: so tien VND. */
    @Column(name = "discount_value", nullable = false)
    private Double value;

    /** Chi dung cho PERCENT: tran so tien giam. Null = khong gioi han. */
    @Column(name = "max_discount")
    private Double maxDiscount;

    /** Gia tri don toi thieu (tien hoa + qua kem, chua tru giam gia, chua tinh phi ship). */
    @Column(name = "min_order_value", nullable = false)
    private Double minOrderValue = 0.0;

    /** Null = co hieu luc ngay. */
    @Column(name = "start_date")
    private LocalDate startDate;

    /** Null = khong het han. Ngay nay VAN dung duoc (tinh ca ngay cuoi). */
    @Column(name = "end_date")
    private LocalDate endDate;

    /** Tong so luot dung toi da. Null = khong gioi han. */
    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    /** Moi tai khoan chi dung ma nay mot lan. */
    @Column(name = "one_per_customer", nullable = false)
    private boolean onePerCustomer = false;

    /** Tat ma ma khong can xoa - giu lich su nhung don da dung ma. */
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /**
     * Ma CA NHAN: chi tai khoan nay thay (trong vi ma) va dung duoc. Null = ma chung.
     * Do ADMIN chon khi tao ma; order-service khong co bang users nen luu kem username
     * de hien thi, khong hoi auth-service moi lan.
     */
    @Column(name = "owner_user_id")
    private Long ownerUserId;

    @Column(name = "owner_username", length = 50)
    private String ownerUsername;

    /**
     * Ma "san": khach phai bam Luu o trang Voucher thi ma moi vao vi va moi dung duoc
     * (go tay ma chua luu cung bi tu choi). false = ma chung binh thuong, ai cung dung.
     */
    @Column(name = "claim_required", nullable = false)
    private boolean claimRequired = false;

    /** So luot luu toi da cua ma san. Null = khong gioi han. */
    @Column(name = "claim_limit")
    private Integer claimLimit;

    @Column(name = "claimed_count", nullable = false)
    private Integer claimedCount = 0;

    public Voucher() {
    }

    public boolean isClaimRequired() {
        return claimRequired;
    }

    public void setClaimRequired(boolean claimRequired) {
        this.claimRequired = claimRequired;
    }

    public Integer getClaimLimit() {
        return claimLimit;
    }

    public void setClaimLimit(Integer claimLimit) {
        this.claimLimit = claimLimit;
    }

    public Integer getClaimedCount() {
        return claimedCount;
    }

    public void setClaimedCount(Integer claimedCount) {
        this.claimedCount = claimedCount;
    }

    public Long getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getOwnerUsername() {
        return ownerUsername;
    }

    public void setOwnerUsername(String ownerUsername) {
        this.ownerUsername = ownerUsername;
    }

    public boolean isPersonal() {
        return ownerUserId != null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public Double getValue() {
        return value;
    }

    public void setValue(Double value) {
        this.value = value;
    }

    public Double getMaxDiscount() {
        return maxDiscount;
    }

    public void setMaxDiscount(Double maxDiscount) {
        this.maxDiscount = maxDiscount;
    }

    public Double getMinOrderValue() {
        return minOrderValue;
    }

    public void setMinOrderValue(Double minOrderValue) {
        this.minOrderValue = minOrderValue;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Integer getUsageLimit() {
        return usageLimit;
    }

    public void setUsageLimit(Integer usageLimit) {
        this.usageLimit = usageLimit;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public boolean isOnePerCustomer() {
        return onePerCustomer;
    }

    public void setOnePerCustomer(boolean onePerCustomer) {
        this.onePerCustomer = onePerCustomer;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
