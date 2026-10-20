package dh13c6.nguyentiendat516.bloom.authservice.security;

import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Sinh va ky JWT khi dang nhap thanh cong.
 *
 * auth-service la noi DUY NHAT trong he thong ky token. product-service va
 * order-service chi xac thuc chu ky, khong bao gio tu cap token.
 *
 * Dung API cua JJWT 0.12: .subject() / .issuedAt() / .expiration() / Jwts.SIG.HS256
 * thay cho .setSubject() / SignatureAlgorithm da cu.
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getUsername())
                // userId la BAT BUOC: order-service can no de gan chu don hang
                // ma khong phai goi nguoc lai auth-service.
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }
}
