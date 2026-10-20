package dh13c6.nguyentiendat516.bloom.chatservice.config;

import dh13c6.nguyentiendat516.bloom.chatservice.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
                    // BAT BUOC (giong cac service kia): khong mo lan chuyen tiep sang /error thi
                    // moi loi deu bi bien thanh 401 rong.
                    .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                    // Hop thu cua studio: ADMIN va nhan vien
                    .requestMatchers("/chat/conversations", "/chat/conversations/**").hasAnyRole("ADMIN", "STAFF")
                    // Cuoc chat cua chinh khach: chi can dang nhap, chu cuoc chat lay tu JWT
                    .anyRequest().authenticated())
            // BAT BUOC: thieu token phai la 401 (mac dinh Spring tra 403).
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
