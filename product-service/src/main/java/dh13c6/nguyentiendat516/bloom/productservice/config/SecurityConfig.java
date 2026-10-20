package dh13c6.nguyentiendat516.bloom.productservice.config;

import dh13c6.nguyentiendat516.bloom.productservice.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Phan quyen cua product-service.
 *
 * Thay the hoan toan co che ?role=ADMIN cua ban monolith: role nay lay tu JWT da xac
 * thuc chu ky, khong phai tu tham so do client tu khai.
 */
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
                    // BAT BUOC. authenticationEntryPoint goi sendError(), servlet container
                    // chuyen tiep sang /error. Neu khong mo lan chuyen tiep nay thi no lai
                    // roi vao anyRequest().authenticated() - o che do STATELESS lan chuyen
                    // tiep khong mang theo authentication nen bi chan, goi lai entry point,
                    // ra 401 rong. Hau qua: MOI loi deu hien thanh 401, ke ca 404 va 500,
                    // che mat loi that va rat kho tim.
                    .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                    // API noi bo: chi order-service goi qua mang noi bo, khong lo qua Gateway
                    .requestMatchers("/internal/**").permitAll()
                    // Anh san pham: the <img> cua trinh duyet khong gui duoc header tuy chinh
                    .requestMatchers("/uploads/**").permitAll()
                    // Danh gia: xem cong khai, nhung hoi "toi danh gia duoc khong" va gui
                    // danh gia thi phai dang nhap. Khai TRUOC hai quy tac chung ben duoi vi
                    // Spring dung quy tac khop DAU TIEN.
                    .requestMatchers(HttpMethod.GET, "/products/*/reviews/eligibility").authenticated()
                    .requestMatchers(HttpMethod.POST, "/products/*/reviews").authenticated()
                    // Duyet danh gia: ADMIN va nhan vien
                    .requestMatchers("/reviews", "/reviews/**").hasAnyRole("ADMIN", "STAFF")
                    // Xem hang: ai cung xem duoc, khong can dang nhap
                    .requestMatchers(HttpMethod.GET, "/products/**", "/categories/**").permitAll()
                    // Moi thao tac ghi: ADMIN va nhan vien (STAFF)
                    .requestMatchers(HttpMethod.POST, "/products/**", "/categories/**").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(HttpMethod.PUT, "/products/**", "/categories/**").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(HttpMethod.DELETE, "/products/**", "/categories/**").hasAnyRole("ADMIN", "STAFF")
                    .anyRequest().authenticated())
            // BAT BUOC: mac dinh Spring Security dung Http403ForbiddenEntryPoint, tra 403 cho
            // ca truong hop THIEU token. Nhu vay sai quy uoc ma frontend dua vao de tu dang
            // xuat khi het phien (no bat 401). Khai ro de thieu/hong token tra dung 401.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
