package dh13c6.nguyentiendat516.bloom.authservice.dto;

import dh13c6.nguyentiendat516.bloom.authservice.entity.ApiKey;

import java.time.Instant;
import java.util.List;

/**
 * DTO danh sach key cho ADMIN.
 *
 * CO Y KHONG co truong keyValue. Tai lieu tham khao hua "key chi hien thi mot lan"
 * nhung getAll() cua no van tra keyValue, nen toan bo key that van gui ve trinh duyet -
 * loi hua va code khong khop. O day key goc khong ton tai trong CSDL de ma tra ve:
 * chi con keyPrefix du de ADMIN nhan ra dong nao la key nao.
 */
public record ApiKeyResponse(
        Long id,
        String keyPrefix,
        String ownerName,
        List<String> scopes,
        String status,
        boolean usable,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        int rateLimitPerMinute
) {

    public static ApiKeyResponse from(ApiKey k) {
        return new ApiKeyResponse(
                k.getId(),
                k.getKeyPrefix(),
                k.getOwnerName(),
                k.scopeList(),
                k.getStatus().name(),
                k.isUsable(Instant.now()),
                k.getCreatedAt(),
                k.getExpiresAt(),
                k.getLastUsedAt(),
                k.effectiveRateLimit());
    }
}
