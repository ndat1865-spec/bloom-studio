package dh13c6.nguyentiendat516.bloom.paymentservice.config;

import dh13c6.nguyentiendat516.bloom.paymentservice.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // BAT BUOC (giong ba service kia): khong mo lan chuyen tiep sang /error thi
                    // moi loi 400/404/500 deu bi bien thanh 401 rong.
                    .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                    .requestMatchers(HttpMethod.GET, "/payments/methods").permitAll()
                    // Ket qua va IPN: khong co JWT, an toan nho kiem chu ky cua cong thanh toan
                    .requestMatchers(HttpMethod.POST, "/payments/return", "/payments/momo/ipn",
                            "/payments/zalopay/callback").permitAll()
                    .requestMatchers(HttpMethod.GET, "/payments/vnpay/ipn").permitAll()
                    .requestMatchers(HttpMethod.GET, "/payments", "/payments/circuit-breakers").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(HttpMethod.POST, "/payments/*/refund").hasAnyRole("ADMIN", "STAFF")
                    // Con lai can dang nhap; quyen tren tung giao dich do PaymentController kiem tra
                    .anyRequest().authenticated())
            // BAT BUOC: thieu token phai la 401 (mac dinh Spring tra 403), frontend dua vao
            // 401 de tu dang xuat khi het phien.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
