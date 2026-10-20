package dh13c6.nguyentiendat516.bloom.authservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * API Key cap cho doi tac ngoai goi /api/public/**.
 *
 * KHONG luu key goc, chi luu SHA-256 cua key. Lo CSDL cung khong dung duoc key.
 *
 * Vi sao SHA-256 chu khong phai BCrypt nhu mat khau: key do he thong sinh ra, 256 bit
 * ngau nhien, khong the doan bang tu dien nen khong can lam cham co y. Doi lai, hash
 * tat dinh cho phep tra cuu bang chi muc trong mot lenh SELECT; BCrypt thi moi lan
 * kiem tra phai doc het bang roi bam lai tung dong - moi request cua doi tac deu tra
 * gia do.
 */
@Entity
@Table(name = "api_keys")
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SHA-256 dang hex, 64 ky tu. Duy nhat de tra cuu bang chi muc. */
    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    /** Vai ky tu dau cua key, chi de ADMIN nhan ra dong nao la key nao. */
    @Column(name = "key_prefix", nullable = false, length = 24)
    private String keyPrefix;

    @Column(name = "owner_name", nullable = false, length = 100)
    private String ownerName;

    /** Danh sach scope ngan cach bang dau phay, vi du "products:read". */
    @Column(name = "scopes", nullable = false, length = 255)
    private String scopes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /** Null = khong het han. */
    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    /**
     * So request toi da moi phut cua rieng khoa nay, Gateway dem va chan (429).
     * Null o khoa tao truoc khi co tinh nang -> dung DEFAULT_RATE_LIMIT.
     */
    @Column(name = "rate_limit_per_minute")
    private Integer rateLimitPerMinute;

    public static final int DEFAULT_RATE_LIMIT = 60;

    public enum Status { ACTIVE, REVOKED }

    public Integer getRateLimitPerMinute() {
        return rateLimitPerMinute;
    }

    public void setRateLimitPerMinute(Integer rateLimitPerMinute) {
        this.rateLimitPerMinute = rateLimitPerMinute;
    }

    public int effectiveRateLimit() {
        return rateLimitPerMinute == null ? DEFAULT_RATE_LIMIT : rateLimitPerMinute;
    }

    /** Con dung duoc khong: chua thu hoi va chua het han. */
    public boolean isUsable(Instant now) {
        return status == Status.ACTIVE && !isExpired(now);
    }

    public boolean isExpired(Instant now) {
        return expiresAt != null && !expiresAt.isAfter(now);
    }

    public List<String> scopeList() {
        return Arrays.stream(scopes.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public boolean hasScope(String scope) {
        return scopeList().contains(scope);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKeyHash() {
        return keyHash;
    }

    public void setKeyHash(String keyHash) {
        this.keyHash = keyHash;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getScopes() {
        return scopes;
    }

    public void setScopes(String scopes) {
        this.scopes = scopes;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(Instant lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }
}
