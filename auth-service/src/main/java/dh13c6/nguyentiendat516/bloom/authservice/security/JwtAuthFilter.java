package dh13c6.nguyentiendat516.bloom.authservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Tu doc va xac thuc JWT tu header Authorization, KHONG phu thuoc vao viec api-gateway
 * da kiem tra hay chua.
 *
 * Ly do: neu ai do goi thang localhost:8082 ma bo qua Gateway thi buoc chan o Gateway
 * hoan toan bi vo hieu. Moi service phai tu ve - nguyen tac Zero Trust thu nho.
 *
 * Class nay giong het o ca product-service, order-service va auth-service. Day la
 * truong hop trung lap code CO CHU DICH: doi lay viec moi service doc lap hoan toan,
 * khong phu thuoc mot thu vien dung chung.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final String secret;

    public JwtAuthFilter(@Value("${jwt.secret}") String secret) {
        this.secret = secret;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
                Claims claims = Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String username = claims.getSubject();
                String role = claims.get("role", String.class);
                // JJWT tra so JSON nho ve Integer - doc qua Number roi ep sang Long cho an toan
                Number rawUserId = claims.get("userId", Number.class);
                Long userId = (rawUserId == null) ? null : rawUserId.longValue();

                var authToken = new UsernamePasswordAuthenticationToken(
                        username, userId, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(authToken);

            } catch (Exception e) {
                // Token hong / het han / sai chu ky -> coi nhu chua dang nhap
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
