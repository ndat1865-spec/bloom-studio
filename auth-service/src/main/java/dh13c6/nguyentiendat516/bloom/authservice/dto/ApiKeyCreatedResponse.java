package dh13c6.nguyentiendat516.bloom.authservice.dto;

/**
 * Tra ve DUY NHAT mot lan, ngay sau khi cap key. Sau lan nay he thong chi con hash
 * nen khong the doc lai key goc - mat thi phai cap key khac.
 */
public record ApiKeyCreatedResponse(
        String keyValue,
        String warning,
        ApiKeyResponse key
) {

    public static ApiKeyCreatedResponse of(String keyValue, ApiKeyResponse key) {
        return new ApiKeyCreatedResponse(
                keyValue,
                "Hãy sao chép ngay. Khoá này chỉ hiển thị một lần và không thể xem lại.",
                key);
    }
}
