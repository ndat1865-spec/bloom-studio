package dh13c6.nguyentiendat516.bloom.authservice.service;

import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyCreatedResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.ApiKeyValidationResponse;
import dh13c6.nguyentiendat516.bloom.authservice.dto.CreateApiKeyRequest;
import dh13c6.nguyentiendat516.bloom.authservice.entity.ApiKey;
import dh13c6.nguyentiendat516.bloom.authservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.authservice.repository.ApiKeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Cap, thu hoi va kiem tra API Key cho doi tac.
 *
 * Quy tac: key goc chi ton tai DUY NHAT mot lan, trong response cua lenh cap key.
 * Tu do ve sau he thong chi giu SHA-256 cua no.
 */
@Service
public class ApiKeyService {

    /** Tien to de nhin la biet chuoi nay la API Key cua Bloom, tien khi quet log lo key. */
    private static final String PREFIX = "bloom_pk_";

    /** 32 byte ngau nhien = 256 bit, du de khong the do tim. */
    private static final int KEY_BYTES = 32;

    private static final List<String> DEFAULT_SCOPES = List.of("products:read");

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ApiKeyRepository apiKeyRepository;

    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    /** Danh sach cho ADMIN. Khong dong nao chua key goc - xem ApiKeyResponse. */
    public List<ApiKeyResponse> getAll() {
        return apiKeyRepository.findAllByOrderByIdDesc().stream().map(ApiKeyResponse::from).toList();
    }

    @Transactional
    public ApiKeyCreatedResponse create(CreateApiKeyRequest request) {
        String rawKey = PREFIX + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(randomBytes());

        ApiKey key = new ApiKey();
        key.setKeyHash(hash(rawKey));
        key.setKeyPrefix(rawKey.substring(0, PREFIX.length() + 8));
        key.setOwnerName(request.ownerName().trim());
        key.setScopes(normalizeScopes(request.scopes()));
        key.setStatus(ApiKey.Status.ACTIVE);
        key.setCreatedAt(Instant.now());
        if (request.daysValid() != null) {
            key.setExpiresAt(Instant.now().plus(Duration.ofDays(request.daysValid())));
        }
        key.setRateLimitPerMinute(request.rateLimitPerMinute() == null
                ? ApiKey.DEFAULT_RATE_LIMIT : request.rateLimitPerMinute());

        return ApiKeyCreatedResponse.of(rawKey, ApiKeyResponse.from(apiKeyRepository.save(key)));
    }

    @Transactional
    public ApiKeyResponse revoke(Long id) {
        ApiKey key = findOrThrow(id);
        if (key.getStatus() == ApiKey.Status.REVOKED) {
            throw new ConflictException("Khoá này đã bị thu hồi trước đó");
        }
        key.setStatus(ApiKey.Status.REVOKED);
        return ApiKeyResponse.from(apiKeyRepository.save(key));
    }

    /**
     * Doi han muc cua mot khoa. Gateway nho ket qua kiem tra khoa trong partner.cache-ttl-seconds
     * giay, nen han muc moi co hieu luc cham toi da chung ay.
     */
    @Transactional
    public ApiKeyResponse updateRateLimit(Long id, int rateLimitPerMinute) {
        ApiKey key = findOrThrow(id);
        key.setRateLimitPerMinute(rateLimitPerMinute);
        return ApiKeyResponse.from(apiKeyRepository.save(key));
    }

    /** Xoa han khoi CSDL. Thuong nen thu hoi de con dau vet - xoa chi de don du lieu test. */
    @Transactional
    public void delete(Long id) {
        apiKeyRepository.delete(findOrThrow(id));
    }

    /**
     * Gateway goi moi khi co request cua doi tac (co cache phia Gateway).
     *
     * Khong nem exception cho key sai: day la duong nong, tra ve ket qua co cau truc
     * de Gateway tu chon ma trang thai. Chi ghi lastUsedAt khi key dung that, de con
     * biet key nao da bo khong.
     */
    @Transactional
    public ApiKeyValidationResponse validate(String rawKey, String requiredScope) {
        if (rawKey == null || rawKey.isBlank()) {
            return ApiKeyValidationResponse.invalid("THIEU_KEY");
        }

        Optional<ApiKey> found = apiKeyRepository.findByKeyHash(hash(rawKey));
        if (found.isEmpty()) {
            return ApiKeyValidationResponse.invalid("KHONG_TON_TAI");
        }

        ApiKey key = found.get();
        Instant now = Instant.now();
        if (key.getStatus() == ApiKey.Status.REVOKED) {
            return ApiKeyValidationResponse.invalid("DA_THU_HOI");
        }
        if (key.isExpired(now)) {
            return ApiKeyValidationResponse.invalid("HET_HAN");
        }
        if (requiredScope != null && !requiredScope.isBlank() && !key.hasScope(requiredScope)) {
            return ApiKeyValidationResponse.invalid("THIEU_SCOPE");
        }

        key.setLastUsedAt(now);
        apiKeyRepository.save(key);
        return ApiKeyValidationResponse.valid(key.getId(), key.getOwnerName(), key.scopeList(),
                key.effectiveRateLimit());
    }

    /** Dung cho DataSeeder: nap san key demo cu de tai lieu va Postman con chay duoc. */
    @Transactional
    public void seedIfAbsent(String rawKey, String ownerName, List<String> scopes) {
        if (apiKeyRepository.findByKeyHash(hash(rawKey)).isPresent()) {
            return;
        }
        ApiKey key = new ApiKey();
        key.setKeyHash(hash(rawKey));
        // Khong bao gio lo qua mot nua key, ke ca key cu ngan hon key he thong sinh ra.
        key.setKeyPrefix(rawKey.substring(0, Math.min(16, rawKey.length() / 2)));
        key.setOwnerName(ownerName);
        key.setScopes(normalizeScopes(scopes));
        key.setStatus(ApiKey.Status.ACTIVE);
        key.setCreatedAt(Instant.now());
        apiKeyRepository.save(key);
    }

    private ApiKey findOrThrow(Long id) {
        return apiKeyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy khoá API id = " + id));
    }

    private String normalizeScopes(List<String> scopes) {
        List<String> cleaned = (scopes == null ? List.<String>of() : scopes).stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.trim().toLowerCase())
                .distinct()
                .toList();
        return String.join(",", cleaned.isEmpty() ? DEFAULT_SCOPES : cleaned);
    }

    private byte[] randomBytes() {
        byte[] bytes = new byte[KEY_BYTES];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    /** SHA-256 dang hex. Xem ghi chu tren entity ApiKey ve ly do khong dung BCrypt. */
    private String hash(String rawKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawKey.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // Moi JVM deu bat buoc co SHA-256, nhanh nay khong the xay ra.
            throw new IllegalStateException("JVM khong ho tro SHA-256", e);
        }
    }
}
