package dh13c6.nguyentiendat516.bloom.authservice.dto;

import java.util.List;

/**
 * Ket qua kiem tra key, chi tra cho api-gateway qua /internal/**.
 *
 * reason chi de Gateway ghi log va chon ma trang thai, KHONG duoc chuyen nguyen van
 * ve cho doi tac: noi ro "key da bi thu hoi" hay "key khong ton tai" la cho ke do
 * biet chuoi nao tung la key that.
 */
public record ApiKeyValidationResponse(
        boolean valid,
        String reason,
        String ownerName,
        List<String> scopes,
        // Gateway dem han muc theo keyId (khong theo ten doi tac: mot doi tac co the co nhieu khoa)
        Long keyId,
        int rateLimitPerMinute
) {

    public static ApiKeyValidationResponse valid(Long keyId, String ownerName, List<String> scopes,
                                                 int rateLimitPerMinute) {
        return new ApiKeyValidationResponse(true, "OK", ownerName, scopes, keyId, rateLimitPerMinute);
    }

    public static ApiKeyValidationResponse invalid(String reason) {
        return new ApiKeyValidationResponse(false, reason, null, List.of(), null, 0);
    }
}
