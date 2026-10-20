package dh13c6.nguyentiendat516.bloom.authservice.security;

import dh13c6.nguyentiendat516.bloom.authservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;

/**
 * Xac minh ID token cua "Dang nhap bang Google" (Google Identity Services).
 *
 * Trinh duyet nhan ID token (mot JWT do Google ky) roi gui len day. Ta KHONG tin noi dung
 * token cho toi khi kiem xong ca bon dieu:
 * - chu ky dung khoa cong khai cua Google (tai tu JWKS, Nimbus tu cache va tu doi khoa);
 * - iss la accounts.google.com;
 * - aud dung Client ID cua Bloom (token cap cho ung dung khac thi khong dung duoc o day);
 * - con han (exp / iat).
 * Qua het moi lay sub (ma tai khoan Google, khong doi) va email ra dung.
 *
 * Khong can client secret: luong ID token khong doi code lay token nen khong co bi mat nao
 * phai giu o server ngoai Client ID (Client ID la thong tin cong khai).
 */
@Component
public class GoogleTokenVerifier {

    static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    /** Nhung gi Bloom can tu tai khoan Google. */
    public record GoogleIdentity(String sub, String email, boolean emailVerified, String name, String picture) {
    }

    private final String clientId;
    private volatile JwtDecoder decoder;

    @Autowired
    public GoogleTokenVerifier(@Value("${google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    /** Cho test: dung decoder tu tao (khoa tu sinh) thay cho JWKS that cua Google. */
    GoogleTokenVerifier(String clientId, NimbusJwtDecoder decoder) {
        this(clientId);
        decoder.setJwtValidator(validator(this.clientId));
        this.decoder = decoder;
    }

    /** Chua khai GOOGLE_CLIENT_ID thi tat han dang nhap Google, nut tren web cung an. */
    public boolean enabled() {
        return !clientId.isEmpty();
    }

    public String clientId() {
        return clientId;
    }

    /**
     * Loi token tra 400 chu khong phai 401: frontend coi 401 la "phien het han" va dang xuat
     * nguoi dung - ma o buoc lien ket Google, khach van dang dang nhap binh thuong.
     */
    public GoogleIdentity verify(String credential) {
        if (!enabled()) {
            throw new BadRequestException("Chưa bật đăng nhập bằng Google");
        }
        if (credential == null || credential.isBlank()) {
            throw new BadRequestException("Thiếu mã xác thực Google");
        }
        Jwt jwt;
        try {
            jwt = decoder().decode(credential);
        } catch (JwtException e) {
            throw new BadRequestException("Không xác thực được tài khoản Google, vui lòng thử lại");
        }
        Object verified = jwt.getClaims().get("email_verified");
        return new GoogleIdentity(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(verified) || "true".equals(String.valueOf(verified)),
                jwt.getClaimAsString("name"),
                safePicture(jwt.getClaimAsString("picture")));
    }

    /** Chi nhan anh https, du ngan de vua cot avatar_url - con lai bo qua (van dang nhap duoc). */
    private static String safePicture(String url) {
        return url != null && url.startsWith("https://") && url.length() <= 500 ? url : null;
    }

    /** Tao decoder lan dau can den - khoi dong service khong phu thuoc mang toi Google. */
    private JwtDecoder decoder() {
        JwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                if (decoder == null) {
                    NimbusJwtDecoder built = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
                    built.setJwtValidator(validator(clientId));
                    decoder = built;
                }
                current = decoder;
            }
        }
        return current;
    }

    static OAuth2TokenValidator<Jwt> validator(String clientId) {
        return new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                new JwtClaimValidator<Object>("iss", iss -> iss != null && ISSUERS.contains(iss.toString())),
                new JwtClaimValidator<Object>("aud", aud -> aud instanceof Collection<?> list
                        ? list.contains(clientId)
                        : clientId.equals(String.valueOf(aud))));
    }
}
